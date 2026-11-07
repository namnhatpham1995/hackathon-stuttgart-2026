# Hackathon mode

Valid until submission on 2026-11-07. These overrides expire after submission on 2026-11-07
(milestone M5, 16:45 Europe/Berlin). After submission, delete this file and its index line in
`.claude/rules/CLAUDE.md` so the normal rules apply again.

Until then, this file overrides the planner and review loop in the `full-feature-develop` skill,
the push cadence in `task-progress-handoff.md`, and waiting on GitHub CI before a merge in
`git-pr-workflow.md`. Where this file is silent, those rules still apply.

The change is `openspec/changes/exportready-hackathon-build`. Each `##` group in its `tasks.md`
is one pull request. The branch is the name in the group heading, used exactly:

```text
## <n>. <title> · wave <w> · <milestone> · branch <type>/<slug>
```

A lane edits only the files its group owns, plus that group's own lines in `tasks.md`.

## No planner

`design.md` and the group's tasks are the plan. Skip `full-feature-develop`'s planner step. Do
not write a task-plan file and do not wait for a separate planning session.

## Review

One `independent-pr-reviewer` pass (Opus) only for groups 3, 7, 9, 13 and 17. It covers the code
and the tests that group adds, with at most one fix round. Other groups get the controller's
diff read: do not start a reviewer for them, and do not run the three-round review loop.

## Merge

Merge on a green local pre-push hook. Do not wait for GitHub CI.

Before asking for the merge, the worker runs `git merge origin/main` (no rebase), resolves
only that group's own lines in `openspec/changes/exportready-hackathon-build/tasks.md`, and
pushes. The hook then verifies the combined code:

```bash
git fetch origin
git merge origin/main
git push
```

The worker does not merge the pull request. The controller merges with:

```bash
gh pr merge --squash --match-head-commit
```

## Claim protocol

1. The branch is fixed by the group heading. Use that name exactly.
2. Before starting, run both commands. If either shows a branch or a pull request, the group is
   taken: stop and report that.

```bash
git ls-remote origin <branch>
gh pr list --head <branch>
```

3. Commit the first ticked task, push, and immediately open a draft pull request:

```bash
git push -u origin <branch>
gh pr create --draft --base main
```

4. Mark the pull request ready when every task in the group is ticked. A `(post-merge)` task
   stays unticked; see below.

## Push cadence

Push after every ticked task, not only at the four handoff points in `task-progress-handoff.md`,
so the roadmap moves. A stuck task gets an indented `  - Blocked: <reason>` line, pushed at once.

## Tests

Add only the tests named in the group's tasks. The golden tests run with `pnpm test:golden` by
hand, not in `pnpm verify`.

## Review head

After a PASS, the only commit allowed before the merge is the tick of that group's review task
in `tasks.md`. Any code change after a PASS needs a new review.

## Post-merge tasks

A task marked `(post-merge)` can only be checked once its group is on `main` (production
deploys, the live roadmap URL, submission). A pull request may merge with only those tasks
unticked. Afterwards the controller ticks them in a small docs-only pull request named
`docs/tick-<group>`, which the pre-push hook skips. The roadmap shows such a group as
"Merged, verifying".

## Archive

Do not archive this change until after submission. The roadmap reads its `tasks.md`.

## Kept unchanged

- Worktrees. Every branch is cut with `pnpm worktree <branch>` and edited only in that worktree.
- Never committing to `main`.
- The pre-push hook, with no `--no-verify`. Docs-only pushes still go through the hook; the hook
  skips `pnpm verify` itself when the diff is only docs, plans, OpenSpec, `memory/` or agent
  rules.
- No secrets.
- Session checks: every protected page, route handler and server action checks the session with
  `requireSession()` or `auth.api.getSession()`.
- One migration pull request at a time.

## Worker brief

The controller copies the template, fills it from the lane table in this file, and sends that
block as the worker's assignment. Filling group 7 does not require `design.md`, `tasks.md` or
any other file: branch, owned files, needs, tests and review are all in the table below.

Needs are the groups that must already be on `main`. Review "yes" means one
`independent-pr-reviewer` pass (Opus) and at most one fix round. Review "no" means the
controller reads the diff. Tests are the only tests that group adds. "None named" means the
group's tasks name no new test file.

```text
Group: <n>
Branch: <branch>
Owned files: <paths>
Needs: <groups already on main, or none>
Tests to add: <from the lane table>
Review: yes | no
Stop when the PR is ready and the hook is green. Do not merge.
```

Every brief also includes this fixed line, which is the same for every group: edit only the
owned files, plus that group's own lines in
`openspec/changes/exportready-hackathon-build/tasks.md`.

### Filled for group 7

```text
Group: 7
Branch: feat/rules-engine
Owned files: src/lib/assessment/rules.ts, src/lib/assessment/citations.ts (+ tests)
Needs: 3
Tests to add: ISO certificate valid to 2026-08-01, assessed 2026-11-07, gives EXPIRED;
  revision A vs B gives MISMATCH; wrong part never supports (pure).
  Quote not on the cited page is dropped and the finding becomes NEEDS_REVIEW;
  unknown document ID is dropped (pure).
Review: yes
Stop when the PR is ready and the hook is green. Do not merge.
```

### Lane table

| Group | Branch | Owns | Needs | Review | Tests to add |
|---|---|---|---|---|---|
| 1 | `chore/hackathon-mode` | `.claude/rules/hackathon-mode.md`, `.claude/rules/CLAUDE.md` (one index line) | - | no | none named |
| 2 | `feat/live-roadmap` | `roadmap/**`, `vitest.config.ts` (include line), `biome.json` (includes) | 1 | no | Roadmap parser: ticks, Blocked notes, heading metadata, status rules (pure) |
| 3 | `feat/assessment-contract` | `package.json`, `pnpm-lock.yaml`, `src/env.ts`, `.env.example`, `src/db/schema/exportready.ts`, `src/db/schema/index.ts`, `drizzle/**`, `src/proxy.ts`, `next.config.ts`, `vitest.golden.config.ts`, `src/lib/assessment/types.ts`, `src/lib/assessment/requirement-sets.ts`, `src/db/schema/exportready.test.ts`, and the contract stubs below | 1 | yes | none named |
| 4 | `feat/demo-fixtures` | `fixtures/exportready/**`, `scripts/make-fixtures.ts` | 1 | no | none named |
| 5 | `feat/pdf-text` | `src/lib/assessment/pdf-text.ts` (+ test) | 3, 4 | no | Fixture PDFs give page-labelled text containing their key values; a PDF with no text is flagged empty (pure, reads `fixtures/`) |
| 6 | `feat/gemini-extraction` | `src/lib/assessment/extract-facts.ts`, `src/lib/assessment/gemini.ts` | 3, 4 | no | none named |
| 7 | `feat/rules-engine` | `src/lib/assessment/rules.ts`, `src/lib/assessment/citations.ts` (+ tests) | 3 | yes | ISO certificate valid to 2026-08-01, assessed 2026-11-07, gives EXPIRED; revision A vs B gives MISMATCH; wrong part never supports (pure). Quote not on the cited page is dropped and the finding becomes NEEDS_REVIEW; unknown document ID is dropped (pure) |
| 8 | `feat/document-upload` | `src/lib/products/**`, `src/lib/documents/**`, `src/app/api/products/**` | 3 | no | none named |
| 9 | `feat/assessment-jobs` | `src/lib/jobs/**`, `src/app/api/jobs/**` (+ tests) | 3 | yes | Same snapshot started twice returns one job; a direct duplicate insert is rejected by the unique index (real PostgreSQL). Another user's job returns 404 (real PostgreSQL) |
| 10 | `feat/completion-email` | `src/lib/notify/**` | 3 | no | none named |
| 11 | `feat/workspace-ui` | `src/app/workspace/**`, `src/components/workspace/**`, `src/app/page.tsx` (link) | 3 | no | Report summary: dimension counts and an action plan for the baseline and the corrected findings (pure) |
| 12 | `chore/production-deploy` | `scripts/vercel-build.mjs`, `docs/deploy.md` | 3 | no | none named |
| 13 | `feat/assessment-integration` | `src/lib/assessment/pipeline.ts`, `src/lib/assessment/*.golden.ts` | 5-11 | yes | Golden baseline: documents 01-04 match the answer key. Golden correction: replacing 03 with 05 flips only R3. Both run with `pnpm test:golden` by hand, not in `pnpm verify` |
| 14 | `feat/workspace-assistant` | `src/lib/agent/**`, `src/components/assistant/**`, `src/app/api/assistant/**` | 13 | no | none named |
| 15 | `feat/spoken-replies` | `src/components/voice/**`, `src/app/api/speech/**`, one mount line in `assistant-panel.tsx` | 14 merged | no | none named |
| 16 | `docs/submission` | `README.md`, `docs/pitch/**` | 13 | no | none named |
| 17 | `feat/buyer-supplier-connections` | `src/lib/connections/**`, `src/components/connections/**`, `src/app/connections/**` | 8-11 | yes | The buyer sees only the shared result; a third user gets 404; a duplicate connection and a shared status without a result are rejected by the database (real PostgreSQL) |

Contract stubs, created by group 3 and then filled by the lane that owns the folder:
`src/lib/assessment/pdf-text.ts`, `src/lib/assessment/extract-facts.ts`,
`src/lib/assessment/gemini.ts`, `src/lib/assessment/rules.ts`,
`src/lib/assessment/citations.ts`, `src/lib/assessment/pipeline.ts`,
`src/lib/products/service.ts`, `src/lib/documents/service.ts`, `src/lib/jobs/service.ts`,
`src/lib/notify/completion-email.ts`, `src/lib/notify/brevo.ts` (`sendBrevoEmail`),
`src/lib/connections/service.ts`, `src/components/assistant/assistant-panel.tsx`,
`src/components/connections/connections-nav.tsx`,
`src/components/connections/product-connections.tsx`,
`src/components/connections/report-share.tsx`.

A lane that needs a file it does not own does not edit it. It adds a `Blocked:` note, and the
controller dispatches a small serialized pull request. At most one open pull request may contain
a migration.
