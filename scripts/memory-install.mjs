// Seeds Claude Code's per-project memory with the workflow memories in ./memory. Claude Code keeps
// memory outside the repo, in ~/.claude/projects/<project-key>/memory/, where <project-key> is this
// checkout's absolute path with every non-alphanumeric character replaced by "-".
// Never overwrites a memory that already exists there; MEMORY.md gets the missing index lines only.
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const source = path.resolve("memory");
const projectKey = process.cwd().replace(/[^a-zA-Z0-9]/g, "-");
const target = path.join(homedir(), ".claude", "projects", projectKey, "memory");
mkdirSync(target, { recursive: true });

let copied = 0;
for (const file of readdirSync(source)) {
  if (!file.endsWith(".md") || file === "MEMORY.md" || file === "README.md") continue;
  const destination = path.join(target, file);
  if (existsSync(destination)) continue;
  copyFileSync(path.join(source, file), destination);
  copied++;
}

const indexPath = path.join(target, "MEMORY.md");
const existing = existsSync(indexPath) ? readFileSync(indexPath, "utf8") : "";
const missing = readFileSync(path.join(source, "MEMORY.md"), "utf8")
  .split("\n")
  .filter(
    (line) =>
      line.startsWith("- [") && !existing.includes(line.match(/\]\(([^)]+)\)/)?.[1] ?? line),
  );
if (missing.length > 0) {
  writeFileSync(indexPath, `${existing.trimEnd()}${existing ? "\n" : ""}${missing.join("\n")}\n`);
}

console.log(`Memory: ${copied} file(s) copied, ${missing.length} index line(s) added -> ${target}`);
