// ============================================================
// Reasonix Desktop — Preload / Context Bridge
// Ported from Tauri `@tauri-apps/api` calls to Electron IPC
// ============================================================

import { contextBridge, ipcRenderer } from "electron";

// ─── API definition ──────────────────────────────────────────

const api = {
  // ── RPC ──
  rpc: {
    spawn: (): Promise<void> => ipcRenderer.invoke("rpc:spawn"),
    send: (line: string): Promise<void> => ipcRenderer.invoke("rpc:send", line),
    kill: (): Promise<void> => ipcRenderer.invoke("rpc:kill"),

    /** Subscribe to events from the CLI's stdout */
    onEvent: (cb: (data: { data: string }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { data: string }) => cb(data);
      ipcRenderer.on("rpc:event", handler);
      return () => ipcRenderer.removeListener("rpc:event", handler);
    },

    /** Subscribe to stderr from the CLI */
    onStderr: (cb: (data: { data: string }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { data: string }) => cb(data);
      ipcRenderer.on("rpc:stderr", handler);
      return () => ipcRenderer.removeListener("rpc:stderr", handler);
    },

    /** Subscribe to exit events from the CLI */
    onExit: (cb: (data: { code: number | null }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { code: number | null }) => cb(data);
      ipcRenderer.on("rpc:exit", handler);
      return () => ipcRenderer.removeListener("rpc:exit", handler);
    },
  },

  // ── Commands ──
  commands: {
    listWorkspaceTree: (root: string, maxDepth: number) =>
      ipcRenderer.invoke("commands:listWorkspaceTree", root, maxDepth),
    gitStatus: (root: string) =>
      ipcRenderer.invoke("commands:gitStatus", root),
    openInEditor: (command: string, path: string, line?: number) =>
      ipcRenderer.invoke("commands:openInEditor", command, path, line),
    writeTextFile: (path: string, content: string) =>
      ipcRenderer.invoke("commands:writeTextFile", path, content),
  },

  // ── Dialog ──
  dialog: {
    open: (options?: unknown) =>
      ipcRenderer.invoke("dialog:open", options),
    save: (options?: unknown) =>
      ipcRenderer.invoke("dialog:save", options),
  },

  // ── App ──
  app: {
    getVersion: () => ipcRenderer.invoke("app:getVersion"),
    relaunch: () => ipcRenderer.invoke("app:relaunch"),
    getPath: (name: string) => ipcRenderer.invoke("app:getPath", name),
  },

  // ── Shell ──
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke("shell:openExternal", url),
  },
};

// ── Expose ──

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld("api", api);
} else {
  // @ts-expect-error — non-context-isolated fallback
  window.api = api;
}
