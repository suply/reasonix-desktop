// ============================================================
// Reasonix Desktop — Init Script
// Downloads bundled Node.js and ensures reasonix CLI is ready.
//
// Run: node scripts/init.mjs
// After: npm run build (to produce dist/), then electron-builder
// ============================================================

import { chmodSync, createWriteStream, existsSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import https from "node:https";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const NODE_VERSION = "22.13.0";
const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(here, "..");
const nodeDir = join(projectRoot, "resources", "node");

const PLAT = process.platform;
const ARCH_RAW = process.arch;
const HOST_ARCH = ARCH_RAW === "arm64" ? "arm64" : ARCH_RAW === "x64" ? "x64" : null;

if (!HOST_ARCH || !["win32", "darwin", "linux"].includes(PLAT)) {
  console.error(`Unsupported host: ${PLAT}/${ARCH_RAW}. Supported: win32 / darwin / linux × x64 / arm64.`);
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────────

function follow(url, dest, redirects = 5) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      const status = res.statusCode ?? 0;
      if ((status === 301 || status === 302 || status === 307 || status === 308) && res.headers.location && redirects > 0) {
        res.resume();
        follow(new URL(res.headers.location, url).toString(), dest, redirects - 1).then(resolve, reject);
        return;
      }
      if (status !== 200) {
        reject(new Error(`HTTP ${status} fetching ${url}`));
        return;
      }
      const file = createWriteStream(dest);
      const total = Number.parseInt(res.headers["content-length"] ?? "0", 10);
      let got = 0;
      let last = 0;
      res.on("data", (chunk) => {
        got += chunk.length;
        if (total && Date.now() - last > 250) {
          process.stdout.write(`\r  ${(got / 1024 / 1024).toFixed(1)} / ${(total / 1024 / 1024).toFixed(1)} MB`);
          last = Date.now();
        }
      });
      res.pipe(file);
      file.on("finish", () => file.close((err) => (err ? reject(err) : resolve())));
      file.on("error", reject);
    });
    req.on("error", reject);
  });
}

// ─── Step 1: Bundle Node.js ─────────────────────────────────

const isWin = PLAT === "win32";
const targetExe = join(nodeDir, isWin ? "node.exe" : "node");
const triple = isWin ? `win-${HOST_ARCH}` : PLAT === "darwin" ? `darwin-${HOST_ARCH}` : `linux-${HOST_ARCH}`;
const archiveExt = isWin ? "zip" : PLAT === "darwin" ? "tar.gz" : "tar.xz";
const archiveBase = `node-v${NODE_VERSION}-${triple}`;
const archiveFile = `${archiveBase}.${archiveExt}`;
const url = `https://nodejs.org/dist/v${NODE_VERSION}/${archiveFile}`;
const archivePath = join(nodeDir, archiveFile);
const extractDir = join(nodeDir, "_extract");

async function downloadNode() {
  // Skip if already present and > 1 MB
  if (existsSync(targetExe) && statSync(targetExe).size > 1024 * 1024) {
    const mb = (statSync(targetExe).size / 1024 / 1024).toFixed(1);
    console.log(`[node] ${targetExe} already present (${mb} MB) — delete to refetch`);
    return;
  }

  mkdirSync(nodeDir, { recursive: true });

  console.log(`[node] Downloading Node ${NODE_VERSION} (${triple}) ...`);
  console.log(`       ${url}`);
  await follow(url, archivePath);
  process.stdout.write("\n");

  rmSync(extractDir, { recursive: true, force: true });
  mkdirSync(extractDir, { recursive: true });

  console.log(`[node] Extracting ...`);
  if (isWin) {
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -Force -Path '${archivePath}' -DestinationPath '${extractDir}'"`,
      { stdio: "inherit" },
    );
  } else {
    execSync(`tar -xf "${archivePath}" -C "${extractDir}"`, { stdio: "inherit" });
  }

  let exeSrc = isWin
    ? join(extractDir, archiveBase, "node.exe")
    : join(extractDir, archiveBase, "bin", "node");

  if (!existsSync(exeSrc)) {
    // Try alternate path for some platforms
    exeSrc = isWin
      ? join(extractDir, archiveBase, "node.exe")
      : join(extractDir, archiveBase, "bin", "node");
    if (!existsSync(exeSrc)) {
      console.error(`[node] Extracted binary not found at expected path`);
      process.exit(1);
    }
  }

  if (existsSync(targetExe)) rmSync(targetExe);
  renameSync(exeSrc, targetExe);
  if (!isWin) {
    try {
      chmodSync(targetExe, 0o755);
    } catch {
      /* ignore */
    }
  }

  rmSync(archivePath);
  rmSync(extractDir, { recursive: true, force: true });

  const mb = (statSync(targetExe).size / 1024 / 1024).toFixed(1);
  console.log(`[node] Done: ${targetExe} (${mb} MB)`);
}

// ─── Step 2: Ensure reasonix is installed ────────────────────

function ensureReasonix() {
  try {
    const pkgPath = join(projectRoot, "node_modules", "reasonix", "package.json");
    if (existsSync(pkgPath)) {
      const { version } = JSON.parse(require("fs").readFileSync(pkgPath, "utf-8"));
      console.log(`[reasonix] v${version} already installed in node_modules`);
      return;
    }
  } catch {
    // fall through
  }

  console.log(`[reasonix] Installing reasonix ...`);
  execSync("npm install reasonix", { cwd: projectRoot, stdio: "inherit" });
  console.log(`[reasonix] Done`);
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  Reasonix Desktop — Init");
  console.log(`  Platform: ${PLAT} ${HOST_ARCH}`);
  console.log("═══════════════════════════════════════════\n");

  await downloadNode();
  console.log();
  ensureReasonix();
  console.log("\nDone. Ready for electron-builder.");
}

main().catch((err) => {
  console.error("Init failed:", err);
  process.exit(1);
});
