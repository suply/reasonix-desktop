// ============================================================
// Reasonix Desktop — RPC Subprocess Management
// Ported from desktop/src-tauri/src/rpc.rs
// ============================================================

import { app } from "electron";
import { spawn, execSync } from "node:child_process";
import { createInterface } from "node:readline";
import { existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { createRequire } from "node:module";

// ═══════════════════════════════════════════════════════════════
// NOTE — Windows-first adaptation
// Code paths tagged [WIN] work on Windows. [POSIX] sites need
// adaptation for Linux/macOS — currently stubs/comments only.
// ═══════════════════════════════════════════════════════════════

// ─── Types ───────────────────────────────────────────────────

interface RpcHandle {
  stdin: NodeJS.WritableStream;
  childPid: number;
}

type EventCallback = (event: string, data: unknown) => void;

// ─── State ───────────────────────────────────────────────────

let rpcHandle: RpcHandle | null = null;
let rpcChild: import("node:child_process").ChildProcess | null = null;
let eventCallback: EventCallback | null = null;
let exitCallback: ((code: number | null) => void) | null = null;

// ─── Node & CLI resolution ────────────────────────────────────

const MIN_NODE_MAJOR = 22;
const REASONIX_PKG = "reasonix";

function checkNodeVersion(nodePath: string): void {
  try {
    const versionOut = execSync(`"${nodePath}" --version`, {
      encoding: "utf8",
      windowsHide: true,
      timeout: 5000,
    });
    const match = versionOut.trim().match(/^v(\d+)\./);
    if (match) {
      const major = Number.parseInt(match[1]!, 10);
      if (major < MIN_NODE_MAJOR) {
        throw new Error(
          `Node v${major} found at ${nodePath}, need >= ${MIN_NODE_MAJOR}. Install Node ${MIN_NODE_MAJOR} from nodejs.org`,
        );
      }
    }
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(`Failed to check Node version at ${nodePath}`);
  }
}

/**
 * Resolve the CLI entry point (program + args to spawn).
 *
 * Resolution order:
 *   1. $REASONIX_CLI env var override
 *   2. Production: bundled node.exe from extraResources
 *   3. Production: bundled node.exe from resources/node/
 *   4. Dev: process.execPath (Electron's Node) + require.resolve(reasonix)
 *
 * Falls back to system PATH Node if bundled not found (dev without npm install).
 */
function resolveCli(): { program: string; args: string[] } {
  // ── 1. Env override ──
  if (process.env.REASONIX_CLI) {
    const parts = process.env.REASONIX_CLI.trim().split(/\s+/);
    return { program: parts[0]!, args: parts.slice(1) };
  }

  // ── 2-3. Bundled Node (production) ──
  // When app.isPackaged, extraResources lands at process.resourcesPath.
  // electron-builder config: extraResources → from:resources/node to:node
  //   → process.resourcesPath/node/node.exe (or node on POSIX)
  if (app.isPackaged) {
    const nodeName = process.platform === "win32" ? "node.exe" : "node";
    const candidatePaths = [
      join(process.resourcesPath, nodeName),             // extraResources to: node (flat)
      join(process.resourcesPath, "node", nodeName),     // extraResources to: node (nested)
    ];
    for (const nodePath of candidatePaths) {
      if (existsSync(nodePath)) {
        checkNodeVersion(nodePath);
        // reasonix is in asarUnpack'd node_modules
        const cliPath = join(process.resourcesPath, "..", "app.asar.unpacked", "node_modules", REASONIX_PKG, "dist", "cli", "index.js");
        if (existsSync(cliPath)) {
          return { program: nodePath, args: [cliPath, "desktop"] };
        }
        // Fallback: try node_modules directly (unpackaged asar)
        const cliPath2 = join(process.resourcesPath, "node_modules", REASONIX_PKG, "dist", "cli", "index.js");
        if (existsSync(cliPath2)) {
          return { program: nodePath, args: [cliPath2, "desktop"] };
        }
      }
    }
  }

  // ── 4. Dev: system Node + npm-installed reasonix ──
  // 注意：不能用 process.execPath（= electron.exe），必须用系统 Node
  // 来 spawn 纯 Node.js 子进程。
  const sysNode = findSystemNode();
  checkNodeVersion(sysNode);
  const cliPath = resolveReasonixCliPath();
  return { program: sysNode, args: [cliPath, "desktop"] };
}

/**
 * Resolve reasonix CLI entry using Node's module resolution.
 * Tries: CWD node_modules → app path → require.resolve
 */
function resolveReasonixCliPath(): string {
  // Try project-relative first
  const cwd = process.cwd();
  const local = join(cwd, "node_modules", REASONIX_PKG, "dist", "cli", "index.js");
  if (existsSync(local)) return local;

  // Try __dirname-relative (running from out/main/)
  const relative = join(__dirname, "..", "..", "node_modules", REASONIX_PKG, "dist", "cli", "index.js");
  if (existsSync(relative)) return relative;

  // module.createRequire for reliable resolution
  const req = createRequire(join(cwd, "noop.js"));
  try {
    return req.resolve(REASONIX_PKG + "/dist/cli/index.js");
  } catch {
    throw new Error(
      `Reasonix not found. Run: npm install ${REASONIX_PKG}`,
    );
  }
}

/**
 * Walk PATH to find a system Node binary (dev fallback).
 * [WIN]  PATH is `;`-separated, binary is `node.exe`.
 *        Skips MS Store stubs (< 100 KB or in windowsapps/).
 *        Falls back to `where node`.
 */
function findSystemNode(): string {
  const pathSep = process.platform === "win32" ? ";" : ":";
  const nodeName = process.platform === "win32" ? "node.exe" : "node";
  const pathEnv = (process.env.PATH ?? "").split(pathSep).filter(Boolean);
  const candidates: string[] = [];

  for (const dir of pathEnv) {
    try {
      const fullPath = join(dir, nodeName);
      if (existsSync(fullPath)) candidates.push(fullPath);
    } catch {
      // skip invalid paths
    }
  }

  // [WIN] `where node` — on POSIX: `which node`
  try {
    const whichCmd = process.platform === "win32" ? "where" : "which";
    const whichOut = execSync(`${whichCmd} ${nodeName}`, { encoding: "utf8", windowsHide: true });
    for (const line of whichOut.split(/\r?\n/).filter(Boolean)) {
      if (!candidates.includes(line.trim())) candidates.push(line.trim());
    }
  } catch {
    // not found
  }

  for (const p of candidates) {
    // [WIN] MS Store shim detection
    if (process.platform === "win32") {
      const lower = p.toLowerCase();
      if (lower.includes("windowsapps")) continue;
    }
    try {
      const { size } = statSync(p);
      if (size > 100_000) return p;
    } catch {
      continue;
    }
  }

  throw new Error(
    `Node >= ${MIN_NODE_MAJOR} not found. Install from nodejs.org and restart.`,
  );
}

// ─── RPC lifecycle ────────────────────────────────────────────

/**
 * Spawn the Reasonix CLI as a child process and wire up RPC.
 * Idempotent: no-ops if already spawned.
 */
export function spawnRpc(
  onEvent: EventCallback,
  onExit: (code: number | null) => void,
): void {
  if (rpcHandle) {
    return;
  }

  eventCallback = onEvent;
  exitCallback = onExit;

  const { program, args } = resolveCli();

  const child = spawn(program, args, {
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
    cwd: findRepoRoot(),
  });

  // [WIN] `child.stdin / stdout / stderr` are always present with stdio:pipe.
  // Defensive checks kept for cross-platform safety.
  if (!child.stdin || !child.stdout || !child.stderr) {
    const errMsg = "rpc child missing stdio — spawn may have failed silently";
    console.error("[reasonix]", errMsg);
    child.kill();
    if (exitCallback) exitCallback(null);
    return;
  }

  rpcChild = child;
  rpcHandle = { stdin: child.stdin, childPid: child.pid ?? 0 };

  // stdout → rpc:event
  const stdoutReader = createInterface({ input: child.stdout });
  stdoutReader.on("line", (line: string) => {
    if (eventCallback) eventCallback("rpc:event", { data: line });
  });

  // stderr → rpc:stderr
  const stderrReader = createInterface({ input: child.stderr });
  stderrReader.on("line", (line: string) => {
    if (eventCallback) eventCallback("rpc:stderr", { data: line });
  });

  // Natural exit watcher
  child.on("exit", (code) => {
    rpcHandle = null;
    rpcChild = null;
    if (exitCallback) exitCallback(code);
  });

  child.on("error", (err) => {
    console.error("[reasonix] rpc child error:", err);
    rpcHandle = null;
    rpcChild = null;
    if (exitCallback) exitCallback(null);
  });
}

/**
 * Send a JSON line to the CLI's stdin.
 */
export function sendRpc(line: string): void {
  if (!rpcHandle) {
    throw new Error("RPC not spawned");
  }
  rpcHandle.stdin.write(line + "\n");
}

/**
 * Gracefully kill the RPC child process.
 * Closes stdin → waits 3s → tree-kill if still alive.
 */
export function killRpc(): void {
  const child = rpcChild;
  if (!child) return;
  rpcHandle = null;
  rpcChild = null;

  // Close stdin to trigger graceful shutdown
  child.stdin?.end();

  // Poll up to 3 seconds for graceful exit, then force-kill
  const deadline = Date.now() + 3000;
  const timer = setInterval(() => {
    if (child.exitCode !== null) {
      clearInterval(timer);
      return;
    }
    if (Date.now() >= deadline) {
      clearInterval(timer);
      killProcessTree(child.pid!);
    }
  }, 50);
}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Walk up from process.cwd() to find the repo root
 * (a directory containing package.json + src/cli).
 *
 * Falls back to cwd if not found.
 */
function findRepoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const pkg = join(dir, "package.json");
    const cliDir = join(dir, "src", "cli");
    if (existsSync(pkg) && existsSync(cliDir)) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

/**
 * Force-kill a process tree by PID.
 *
 * [WIN]  Uses `taskkill /F /T` (tree-kill).
 * [POSIX] Would use `kill -KILL <pid> && pkill -KILL -P <pid>`.
 */
function killProcessTree(pid: number): void {
  if (process.platform === "win32") {
    try {
      execSync(`taskkill /F /T /PID ${pid}`, {
        windowsHide: true,
        stdio: "ignore",
      });
    } catch {
      // already dead
    }
  }
  // [POSIX] else-branch removed for Windows-only; add back when porting:
  //   process.kill(pid, "SIGKILL");
  //   execSync(`pkill -KILL -P ${pid}`, { stdio: "ignore" });
}
