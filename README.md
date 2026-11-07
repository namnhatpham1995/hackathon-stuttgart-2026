# Hackathon Starter

Start a hackathon with sign-in, a database and an agent workflow already working, so the first hour
goes into the idea.

- **App:** Next.js 16 (App Router), React 19, Tailwind CSS 4
- **Auth:** [Better Auth](https://better-auth.com): email and password out of the box; Google and
  GitHub turn on when you add their keys to `.env`
- **Database:** PostgreSQL 16 in Docker, Drizzle ORM and migrations
- **Quality:** Vitest against a real database, Biome, a pre-push hook and GitHub Actions CI
- **Agent workflow:** Claude Code rules, OpenSpec skills, impeccable for UI, review agents, seed
  memories, and one git worktree per feature branch

## Quick start

You need Node 22.12+, pnpm 11 (`corepack enable`), Docker Desktop and git.

```bash
pnpm install
```

```bash
pnpm dev:setup
```

```bash
pnpm dev
```

Open http://localhost:3001, create an account, and you land on the protected dashboard. The
seeded demo account is in `.env` (`SEED_USER_EMAIL`, `SEED_USER_PASSWORD`).

`pnpm dev:setup` writes `.env` with a fresh `BETTER_AUTH_SECRET`, starts PostgreSQL on port 5434,
applies migrations, creates the demo user, installs the git hooks and copies the seed memories into
Claude Code's memory for this folder. It is safe to run again.

## Using it at a hackathon

1. Click **Use this template** on GitHub (or clone), then run the quick start.
2. Open Claude Code in the folder and describe the product: `/impeccable init` writes `PRODUCT.md`
   and `DESIGN.md`, which every UI task reads.
3. Plan a feature: `/opsx:propose <idea>` creates `openspec/changes/<name>/` with the proposal,
   design, spec deltas and `tasks.md` (one task group per PR).
4. Build it in its own worktree: `pnpm worktree feat/<name>`, then `/opsx:apply` — or run the
   `full-feature-develop` skill to go from plan to an independently reviewed PR in one go (Claude Code,
   Cursor or Gemini CLI).
5. The agent commits per task, pushes and opens the PR into `main`; you review and merge. Then
   `/opsx:archive`.

Several teammates or agents can work at once: each `pnpm worktree` gets its own branch, its own
databases (`hackathon_wt<N>`, `hackathon_wt<N>_test`) and its own dev port (`3000 + 10N`).

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server on `PORT` from `.env` |
| `pnpm verify` | Typecheck, lint and tests (the pre-push hook and CI run this) |
| `pnpm db:up` | Start PostgreSQL (Docker, port 5434) |
| `pnpm db:generate` | Generate a migration after changing `src/db/schema/` |
| `pnpm db:migrate` / `pnpm db:seed` | Apply migrations / create the demo user |
| `pnpm db:studio` | Browse the database in Drizzle Studio |
| `pnpm worktree <type>/<slug>` | New branch in `.claude/worktrees/` with its own databases and port |
| `pnpm worktree remove <branch>` | Remove a clean worktree and drop its databases |
| `pnpm memory:install` | Copy `memory/` into Claude Code's memory for this checkout |
| `pnpm ux-review:serve` / `pnpm ux-review:stop` | Start / stop the `/ux-review` target: a production build on port 3005 + 10N over a throwaway `_ux` database with synthetic personas |

## Adding a table

1. Add `src/db/schema/<area>.ts` and export it from `src/db/schema/index.ts`. Put the rules that
   must always hold (unique, foreign keys, checks) in the table definition.
2. `pnpm db:generate`, then `pnpm db:migrate`.
3. Test it against the real database: write the bad row and assert the constraint rejects it.
4. Give the `/ux-review` personas rows in it: `scripts/ux-review/seed-personas.ts`, and a line in
   `.claude/skills/ux-review/references/personas.md`, "What the seed holds".

## Social sign-in

Fill `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` or `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` in
`.env` (the callback URLs are in `.env.example`) and restart `pnpm dev`; the buttons appear on the
sign-in and sign-up pages.

## A second project on the same machine

Every copy of this template uses the Docker project name `hackathon-starter`, so a second project
would reuse the first one's container and its `hackathon` database. Before its first
`pnpm dev:setup`, give the new project its own:

1. In `docker-compose.yml`, change `name:` (for example `name: my-idea`). The data volume is
   named after it, so it gets its own data too.
2. To run both at once, also pick a free database port: change `"5434:5432"` in
   `docker-compose.yml` and `5434` in `DATABASE_URL` and `TEST_DATABASE_URL` in `.env.example`
   (and in `.env` if it already exists). Change `PORT` and `BETTER_AUTH_URL` too, since the
   first project's dev server already holds port 3001.

If only one project runs at a time, step 1 is enough: stop the other with `docker compose stop`.

## What's in `.claude/`

| Path | Purpose |
|---|---|
| `rules/` | The operating contract every agent follows: git and PR workflow, task handoff, review decisions, token-efficient execution |
| `skills/openspec-*`, `commands/opsx/` | Spec-driven planning: propose, apply, archive, explore, update, sync |
| `skills/full-feature-develop/` | One task group from plan to reviewed PR |
| `skills/test-fidelity-review/` | Finds tests that would pass even if the code were wrong |
| `skills/proposal-review/` | Three Opus reviewers (critic, readiness, codebase) check a change before its first group is planned |
| `skills/impeccable/` | Design, critique, polish and audit of UI ([impeccable](https://github.com/pbakaus/impeccable), Apache 2.0) |
| `skills/ui-ux-pro-max/` | Searchable styles, palettes, font pairings, UX guidelines and stack notes for UI work ([ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), MIT) |
| `skills/ux-review/` | Audits the running app like real users: personas, three widths, light and dark, reload-to-verify. Its target, persona seed, password check and stop are `pnpm ux-review:*` (`scripts/ux-review/`) |
| `agents/` | `independent-pr-reviewer`, `proposal-reviewer`, `ux-reviewer` and the impeccable helpers |
| `settings.json` | Impeccable's UI check hooks, no AI attribution in commits |

`CLAUDE.md` is the project guide; `AGENTS.md` (Cursor, Codex) and `GEMINI.md` (Gemini CLI) point the
other tools at the same rules, and `.cursor/` and `.gemini/` hold their generated OpenSpec commands.
How each tool runs the review roles: `.claude/rules/multi-tool-agents.md`.

## Guides

- [`docs/ui-ux-guide.md`](docs/ui-ux-guide.md) — the order to use impeccable, ui-ux-pro-max and
  ux-review in, tokens and dark mode, every state of every component, three widths, accessibility.
- [`docs/security-guide.md`](docs/security-guide.md) — threat model first, no sign-in shortcuts,
  invariants in the schema, hashed tokens, the three-step pre-launch review, accepted risks.
- [`docs/multi-controller-setup.md`](docs/multi-controller-setup.md) — a team of sessions on several
  machines: one main controller dispatches and merges, machine controllers run two workers each,
  workers stop at review PASS. One worker plans and codes on Opus; reviews run in fresh contexts.

## Deploying

The UI runs on Vercel. The Next.js server (`/api/*`, including the job runner) and PostgreSQL run
on Railway. There is no Neon database. Production `GEMINI_MODEL` is `gemini-3.6-flash`. Steps and
the owner commands are in [`docs/deploy.md`](docs/deploy.md).

Locally, leave `BACKEND_URL` unset. Set `DATABASE_URL`, `BETTER_AUTH_SECRET` (32+ random characters)
and `BETTER_AUTH_URL`, then `pnpm db:migrate`, `pnpm build` and `pnpm start`.
