// Runs `next <command>` with .env loaded first, so PORT from .env picks the port: Next binds the
// port before it reads .env itself, and each worktree has its own PORT.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

try {
  process.loadEnvFile();
} catch {
  // No .env: use the environment as it is (production hosts set their own variables).
}

const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, ...process.argv.slice(2)], { stdio: "inherit" });
child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
