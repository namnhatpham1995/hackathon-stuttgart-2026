// Looks for the run's password in what an audit leaves behind: the audit folder and the target's
// logs. The password is generated for each run and kept in the run folder; the auditor types it into
// the sign-in form and must never echo it, so a copy in a report, a capture or a log is a slip.
//
// `pnpm ux-review:secret-check <audit folder>` (the audit folder is `<run folder>/audit/<scope>`)
// prints "found in <file>" for each file that holds the password, never the value, and exits 1; it
// exits 2 when it cannot read the password or a folder it has to search, because a check that cannot
// look must not pass; it exits 0 only when every file was searched and none holds it. Stopping the
// target runs the same search over every audit folder and writes the verdict to
// `<run folder>/secret-check.txt` before the password file is deleted.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PASSWORD_FILE, TARGET_FILE } from "./run-folder.mjs";

const modulePath = fileURLToPath(import.meta.url);
export const SECRET_CHECK_FILE = "secret-check.txt";
const AUDIT_ROOT = "audit";

function filesUnder(root) {
  const files = [];
  const pending = [root];
  while (pending.length > 0) {
    const folder = pending.pop();
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const full = path.join(folder, entry.name);
      if (entry.isDirectory()) pending.push(full);
      else if (entry.isFile()) files.push(full);
    }
  }
  return files.sort();
}

function shown(runFolder, file) {
  const relative = path.relative(runFolder, file);
  const outside = relative.startsWith("..") || path.isAbsolute(relative);
  return (outside ? file : relative).split(path.sep).join("/");
}

function cannotCheck(reason) {
  return { status: "cannot-check", reason, files: [], searched: 0 };
}

/** Searches every file under `roots` for the run's password. `status` is `found` (`files` names
 * them), `clean`, or `cannot-check` (`reason` says why). The result never holds the password. It is
 * base64url, so a JSON-escaped or URL-encoded copy is the same bytes; each file is searched as UTF-8
 * and as UTF-16 of either byte order, because Windows PowerShell writes redirected output as UTF-16. */
export function findSecret(runFolder, roots) {
  let password = "";
  try {
    password = readFileSync(path.join(runFolder, PASSWORD_FILE), "utf8").trim();
  } catch {
    // reported below
  }
  if (password === "") return cannotCheck("password file missing");
  const needles = [
    Buffer.from(password),
    Buffer.from(password, "utf16le"),
    Buffer.from(password, "utf16le").swap16(),
  ];
  const found = [];
  const unreadable = [];
  let searched = 0;
  for (const root of roots) {
    if (!existsSync(root)) return cannotCheck(`${shown(runFolder, root)} missing`);
    for (const file of filesUnder(root)) {
      let content;
      try {
        content = readFileSync(file);
      } catch {
        unreadable.push(shown(runFolder, file));
        continue;
      }
      searched += 1;
      if (needles.some((needle) => content.includes(needle))) found.push(shown(runFolder, file));
    }
  }
  if (found.length > 0) return { status: "found", files: found, searched };
  if (unreadable.length > 0) return cannotCheck(`cannot read ${unreadable.join(", ")}`);
  return { status: "clean", files: [], searched };
}

/** The logs folder `target.json` names; `<run folder>/logs` when it names none. `null` when the file
 * cannot be read and `strict` is set. */
function logsFolder(runFolder, strict) {
  try {
    const { logsDir } = JSON.parse(readFileSync(path.join(runFolder, TARGET_FILE), "utf8"));
    if (typeof logsDir === "string" && logsDir !== "") return logsDir;
  } catch {
    if (strict) return null;
  }
  return path.join(runFolder, "logs");
}

/** The check of one audit: its folder (`<run folder>/audit/<scope>`) and the target's logs. */
export function auditSecretCheck(auditFolder) {
  const audit = path.resolve(auditFolder);
  if (path.basename(path.dirname(audit)) !== AUDIT_ROOT) {
    return cannotCheck(`${auditFolder} is not <run folder>/${AUDIT_ROOT}/<scope>`);
  }
  const runFolder = path.dirname(path.dirname(audit));
  const logs = logsFolder(runFolder, true);
  if (logs === null) return cannotCheck(`${TARGET_FILE} unreadable`);
  return findSecret(runFolder, [audit, logs]);
}

/** The check made when the target stops: every audit folder of the run and the logs. */
export function runSecretCheck(runFolder) {
  const audits = path.join(runFolder, AUDIT_ROOT);
  return findSecret(runFolder, [
    ...(existsSync(audits) ? [audits] : []),
    logsFolder(runFolder, false),
  ]);
}

/** The lines that say what a check found, without ever naming the password. */
export function formatVerdict(result) {
  if (result.status === "found") return result.files.map((file) => `found in ${file}`);
  if (result.status === "clean")
    return [`clean: the password is in none of ${result.searched} files`];
  return [`cannot check: ${result.reason}`];
}

/** Runs the stop-time check and writes its verdict to `<run folder>/secret-check.txt`. Never throws.
 * A second stop that finds the password already deleted keeps the verdict the first one wrote
 * (`serve` and `ux-review:stop` can both run). */
export function writeRunSecretVerdict(runFolder) {
  const verdictFile = path.join(runFolder, SECRET_CHECK_FILE);
  let result;
  try {
    result = runSecretCheck(runFolder);
    if (
      result.status === "cannot-check" &&
      result.reason === "password file missing" &&
      existsSync(verdictFile)
    ) {
      return { status: "kept", files: [], searched: 0 };
    }
  } catch (error) {
    result = cannotCheck(error.message);
  }
  try {
    writeFileSync(verdictFile, `${formatVerdict(result).join("\n")}\n`);
  } catch {
    // the run folder is gone or read-only: there is nothing to keep
  }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) {
  const auditFolder = process.argv[2];
  if (!auditFolder) {
    console.error("usage: pnpm ux-review:secret-check <audit folder>");
    process.exit(2);
  }
  let result;
  try {
    result = auditSecretCheck(auditFolder);
  } catch (error) {
    result = cannotCheck(error.message);
  }
  const lines = formatVerdict(result).map((line) => `ux-review:secret-check: ${line}`);
  if (result.status === "clean") {
    console.log(lines.join("\n"));
  } else {
    console.error(lines.join("\n"));
    process.exit(result.status === "found" ? 1 : 2);
  }
}
