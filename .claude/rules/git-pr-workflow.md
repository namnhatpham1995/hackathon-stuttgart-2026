# Git & PR Workflow

Use this file for every commit, branch, and pull request. `main` is the only long-lived branch: it
is what gets deployed and demoed. All work reaches it through a feature branch and a PR.

## 0. Start of work: sync and clean up

Do this before implementing, applying tasks, or reviewing a PR, so nobody builds on a stale base or
inherits leftover branches. It is safe to repeat.

```bash
git fetch --prune origin
git checkout main && git pull --ff-only origin main
git worktree prune
git worktree list
git branch -vv                    # [gone] = the remote branch was deleted when its PR merged
```

- **Local branches other than `main` are leftovers.** Delete one only after you have read proof
  that it holds nothing missing from `main` or a remote: a `[gone]` branch whose tip equals the
  head of its merged PR (`gh pr list --head <branch> --state merged --json headRefOid`). Squash
  merges leave no ancestry, and later PRs change the same files, so neither `git branch --merged`
  nor a content diff against `main` proves it. Run that check as its own step and read its output
  before `git branch -D`, never chained behind it. Keep and report any branch with unpushed or
  unmerged work.
- **Extra worktrees** (listed beyond the main checkout) are where feature work lives (§2). Run
  `pnpm worktree remove <branch>` once its branch is merged by the proof above and it has no
  uncommitted changes, whoever created it. Otherwise keep it and report it, since it may belong to
  a session that is still running.
- **Stashes** are not yours to drop. Mention them in your report and leave them.
- **Uncommitted changes in the main checkout** stop the routine: say what they are and ask.
- **The main checkout stays on `main`.** It is the place to sync, read and start worktrees from,
  not a place to edit code.
- **Then** implement in a new worktree (§2). Review or continue an existing PR the same way:
  `pnpm worktree <its-branch>` checks the pushed branch out into a worktree of its own.

## 1. Never commit to `main` directly

Never `git commit` or `git push` straight onto `main`. No exceptions — including docs-only,
config-only, and "tiny" changes. Before any `git commit`, check the current branch is not `main`.

**Why:** direct commits bypass review and the pre-push checks, and produce accidental history
(commit + revert + merge) that needs a `reset --hard` to clean up — the worst thing to debug an
hour before a demo.

## 2. Every feature branch gets its own worktree, cut from `main`

Never `git checkout -b` in the main checkout. Every new branch, including docs-only and "tiny" ones,
lives in a git worktree of its own, so several features (or several agents) can be in progress and
tested at the same time without disturbing each other:

```bash
pnpm worktree <type>/<slug>             # feat/, fix/, chore/, refactor/, docs/, test/, perf/ + kebab slug
cd .claude/worktrees/<type>-<slug>      # work, test, commit and push only from here
```

`pnpm worktree` (`scripts/worktree.mjs`) fetches, cuts the branch from `origin/main`, creates the
worktree under `.claude/worktrees/` (ignored by git), writes its `.env` with its own databases
(`hackathon_wt<N>` and `hackathon_wt<N>_test`) and dev port (`3000 + 10N`), installs dependencies,
then migrates and seeds its database. If the branch already exists, locally or on the remote, it is
checked out instead of recreated. The first code action of any implementation run is this command,
before any file edit.

Keep every worktree in `.claude/worktrees/`, one subfolder per branch named `<type>-<slug>`. Create
them only with `pnpm worktree`, never in a sibling folder, a temp folder, or an editor or
desktop-app default, so the whole set can be listed with `git worktree list`.

Shared by every checkout: the PostgreSQL container itself (`docker-compose.yml` pins the project
name, so `pnpm db:up` from any worktree reaches the same container on port 5433). Inside one
worktree, run one test command at a time.

Remove a worktree with `pnpm worktree remove <type>/<slug>` from the main checkout: it refuses when
there are uncommitted changes or a `/ux-review` run that was not stopped, drops the worktree's
databases (`hackathon_wt<N>`, `_test` and the `/ux-review` `_ux`) and keeps the branch. A plain
`git worktree remove` leaves the databases behind and, on Windows, fails on an installed
`node_modules`.

## 3. Feature branches merge to `main` and are deleted automatically

Open the PR against `main`. Turn on `delete_branch_on_merge` in the GitHub repo settings so the
remote branch goes away when the PR merges. Don't recreate a branch after its PR merges; branch
again fresh from `main`.

Local branches are not deleted automatically. After a PR merges, clean up:

```bash
cd <main checkout>                # stays on main
git pull --ff-only origin main
git fetch --prune origin
git branch -vv                    # branches marked [gone] had their remote deleted on merge
pnpm -C .claude/worktrees/<type>-<slug> ux-review:stop   # only if a /ux-review run is still up there
pnpm worktree remove <type>/<slug>   # refuses on uncommitted changes or an unstopped /ux-review run
git branch -D <gone-branch>       # squash merges leave no merge ancestry, so -D is needed
```

Before `-D`, confirm the branch has no commits beyond its merged PR head. Never delete a branch
that has unpushed work, and never force the removal of a worktree.

Then clean up the Docker resources the work left behind, so Docker does not fill the drive. A cleanup
is not done while they remain:

```bash
docker compose exec db psql -U postgres -Atc \
  "select datname from pg_database where datname like 'hackathon_wt%'"   # only live worktrees' databases
docker ps -a                      # containers the work started by hand
docker system df                  # images, volumes and build cache
docker image prune -f && docker builder prune -f
```

- `pnpm worktree remove` can print a `dropdb` error, so trust the list, not its output. A
  `hackathon_wt<N>`, `hackathon_wt<N>_test` or `hackathon_wt<N>_ux` database whose worktree is gone is
  a leftover: drop it. So is `hackathon_ux` while no `/ux-review` run is up in the main checkout.
- `/ux-review` runs keep their folders in `.git/agent-runs/ux-review/<run id>/` (the audit report,
  screenshots, logs; the password is already deleted by `ux-review:stop`). Once the run's findings are
  filed as tasks or fixes, delete each folder by its exact path; keep one whose findings are still open.
  A folder that still holds a `password` file belongs to a run that was not stopped: stop it first.
- Remove any container, network or volume the work created by hand, and stop any server process it
  left running (a leftover dev or test server holds its port and fails the next run).
- Never remove this project's PostgreSQL data volume, its container, or another project's containers
  and volumes.
- On Windows, Docker's disk file (`%LOCALAPPDATA%\Docker\wsl\disk\docker_data.vhdx`) does not shrink
  when data is deleted. Compacting it needs `wsl --shutdown`, which stops every running push on the
  machine, so do it only when the owner asks and no hook is running.

## 4. Split commits within a PR

Do not squash a PR's work into one commit. Commit incrementally as logical units complete
(migration, core logic, tests, docs), so each unit is independently revertable and
cherry-pickable. Conventional commit format. No AI/assistant references in commit messages
or PR descriptions.

## 5. Commit → push → PR is the definition of done

Finishing implementation means the change is committed, pushed, and open as a PR against `main` —
not "implementation complete, nothing committed yet." Do not ask permission to open the PR; asking
is itself the failure mode.

At the end of an implementation run, without being prompted:

1. Stage only files touched by this change (leave unrelated untracked files alone).
2. Commit in logical units (§4).
3. Push the branch.
4. Open a PR with a summary and a test-plan checklist (`.github/pull_request_template.md`).

## 6. Checks run locally and in CI

The pre-push hook (`.githooks/pre-push`, installed by `pnpm install`) runs `pnpm verify`: typecheck,
lint and tests against real PostgreSQL. A push that changes only docs, plans, OpenSpec proposals,
`memory/`, `.claude/` or `.agents/` skips it. Never bypass the hook with `--no-verify`.

GitHub Actions (`.github/workflows/ci.yml`) runs the same `pnpm verify` and the dependency audit on
every PR into `main`. Read the result with `gh pr checks <number>` and fix a check that ran and
failed before merging. A check GitHub never started (billing or the spending limit) is not a code
failure: report it to the user.

A PR that only adds or edits proposals, plans, docs or `.claude/` rules is opened without running
tests or `pnpm verify` first (see `development-rules.md`, Quality Gates).

## 7. One stacked PR at a time

When a change is split across sequential PRs, open PR N, wait for it to **merge into `main`**, then
start PR N+1 in a new worktree off the updated `main`. Do not pre-open a whole stack — a squash-merge
gives `main` a new commit hash for content already-open PRs carry as separate commits, so every PR
still stacked on top shows CONFLICTING even though the content is identical.

If the user asks for the whole stack opened anyway, warn up front that each merge forces a rebase of
every PR still open above it, then do it.

### Fixing a stack broken by a squash-merge

```bash
git fetch origin main
git checkout <child-branch>
git rebase origin/main            # usually auto-drops "patch already upstream" commits
git rebase --skip                 # if a commit still conflicts on already-squashed content
git push --force-with-lease origin <child-branch>
```

## 8. Split proposals into PR-sized task groups

When writing an implementation plan or `tasks.md`, make each top-level task group one
independently mergeable PR against `main` — not a flat dependency-ordered list. Order groups so
every merge point is green, and so the app still runs for a demo after each one.

## 9. Never commit secrets

No dotenv files, tokens, private keys, database credentials, or personal data — ever. `.env` is
ignored; `.env.example` holds only placeholders and local-only defaults.
