// Production builds migrate, then build. Every other environment skips the
// migration: there is no pre-prod database, and a preview must never migrate
// production. Owner steps are in docs/deploy.md.
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

/** Neon pooler hosts reject the prepared statements this app and its migrator use. */
function isPooledNeonUrl(url) {
  return url.includes("-pooler") || url.includes("pgbouncer=true");
}

const vercelEnv = process.env.VERCEL_ENV;

if (vercelEnv === "production") {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (isPooledNeonUrl(databaseUrl)) {
    console.error(
      "vercel-build: DATABASE_URL is a pooled Neon URL. Set the Production value to the direct " +
        "DATABASE_URL_UNPOOLED string (host without -pooler). pnpm db:migrate and the app client " +
        "both use postgres.js prepared statements, which the pooler rejects. See docs/deploy.md.",
    );
    process.exit(1);
  }
  console.log("vercel-build: VERCEL_ENV=production, running pnpm db:migrate");
  run("pnpm", ["db:migrate"]);
} else {
  console.log(`vercel-build: VERCEL_ENV=${vercelEnv ?? "unset"}, skipping pnpm db:migrate`);
}

console.log("vercel-build: running next build");
run("pnpm", ["exec", "next", "build"]);
