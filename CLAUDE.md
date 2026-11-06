# Engineering Guide

@.claude/rules/CLAUDE.md

## What this is

A hackathon starter: one Next.js (App Router) app with email/password and optional Google/GitHub
sign-in (Better Auth), PostgreSQL through Drizzle, and an agent workflow (OpenSpec, worktrees,
reviewed PRs) ready from the first minute. Replace this paragraph with what your team is building,
and keep `PRODUCT.md` in step.

## Layout

- `src/app/` — routes. `(auth)/` holds sign-in and sign-up; `dashboard/` is the protected example;
  `api/auth/[...all]/route.ts` mounts Better Auth.
- `src/lib/auth.ts` — the Better Auth server config. `auth-client.ts` is the browser client;
  `session.ts` has `getSession()` and `requireSession()` for server components and actions.
- `src/proxy.ts` — redirects visitors without a session cookie away from `/dashboard`. It is a fast
  pre-check only; every protected page still calls `requireSession()`.
- `src/db/schema/` — Drizzle tables, one file per area, all re-exported from `index.ts`.
  `auth.ts` holds Better Auth's tables. `src/db/client.ts` is the shared `db`.
- `src/env.ts` — every server environment variable, validated with Zod. Add new ones here and to
  `.env.example`.
- `drizzle/` — generated SQL migrations. Never edit an applied migration; generate a new one.
- `openspec/` — specs (`specs/`) and proposed changes (`changes/`).
- `docs/` — `code-standards.md` (test quality), `ui-ux-guide.md`, `security-guide.md` with
  `security-accepted-risks.md`, and `multi-controller-setup.md` (one main controller over several
  machines' sessions).
- `scripts/` — `dev-setup.mjs`, `worktree.mjs`, `migrate.ts`, `seed.ts`, `memory-install.mjs`.
- `memory/` — seed memories for Claude Code; `pnpm memory:install` copies them into
  `~/.claude/projects/<project-key>/memory/`.

## Commands

| Command | What it does |
|---|---|
| `pnpm install && pnpm dev:setup` | First run: `.env` with a fresh secret, PostgreSQL in Docker (port 5434), migrate, seed, git hooks, memory |
| `pnpm dev` | Dev server on `PORT` from `.env` (3001 in the main checkout) |
| `pnpm verify` | Typecheck, lint and tests (what the pre-push hook and CI run) |
| `pnpm db:generate` | Create a migration from schema changes in `src/db/schema/` |
| `pnpm db:migrate` / `pnpm db:seed` | Apply migrations / create the demo user |
| `pnpm worktree <type>/<slug>` | New feature branch in its own worktree with its own databases and port |

## Required engineering rules

1. **Every protected page, route handler and server action checks the session** with
   `requireSession()` or `auth.api.getSession()`, and only reads or changes the signed-in user's
   own data unless the feature says otherwise. `proxy.ts` is not an authorization check.
2. **Invariants live in the schema.** A business rule that must always hold (uniqueness, required
   relations, allowed values, ownership) is a real PostgreSQL constraint, foreign key, check or
   unique index in `src/db/schema/`, not only an application check. Validate early in code for good
   error messages, but the database must reject a bad write even when every code path forgets.
3. **Validate inputs with Zod** at every boundary: route handlers, server actions, form data.
4. **Tests that exercise persistence use real PostgreSQL**, never mocks. The test database is
   recreated and migrated on every run (`test/global-setup.ts`).
5. **Never commit secrets.** Only `.env.example` is tracked. New config goes into `src/env.ts`.
6. Use kebab-case for file names. Use snake_case for PostgreSQL tables and columns (Drizzle maps
   camelCase keys automatically through `casing: "snake_case"`).
7. Follow [`token-efficient-execution.md`](.claude/rules/token-efficient-execution.md) for every
   task: bounded status checks, compact logs and context, no redundant verification runs.

## Adding a feature

1. `/opsx:propose <idea>` — proposal, design, spec deltas and `tasks.md`, one task group per PR.
   Then `proposal-review` once, before the first group (`full-feature-develop` runs it itself).
2. `pnpm worktree feat/<change>` — then work only inside that worktree.
3. `/opsx:apply` (or the `full-feature-develop` skill for plan → build → independent review).
4. Commit per task, push, open the PR into `main`. After merge: `/opsx:archive`.
