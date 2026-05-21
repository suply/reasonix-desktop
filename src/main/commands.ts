// ============================================================
// Reasonix Desktop — File System Commands
// Ported from desktop/src-tauri/src/main.rs
// ============================================================

import { writeFileSync, readdirSync, statSync } from "node:fs";
import { execSync, spawn } from "node:child_process";
import { join } from "node:path";

// ─── Types ───────────────────────────────────────────────────

export interface FileEntry {
  path: string;
  depth: number;
  kind: "dir" | "file";
  name: string;
}

export interface GitStatusEntry {
  path: string;
  kind: "untracked" | "added" | "deleted" | "modified" | "renamed";
}

// ─── Constants ───────────────────────────────────────────────

// Matches Tauri Rust SKIP_DIRS — "target" is Rust build dir
// (irrelevant for TS project but harmless to keep).
const SKIP_DIRS = new Set(["node_modules", "target", "dist", "build", "out", ".git"]);
const MAX_ENTRIES = 800;

// ─── File Tree ───────────────────────────────────────────────

/**
 * Recursively walk a directory, returning entries with **absolute** paths.
 * Skips hidden files/dirs and well-known noise directories.
 *
 * Mirrors Tauri's `entry.path().to_string_lossy().into_owned()` which
 * returns the full OS path.
 */
export function listWorkspaceTree(root: string, maxDepth: number): FileEntry[] {
  const output: FileEntry[] = [];
  const effectiveDepth = Math.min(Math.max(1, maxDepth), 4);
  walkDir(root, 0, effectiveDepth, output);
  return output;
}

function walkDir(
  currentPath: string,
  depth: number,
  maxDepth: number,
  output: FileEntry[],
): void {
  if (depth > maxDepth || output.length >= MAX_ENTRIES) return;

  let entries: string[];
  try {
    entries = readdirSync(currentPath);
  } catch {
    return;
  }

  // Sort: directories first, then files, both alphabetical
  const items = entries
    .map((name) => {
      const fullPath = join(currentPath, name);
      try {
        const st = statSync(fullPath);
        return { name, fullPath, isDir: st.isDirectory() };
      } catch {
        return null;
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  items.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  for (const item of items) {
    if (output.length >= MAX_ENTRIES) break;

    // Skip hidden files and noise dirs
    if (item.name.startsWith(".")) continue;
    if (item.isDir && SKIP_DIRS.has(item.name)) continue;

    // Return absolute path (matching Tauri Rust behaviour)
    if (item.isDir) {
      output.push({
        path: item.fullPath,
        depth,
        kind: "dir",
        name: item.name,
      });
      walkDir(item.fullPath, depth + 1, maxDepth, output);
    } else {
      output.push({
        path: item.fullPath,
        depth,
        kind: "file",
        name: item.name,
      });
    }
  }
}

// ─── Git Status ──────────────────────────────────────────────

/**
 * Run `git status --porcelain -z` and parse the output.
 * Returns an empty array if not a git repo or git is unavailable.
 */
export function gitStatus(root: string): GitStatusEntry[] {
  try {
    const output = execSync("git status --porcelain -z", {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10_000,
    });

    const out: GitStatusEntry[] = [];
    const records = output.split("\0").filter(Boolean);
    for (const rec of records) {
      if (rec.length < 4) continue;
      // Format: `XY path` (X = index status, Y = worktree status)
      const x = rec[0]!;
      const y = rec[1]!;
      const path = rec.slice(3);

      let kind: GitStatusEntry["kind"] | null = null;
      if (x === "?" && y === "?") kind = "untracked";
      else if (x === "A" || y === "A") kind = "added";
      else if (x === "D" || y === "D") kind = "deleted";
      else if (x === "M" || y === "M") kind = "modified";
      else if (x === "R" || y === "R") kind = "renamed";

      if (kind && path) {
        out.push({ path, kind });
      }
    }
    return out;
  } catch {
    // Not a git repo, git not installed, or timeout — silent
    return [];
  }
}

// ─── Open in Editor ──────────────────────────────────────────

/**
 * Open a file at a specific line in the configured editor.
 * VS Code / Cursor / Windsurf understand `-g path:line`.
 *
 * [WIN] Spawns through `cmd /c` so `.cmd` shims (code.cmd, cursor.cmd)
 *       resolve via PATHEXT — `child_process.spawn` alone doesn't.
 *       Uses CREATE_NO_WINDOW to suppress the console flash.
 * [POSIX] Would spawn `command` directly (no cmd wrapper needed).
 */
export function openInEditor(
  command: string,
  filePath: string,
  line?: number,
): void {
  const trimmed = command.trim();
  if (!trimmed) throw new Error("editor command is empty");

  const hasLine = line !== undefined && line !== null;

  if (process.platform === "win32") {
    // [WIN] Wrap through cmd.exe for .cmd/.bat resolution
    const child = spawn("cmd.exe", ["/c", trimmed, ...(hasLine ? ["-g", `${filePath}:${line}`] : [filePath])], {
      stdio: "ignore",
      windowsHide: true,
      detached: true,
    });
    child.unref();
  }
  // [POSIX] else-branch removed for Windows-only; add back when porting:
  //   const child = spawn(trimmed, args, { stdio: "ignore", detached: true });
  //   child.unref();
}

// ─── Write Text File ─────────────────────────────────────────

/**
 * Write a string to a file (UTF-8).
 */
export function writeTextFile(path: string, content: string): void {
  writeFileSync(path, content, "utf-8");
}
