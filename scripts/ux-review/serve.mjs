// Starts the ux-review audit target: a production build of this worktree (`next build`, skipped when
// the build is current, then `next start`, never `next dev`) on a port of its own (3005 + 10N for
// worktree slot N), over a throwaway database (`<dev database>_ux`) that is dropped, recreated,
// migrated and seeded with the personas at every start. It runs until stopped.
//
// A new password is generated for every run, written to `<run folder>/password` and given to the
// seed step through its environment only. Third-party sign-in keys are blanked, so no button of a
// real provider works, and the app sends no mail. Stop it with Ctrl+C, or from another shell with
// `pnpm ux-review:stop`; either way the stop searches the audit folders and the logs for the
// password, writes the verdict to `<run folder>/secret-check.txt`, deletes the password file and
// drops the database.
//
// While it runs, run no push, `pnpm verify` or test command from this worktree.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { closeSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";

import { assertTarget } from "./assert-target.mjs";
import {
  checkoutDirs,
  clearRunPointer,
  createRunFolder,
  dropThrowawayDatabase,
  killProcessTree,
  PASSWORD_FILE,
  runId,
  TARGET_FILE,
  throwawayDatabaseUrl,
  writeRunPointer,
} from "./run-folder.mjs";
import { writeRunSecretVerdict } from "./secret-check.mjs";

/** The accounts `serve` creates, as `.claude/skills/ux-review/references/personas.md` names them.
 * The first-time user registers itself during the audit; the starter has no roles, so no admin. */
const PERSONAS = [
  {
    role: "returning",
    name: "Rosa Returning",
    address: "ux-returning@example.com",
    note: "returning user: signs in, signs out, every page behind sign-in (the starter has no data of its own yet)",
  },
];

/** Where the build this run may reuse is recorded: the commit and the `.next/BUILD_ID` it made. */
const BUILD_MARKER_FILE = "ux-review-build.json";

try {
  process.loadEnvFile();
} catch {
  // No .env: rely on the environment.
}

const { gitDir, commonDir, worktreeRoot, git } = checkoutDirs();
const require = createRequire(path.join(worktreeRoot, "package.json"));
const nextBin = require.resolve("next/dist/bin/next");
const tsxCli = require.resolve("tsx/cli");
const slot = Number(process.env.WORKTREE_SLOT ?? 0);
const port = 3005 + 10 * slot;
const webOrigin = `http://localhost:${port}`;
let server;
let runFolder;
let ownsPointer = false;
let stopping = false;

/** What can be done without waiting: stop the server, write the password verdict (the logs are
 * final once the server is gone), delete the password and the pointer. */
function stopNow() {
  if (stopping) return;
  stopping = true;
  if (server?.pid !== undefined && server.exitCode === null) killProcessTree(server.pid);
  if (ownsPointer) clearRunPointer(gitDir);
  if (runFolder) {
    const { status } = writeRunSecretVerdict(runFolder);
    console.log(
      `ux-review:serve: password search ${status}; verdict in ${runFolder}/secret-check.txt`,
    );
    rmSync(path.join(runFolder, PASSWORD_FILE), { force: true });
  }
}

async function stop(code) {
  stopNow();
  if (database && ownsPointer) {
    try {
      await dropThrowawayDatabase(database.url);
      console.log(`ux-review:serve: dropped ${database.name}`);
    } catch (error) {
      console.error(`ux-review:serve: could not drop ${database.name}: ${error.message}`);
    }
  }
  process.exit(code);
}

async function fail(message) {
  console.error(`ux-review:serve: ${message}`);
  await stop(1);
}

// A hard exit cannot wait for the database: `pnpm ux-review:stop` or the next start drops it.
process.once("exit", stopNow);
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) {
  process.once(signal, () => {
    console.log("\nux-review:serve: stopping");
    void stop(0);
  });
}

function portBusy() {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "localhost", port });
    socket.setTimeout(2000, () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

function tail(file, lines = 40) {
  try {
    return readFileSync(file, "utf8").split("\n").slice(-lines).join("\n");
  } catch {
    return "";
  }
}

/** Runs `node <args>` in the worktree with its output in `logs/<label>.log`; resolves on exit 0. */
function run(label, args, env) {
  const logFile = path.join(runFolder, "logs", `${label}.log`);
  const log = openSync(logFile, "a");
  const child = spawn(process.execPath, args, {
    cwd: worktreeRoot,
    env,
    stdio: ["ignore", log, log],
  });
  closeSync(log);
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${label} failed (${code}):\n${tail(logFile)}`)),
    );
  });
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function readBuildId() {
  try {
    return readFileSync(path.join(worktreeRoot, ".next", "BUILD_ID"), "utf8").trim();
  } catch {
    return null;
  }
}

let database;
try {
  assertTarget(webOrigin);
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (run `pnpm dev:setup`)");
  database = throwawayDatabaseUrl(process.env.DATABASE_URL);
} catch (error) {
  await fail(error.message);
}
if (await portBusy()) {
  // Leave the pointer and the database alone: they may belong to the run that holds the port.
  console.error(
    `ux-review:serve: port ${port} is already in use; another ux-review run of this worktree is probably up. Stop it first (pnpm ux-review:stop).`,
  );
  process.exit(1);
}

const id = runId(slot);
runFolder = createRunFolder(commonDir, id);
const password = randomBytes(18).toString("base64url");
writeFileSync(path.join(runFolder, PASSWORD_FILE), `${password}\n`, { mode: 0o600 });

const target = {
  runId: id,
  slot,
  pid: process.pid,
  startedAt: new Date().toISOString(),
  worktreeRoot,
  webOrigin,
  databaseName: database.name,
  passwordFile: path.join(runFolder, PASSWORD_FILE),
  logsDir: path.join(runFolder, "logs"),
  ready: false,
  server: null,
  personas: [],
};
const saveTarget = () =>
  writeFileSync(path.join(runFolder, TARGET_FILE), `${JSON.stringify(target, null, 2)}\n`);
saveTarget();
writeRunPointer(gitDir, runFolder);
ownsPointer = true;

// Set, not deleted: a deleted key would be filled back in from .env by Next. Blank counts as unset.
const env = {
  ...process.env,
  DATABASE_URL: database.url,
  BETTER_AUTH_URL: webOrigin,
  BETTER_AUTH_SECRET: randomBytes(32).toString("base64url"),
  PORT: String(port),
  GOOGLE_CLIENT_ID: "",
  GOOGLE_CLIENT_SECRET: "",
  GITHUB_CLIENT_ID: "",
  GITHUB_CLIENT_SECRET: "",
  SEED_USER_EMAIL: "",
  SEED_USER_PASSWORD: "",
};

try {
  await run("seed", [tsxCli, "scripts/ux-review/seed-personas.ts"], {
    ...env,
    UX_REVIEW_PASSWORD: password,
    UX_REVIEW_PERSONAS: JSON.stringify(PERSONAS),
  });

  // Reuse the production build only when it was made from exactly what the worktree holds now.
  const markerFile = path.join(gitDir, BUILD_MARKER_FILE);
  const head = git("rev-parse", "HEAD");
  const clean = git("status", "--porcelain") === "";
  const marker = readJson(markerFile);
  const reuse = clean && marker?.head === head && marker?.buildId === readBuildId();
  if (reuse) {
    console.log("ux-review:serve: reusing the current production build");
  } else {
    rmSync(markerFile, { force: true });
    console.log("ux-review:serve: building (next build)");
    await run("build", [nextBin, "build"], env);
    if (clean) writeFileSync(markerFile, JSON.stringify({ head, buildId: readBuildId() }));
  }
  target.buildReused = reuse;

  const logFile = path.join(runFolder, "logs", "server.log");
  const log = openSync(logFile, "a");
  server = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
    cwd: worktreeRoot,
    env,
    stdio: ["ignore", log, log],
  });
  closeSync(log);
  target.server = { pid: server.pid };
  saveTarget();
  server.once("exit", (code) => {
    if (!stopping)
      void fail(`the server exited (${code}) while the target was up:\n${tail(logFile)}`);
  });

  const deadline = Date.now() + 120_000;
  for (;;) {
    try {
      const response = await fetch(webOrigin);
      if (response.status < 500) break;
    } catch {
      // not listening yet
    }
    if (Date.now() > deadline)
      throw new Error(`timed out waiting for ${webOrigin}:\n${tail(logFile)}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  target.personas = PERSONAS.map(({ role, address, note }) => ({ role, address, note }));
  target.ready = true;
  saveTarget();
  console.log(`
ux-review target is up (run ${id})
  open      ${webOrigin}
  database  ${database.name} (throwaway, recreated at every start, dropped at stop)
  logs      ${target.logsDir}

Sign in with email and password. The password for this run is in ${target.passwordFile}
${target.personas.map((persona) => `  ${persona.address.padEnd(32)} ${persona.note}`).join("\n")}

Run no push, "pnpm verify" or test command from this worktree while this runs.
Stop with Ctrl+C or "pnpm ux-review:stop".`);
} catch (error) {
  await fail(error.message);
}

// The server keeps the process alive; this makes it explicit.
setInterval(() => {}, 60_000);
