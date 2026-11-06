// Every feature branch lives in its own git worktree under .claude/worktrees/, with its own
// databases and dev port, so several features (or agents) can run and test side by side.
//
//   pnpm worktree <type>/<slug>        create (or check out) the branch in a new worktree
//   pnpm worktree remove <branch|path> remove a clean worktree and drop its databases
//
// See .claude/rules/git-pr-workflow.md §2.
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import postgres from "postgres";

const root = execSync("git rev-parse --path-format=absolute --git-common-dir", { encoding: "utf8" })
  .trim()
  .replace(/[\\/]\.git$/, "");
const worktreesDir = path.join(root, ".claude", "worktrees");
const BRANCH_PATTERN = /^(feat|fix|chore|refactor|docs|test|perf)\/[a-z0-9]+(-[a-z0-9]+)*$/;

function sh(command, options = {}) {
  return execSync(command, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

function run(command, cwd) {
  console.log(`\n> ${command}`);
  execSync(command, { cwd, stdio: "inherit" });
}

function branchExists(ref) {
  try {
    sh(`git rev-parse --verify --quiet ${ref}`);
    return true;
  } catch {
    return false;
  }
}

function readEnv(file) {
  return existsSync(file) ? readFileSync(file, "utf8") : "";
}

function setEnv(text, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  return pattern.test(text) ? text.replace(pattern, line) : `${text.trimEnd()}\n${line}\n`;
}

function usedSlots() {
  if (!existsSync(worktreesDir)) return new Set();
  return new Set(
    readdirSync(worktreesDir)
      .map(
        (dir) => /^WORKTREE_SLOT=(\d+)/m.exec(readEnv(path.join(worktreesDir, dir, ".env")))?.[1],
      )
      .filter(Boolean)
      .map(Number),
  );
}

function withDatabase(url, name) {
  const next = new URL(url);
  next.pathname = `/${name}`;
  return next.toString();
}

async function create(branch) {
  const isNew =
    !branchExists(`refs/heads/${branch}`) && !branchExists(`refs/remotes/origin/${branch}`);
  if (isNew && !BRANCH_PATTERN.test(branch)) {
    console.error(
      `New branches are named <type>/<kebab-slug>, e.g. feat/team-invites (got "${branch}")`,
    );
    process.exit(1);
  }
  const target = path.join(worktreesDir, branch.replace("/", "-"));
  if (existsSync(target)) {
    console.error(`${target} already exists`);
    process.exit(1);
  }

  try {
    run("git fetch --prune origin", root);
  } catch {
    console.warn("Could not fetch origin; continuing from local refs");
  }
  if (branchExists(`refs/heads/${branch}`)) {
    run(`git worktree add "${target}" ${branch}`, root);
  } else if (branchExists(`refs/remotes/origin/${branch}`)) {
    run(`git worktree add --track -b ${branch} "${target}" origin/${branch}`, root);
  } else {
    const base = branchExists("refs/remotes/origin/main") ? "origin/main" : "main";
    run(`git worktree add --no-track -b ${branch} "${target}" ${base}`, root);
  }

  let slot = 1;
  while (usedSlots().has(slot)) slot++;
  const port = 3000 + slot * 10;
  const mainEnv = readEnv(path.join(root, ".env")) || readEnv(path.join(root, ".env.example"));
  const databaseUrl =
    /^DATABASE_URL=(.+)$/m.exec(mainEnv)?.[1] ??
    "postgres://postgres:postgres@localhost:5433/hackathon";
  let env = mainEnv;
  env = setEnv(env, "WORKTREE_SLOT", slot);
  env = setEnv(env, "DATABASE_URL", withDatabase(databaseUrl, `hackathon_wt${slot}`));
  env = setEnv(env, "TEST_DATABASE_URL", withDatabase(databaseUrl, `hackathon_wt${slot}_test`));
  env = setEnv(env, "PORT", port);
  env = setEnv(env, "BETTER_AUTH_URL", `http://localhost:${port}`);
  writeFileSync(path.join(target, ".env"), env);

  run("pnpm install --frozen-lockfile", target);
  try {
    run("pnpm db:migrate", target);
    run("pnpm db:seed", target);
  } catch {
    console.warn(
      "\nDatabase setup failed. Start PostgreSQL (`pnpm db:up`), then run `pnpm db:migrate` there.",
    );
  }
  console.log(
    `\nWorktree ready (slot ${slot}, port ${port}):\n  cd ${path.relative(process.cwd(), target) || "."}`,
  );
}

async function remove(nameOrPath) {
  const list = sh("git worktree list --porcelain", { cwd: root });
  const entries = list
    .split(/\n\n+/)
    .map((block) => ({
      path: /^worktree (.+)$/m.exec(block)?.[1],
      branch: /^branch refs\/heads\/(.+)$/m.exec(block)?.[1],
    }))
    .filter((entry) => entry.path && path.resolve(entry.path) !== path.resolve(root));
  const entry = entries.find(
    (e) => e.branch === nameOrPath || path.resolve(e.path) === path.resolve(nameOrPath),
  );
  if (!entry) {
    console.error(
      `No worktree for "${nameOrPath}". Known: ${entries.map((e) => e.branch ?? e.path).join(", ")}`,
    );
    process.exit(1);
  }
  const target = path.resolve(entry.path);
  if (path.resolve(process.cwd()).startsWith(target)) {
    console.error(
      "Run this from the main checkout or another worktree, not from inside the one being removed.",
    );
    process.exit(1);
  }
  if (sh("git status --porcelain", { cwd: target })) {
    console.error(`${target} has uncommitted changes; commit or discard them first.`);
    process.exit(1);
  }
  // A /ux-review target that is up (or was killed without its stop) still holds its port and its
  // `_ux` database; its stop also writes the password verdict and deletes the password.
  const gitDir = sh("git rev-parse --path-format=absolute --git-dir", { cwd: target });
  if (existsSync(path.join(gitDir, "ux-review-run"))) {
    console.error(
      `${target} has a /ux-review run that was not stopped; run \`pnpm ux-review:stop\` there first.`,
    );
    process.exit(1);
  }

  const env = readEnv(path.join(target, ".env"));
  const slot = /^WORKTREE_SLOT=(\d+)/m.exec(env)?.[1];
  const databaseUrl = /^DATABASE_URL=(.+)$/m.exec(env)?.[1];
  if (slot && databaseUrl) {
    const admin = postgres(withDatabase(databaseUrl, "postgres"), { max: 1, onnotice: () => {} });
    try {
      for (const name of [
        `hackathon_wt${slot}`,
        `hackathon_wt${slot}_test`,
        `hackathon_wt${slot}_ux`,
      ]) {
        await admin`drop database if exists ${admin(name)} with (force)`;
      }
    } catch (error) {
      console.warn(`Could not drop the worktree databases: ${error.message}`);
    } finally {
      await admin.end();
    }
  }

  // `git worktree remove` fails on Windows with an installed node_modules, so delete the folder
  // first and let git forget it.
  rmSync(target, { recursive: true, force: true, maxRetries: 5 });
  run("git worktree prune", root);
  console.log(
    `Removed ${target}. The branch ${entry.branch ?? ""} is kept; delete it after its PR merges.`,
  );
}

const [command, argument] = process.argv.slice(2);
if (command === "remove" && argument) {
  await remove(argument);
} else if (command && command !== "remove") {
  await create(command);
} else {
  console.error("Usage: pnpm worktree <type>/<slug> | pnpm worktree remove <branch|path>");
  process.exit(1);
}
