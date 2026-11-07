// Vercel builds the UI only. Migrations run on Railway as the pre-deploy
// command (`pnpm db:migrate`). This script never migrates. Owner steps are
// in docs/deploy.md.
import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env });
  if (result.error) {
    console.error(`vercel-build: failed to start ${command}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.signal) {
    console.error(`vercel-build: ${command} stopped by ${result.signal}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("vercel-build: running next build");
run("pnpm", ["exec", "next", "build"]);
