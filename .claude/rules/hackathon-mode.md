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
