// ============================================================
// Reasonix Desktop — Main Process Entry
// Ported from desktop/src-tauri/src/main.rs
// ============================================================

import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  dialog,
  screen,
} from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";

import {
  listWorkspaceTree,
  gitStatus,
  openInEditor,
  writeTextFile,
} from "./commands";
import { spawnRpc, sendRpc, killRpc } from "./rpc";


// ─── Window state ────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;

// ─── Window creation ─────────────────────────────────────────

function createWindow(): BrowserWindow {
  // macOS: transparent background for custom titlebar
  const isMac = process.platform === "darwin";
  const winOptions: Electron.BrowserWindowConstructorOptions = {
    width: 1024,
    height: 720,
    minWidth: 480,
    minHeight: 320,
    show: false,
    center: true,
    resizable: true,
    frame: true,
    // autoHideMenuBar: true,
    ...(isMac ? { transparent: true, backgroundColor: "#00000000" } : { backgroundColor: "#0b0b0b" }),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
    },
  };

  // Linux: set icon
  if (process.platform === "linux") {
    try {
      winOptions.icon = join(__dirname, "../../resources/icon.png");
    } catch {
      // icon not found — skip
    }
  }

  const win = new BrowserWindow(winOptions);

  // ═══════════════════════════════════════════════════════════
  // TODO — CSP (Content-Security-Policy)
  // Tauri original ships a strict CSP via tauri.conf.json.
  // Electron doesn't enforce CSP by default. When renderer
  // UI is in place, add via session.webRequest.onHeadersReceived
  // or a <meta> tag in the HTML:
  //   default-src 'self'; img-src 'self' data: asset:;
  //   style-src 'self' 'unsafe-inline'; script-src 'self'
  // ═══════════════════════════════════════════════════════════

  // HiDPI clamp: if configured size overflows the screen, clamp to 90%
  const clampToScreen = () => {
    try {
      const currentDisplay = screen.getDisplayNearestPoint(
        win.getBounds()
      );
      const { width: availW, height: availH } = currentDisplay.workAreaSize;
      const wantW = Math.min(1024, availW * 0.9);
      const wantH = Math.min(720, availH * 0.9);
      if (wantW < 1024 || wantH < 720) {
        win.setSize(Math.round(wantW), Math.round(wantH));
        win.center();
      }
    } catch {
      // ignore
    }
  };

  win.on("ready-to-show", () => {
    clampToScreen();
    win.show();
  });

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // Block F5 / Ctrl+R in production (prevents WebView reload that loses state)
  if (!is.dev) {
    win.webContents.on("before-input-event", (_e, input) => {
      if (
        input.key === "F5" ||
        ((input.control || input.meta) &&
          (input.key.toLowerCase() === "r"))
      ) {
        _e.preventDefault();
      }
    });
  }

  // DevTools via env var
  if (process.env.REASONIX_DEVTOOLS) {
    win.webContents.openDevTools();
  }

  // Load renderer
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }

  mainWindow = win;
  return win;
}

// ─── IPC Handlers ────────────────────────────────────────────

function registerIpcHandlers(): void {
  // ── RPC ──

  ipcMain.handle("rpc:spawn", () => {
    spawnRpc(
      (event, data) => {
        // Forward events to renderer
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(event, data);
        }
      },
      (code) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("rpc:exit", { code });
        }
      },
    );
  });

  ipcMain.handle("rpc:send", (_event, line: string) => {
    sendRpc(line);
  });

  ipcMain.handle("rpc:kill", () => {
    killRpc();
  });

  // ── Commands ──

  ipcMain.handle(
    "commands:listWorkspaceTree",
    (_event, root: string, maxDepth: number) => {
      return listWorkspaceTree(root, maxDepth);
    },
  );

  ipcMain.handle(
    "commands:gitStatus",
    (_event, root: string) => {
      return gitStatus(root);
    },
  );

  ipcMain.handle(
    "commands:openInEditor",
    (_event, command: string, filePath: string, line?: number) => {
      openInEditor(command, filePath, line);
    },
  );

  ipcMain.handle(
    "commands:writeTextFile",
    (_event, path: string, content: string) => {
      writeTextFile(path, content);
    },
  );

  // ── Dialog ──

  ipcMain.handle("dialog:open", async (_event, options: Electron.OpenDialogOptions = {}) => {
    if (!mainWindow) return { canceled: true, filePaths: [] };
    return dialog.showOpenDialog(mainWindow, options);
  });

  ipcMain.handle("dialog:save", async (_event, options: Electron.SaveDialogOptions = {}) => {
    if (!mainWindow) return { canceled: true, filePath: "" };
    return dialog.showSaveDialog(mainWindow, options);
  });

  // ── App ──

  ipcMain.handle("app:getVersion", () => {
    return app.getVersion();
  });

  ipcMain.handle("app:relaunch", () => {
    app.relaunch();
    app.exit(0);
  });

  ipcMain.handle("app:getPath", (_event, name: Parameters<typeof app.getPath>[0]) => {
    return app.getPath(name);
  });

  // ── Shell ──

  ipcMain.handle(
    "shell:openExternal",
    async (_event, url: string) => {
      return shell.openExternal(url);
    },
  );
}

// ─── App lifecycle ───────────────────────────────────────────

app.whenReady().then(() => {
  // Set app user model id for Windows
  electronApp.setAppUserModelId("dev.reasonix.desktop");

  // Default open/close DevTools by F12 in dev,
  // ignore Cmd/Ctrl+R in production
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      // On macOS, re-show the existing window
      const win = BrowserWindow.getAllWindows()[0];
      if (win) win.show();
    }
  });
});

// Quit when all windows are closed (except macOS)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Kill RPC child on app quit
app.on("before-quit", () => {
  killRpc();
});
