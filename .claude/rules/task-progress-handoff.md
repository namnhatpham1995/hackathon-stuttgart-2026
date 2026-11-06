# Task Progress Handoff

Use this file when implementing an OpenSpec change (`/opsx:apply`) or any `tasks.md` checklist.

Several agents may work on the same change from different computers. They share nothing except
what is pushed to the remote, so `tasks.md` on the feature branch is the single source of truth for
what is done. Keep it true at all times, so the next agent never has to read code to find out.

## Starting

- `git fetch`, open the change's feature branch in its own worktree (`pnpm worktree <branch>`, see
  `git-pr-workflow.md` §2) and pull it before reading anything else.
- Read `tasks.md`. The first unticked task is next. Trust ticked tasks; do not re-derive them from
  the code unless the task you are on fails because of one.

## Finishing a task

1. Tick it (`- [ ]` → `- [x]`) as soon as its specified behavior is implemented and its stated
   verification passes, before starting the next task. Never batch ticks at the end of a session.
2. Commit the tick together with that task's work, once the task's own narrow test passes. Do not
   push after every task. Push at four points: when the group's first task is committed, so the
   remote branch shows from then on that the group is taken; when the group's last task is done;
   after each review fix round; and before stopping for any other reason (blocked, interrupted, out
   of budget), so no commit is left only on this computer. Between those points other computers do
   not see the group's progress, which is safe because one session owns the whole group ("Avoiding
   collisions") and its branch is already on the remote. If the pre-push hook rejects the push
   before stopping, never bypass it: report the unpushed commits, the branch and the worktree path
   instead. The pre-push hook runs `pnpm verify`, which needs PostgreSQL (`pnpm db:up`). Each
   worktree has its own test database, so a push here does not collide with a test run in another
   worktree.
3. If what you did differs from the task text, or you left a fact the next agent needs (a name you
   chose, a value that must match elsewhere, a follow-up you deferred), add one indented line under
   the task. Record only what the code does not make obvious.

```markdown
- [x] 2.1 Generate the header mark and verify it has no halo on `#f5f8f8`
  - Note: cropped x 205–1036, y 329–708; alpha keyed at distance 120 from the paper colour.
```

## Extra fixes found on the way

A problem you find outside your task, or review advice you decide not to fix in this PR, goes into
`tasks.md` as a new task, not only into chat, a PR comment or a spawned-task chip. The next person
reads the proposal, so that is the record.

- Add it to the change it belongs to, in the group whose PR touches the same code (or the next group
  that fits). One line for what is wrong and why, one for how to verify the fix. If no change fits,
  propose a small new change.
- Commit it as a docs-only change in the PR you are working on. Do not edit `tasks.md` while another
  agent is running in the same working tree.
- Skip what a task could no longer change (a migration that has already run).
- If you also created a chip or a PR comment, say which one is the record, or withdraw the chip.
- List the added tasks in your final report.

## When a task cannot be finished

- Leave it unticked. Never tick partial or deferred work.
- Add `  - Blocked: <reason and what is needed>` under it, commit it and push at once, even if you go
  on with other tasks of the group, so the next agent starts from the blocker rather than
  rediscovering it.

## Finishing a change

When ticking a task leaves no unticked task in the whole `tasks.md`, archive the change in that
same PR: run the `openspec-archive-change` skill, which syncs the delta specs into
`openspec/specs/` and moves the change to `openspec/changes/archive/`. Do not leave a fully ticked
change in `openspec/changes/`, and never archive one that still has unticked tasks.

## Findings larger than a fix

A confirmed finding that is larger than a fix, such as one from a `/ux-review` audit (its report lives
outside the repository), is written into the `tasks.md` of the right change as a task of its own, not
only into the audit file or a message.

## Avoiding collisions

Two agents starting at the same moment both see the same first unticked task. Give each agent a
whole top-level task group (each group is one PR, per `git-pr-workflow.md` §8) and name that group
in the prompt. Tick only tasks inside your own group.
