// One command from a fresh clone to a running app: `pnpm install && pnpm dev:setup && pnpm dev`.
// Safe to run again: it keeps an existing .env and seed user.
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

function run(command) {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: "inherit" });
}

if (!existsSync(".env")) {
  const secret = randomBytes(32).toString("base64url");
  const text = readFileSync(".env.example", "utf8").replace(
    /^BETTER_AUTH_SECRET=.*$/m,
    `BETTER_AUTH_SECRET=${secret}`,
  );
  writeFileSync(".env", text);
  console.log("Created .env with a fresh BETTER_AUTH_SECRET");
} else {
  console.log("Keeping the existing .env");
}

try {
  execSync("docker info", { stdio: "ignore" });
} catch {
  console.error("\nDocker is not running. Start Docker Desktop, then run `pnpm dev:setup` again.");
  process.exit(1);
}

run("docker compose up -d --wait");
run("pnpm db:migrate");
run("pnpm db:seed");
run("node scripts/prepare-git-hooks.mjs");
run("node scripts/memory-install.mjs");

const port = /^PORT=(\d+)/m.exec(readFileSync(".env", "utf8"))?.[1] ?? "3001";
console.log(`\nReady. Run \`pnpm dev\` and open http://localhost:${port}`);
