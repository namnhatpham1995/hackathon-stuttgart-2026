// Stops the ux-review target of this worktree from outside it: `serve`, and the server it started.
// A `serve` running in the background cannot always be stopped from where it was started, and
// killing only its shell leaves the server holding the port. Then searches every audit folder and
// the logs for the run's password (verdict in `<run folder>/secret-check.txt`), deletes the password
// file and the pointer, and drops the throwaway database.
//
// A recorded pid is stopped only while its command line still is the one `serve` started, so a pid
// the system has since given to another program is left alone.
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";

import {
  assertThrowaway,
  checkoutDirs,
  clearRunPointer,
  dropThrowawayDatabase,
  killProcessTree,
  listProcesses,
  PASSWORD_FILE,
  readRunPointer,
  TARGET_FILE,
  throwawayDatabaseUrl,
} from "./run-folder.mjs";
import { writeRunSecretVerdict } from "./secret-check.mjs";

try {
  process.loadEnvFile();
} catch {
  // No .env: rely on the environment.
}

try {
  const { gitDir } = checkoutDirs();
  const folder = readRunPointer(gitDir);
  if (folder === null) {
    console.log("ux-review:stop: no ux-review run is active in this worktree");
    process.exit(0);
  }
  let target = {};
  try {
    target = JSON.parse(readFileSync(path.join(folder, TARGET_FILE), "utf8"));
  } catch (error) {
    // `serve` rewrites the file as it goes: leave the run as it is, so stop can be tried again.
    throw new Error(`cannot read ${TARGET_FILE} in ${folder} (try again): ${error.message}`);
  }

  const candidates = [
    { label: "serve", pid: target.pid, matches: /ux-review[\\/]+serve\.mjs/ },
    {
      label: "server",
      pid: target.server?.pid,
      matches: /next[\\/]+dist[\\/]+bin[\\/]+next"?\s+start/,
    },
  ];
  const live = listProcesses();
  const stopped = [];
  for (const { label, pid, matches } of candidates) {
    if (!Number.isInteger(pid) || !matches.test(live.get(pid) ?? "")) continue;
    killProcessTree(pid);
    stopped.push(label);
  }
  console.log(
    `ux-review:stop: ${stopped.length > 0 ? `stopped ${stopped.join(" and ")}` : "nothing was still running"} (run ${folder})`,
  );

  if (existsSync(path.join(folder, PASSWORD_FILE))) {
    const { status } = writeRunSecretVerdict(folder);
    console.log(`ux-review:stop: password search ${status}; verdict in ${folder}/secret-check.txt`);
    rmSync(path.join(folder, PASSWORD_FILE), { force: true });
  }

  // The name is derived again from .env and must be the one the run recorded.
  const database = throwawayDatabaseUrl(process.env.DATABASE_URL ?? "");
  if (target.databaseName !== undefined) {
    assertThrowaway(target.databaseName);
    if (target.databaseName !== database.name) {
      throw new Error(`the run used ${target.databaseName}, but .env now gives ${database.name}`);
    }
  }
  await dropThrowawayDatabase(database.url);
  console.log(`ux-review:stop: dropped ${database.name}`);
  clearRunPointer(gitDir);
} catch (error) {
  console.error(`ux-review:stop: ${error.message}`);
  process.exitCode = 1;
}
