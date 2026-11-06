// Where an audit run keeps its files, how a second command finds the run of this worktree, and the
// throwaway database it runs on.
//
// A run folder is `<common git dir>/agent-runs/ux-review/<run id>/`, outside the repository and
// shared by every worktree. `pnpm ux-review:serve` fills it (`target.json`, the per-run password, the
// server logs) and writes its path to `ux-review-run` in the worktree's own git directory, so a
// command in worktree A never finds the run of worktree B.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import postgres from "postgres";

export const RUN_ROOT = ["agent-runs", "ux-review"];
export const RUN_POINTER_FILE = "ux-review-run";
export const TARGET_FILE = "target.json";
export const PASSWORD_FILE = "password";

/** The root of the working tree, its private git directory and the common git directory shared by
 * every worktree, and a function that runs one git command there. */
export function checkoutDirs(cwd = process.cwd()) {
  const git = (...args) =>
    execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  return {
    worktreeRoot: path.resolve(git("rev-parse", "--show-toplevel")),
    gitDir: path.resolve(cwd, git("rev-parse", "--path-format=absolute", "--git-dir")),
    commonDir: path.resolve(cwd, git("rev-parse", "--path-format=absolute", "--git-common-dir")),
    git,
  };
}

/** `20261102T214500Z-wt2`: sortable, and says which worktree slot the run belongs to. */
export function runId(slot, now = new Date()) {
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z");
  return `${stamp}-${slot === 0 ? "main" : `wt${slot}`}`;
}

export function createRunFolder(commonDir, id) {
  const folder = path.join(commonDir, ...RUN_ROOT, id);
  mkdirSync(path.join(folder, "logs"), { recursive: true });
  return folder;
}

export function writeRunPointer(gitDir, runFolder) {
  writeFileSync(path.join(gitDir, RUN_POINTER_FILE), `${runFolder}\n`);
}

export function clearRunPointer(gitDir) {
  rmSync(path.join(gitDir, RUN_POINTER_FILE), { force: true });
}

/** The run folder of the run now active in the worktree whose git directory is `gitDir`, or `null`. */
export function readRunPointer(gitDir) {
  try {
    return readFileSync(path.join(gitDir, RUN_POINTER_FILE), "utf8").trim() || null;
  } catch {
    return null;
  }
}

/** Only a name of this shape is ever created or dropped: `hackathon_ux` for the main checkout,
 * `hackathon_wt<N>_ux` for worktree slot N. A bug that derives a dev or test name must not reach
 * `drop database`. */
const THROWAWAY_DATABASE = /^[a-z][a-z0-9]*(?:_wt\d+)?_ux$/;

/** The throwaway database URL of a run: the dev database's name from `DATABASE_URL` plus `_ux`. */
export function throwawayDatabaseUrl(databaseUrl) {
  const url = new URL(databaseUrl);
  const devName = decodeURIComponent(url.pathname.slice(1));
  url.pathname = `/${devName}_ux`;
  const name = `${devName}_ux`;
  assertThrowaway(name);
  return { url: url.toString(), name };
}

export function assertThrowaway(name) {
  if (!THROWAWAY_DATABASE.test(name)) {
    throw new Error(`"${name}" is not a ux-review throwaway database name; refusing to touch it`);
  }
}

/** Drops the run's throwaway database, closing whatever is still connected to it. */
export async function dropThrowawayDatabase(databaseUrl) {
  const url = new URL(databaseUrl);
  const name = decodeURIComponent(url.pathname.slice(1));
  assertThrowaway(name);
  url.pathname = "/postgres";
  const admin = postgres(url.toString(), { max: 1, onnotice: () => {} });
  try {
    await admin`drop database if exists ${admin(name)} with (force)`;
  } finally {
    await admin.end();
  }
}

/** The command line of every running process by pid. Throws when the system cannot say. */
export function listProcesses() {
  const [command, args, format] =
    process.platform === "win32"
      ? [
          "powershell",
          [
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "Get-CimInstance Win32_Process | ForEach-Object { '{0} {1}' -f $_.ProcessId, $_.CommandLine }",
          ],
          /^(\d+) ?(.*)$/,
        ]
      : ["ps", ["-e", "-o", "pid=,args="], /^\s*(\d+)\s*(.*)$/];
  const listing = execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    maxBuffer: 32 * 1024 * 1024,
    timeout: 60_000,
  });
  const processes = new Map();
  for (const row of listing.split(/\r?\n/)) {
    const match = format.exec(row);
    if (match) processes.set(Number(match[1]), match[2]);
  }
  return processes;
}

/** Stops `pid` and everything it started. */
export function killProcessTree(pid) {
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // already gone
  }
}
