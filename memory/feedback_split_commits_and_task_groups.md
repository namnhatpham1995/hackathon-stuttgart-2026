---
name: feedback-split-commits-and-task-groups
description: "Commit each logical unit separately within a PR, and split OpenSpec tasks.md into groups that are each one mergeable PR"
metadata:
  type: feedback
---

Inside a PR: one commit per logical unit (migration, core logic, tests, docs), conventional format, no AI attribution. In a proposal: each top-level task group in `tasks.md` is one independently mergeable PR, ordered so every merge point is green and the app still runs.

**Why:** a single squashed commit forces an all-or-nothing revert; a flat dependency-ordered task list produces one giant PR nobody can review.

**How to apply:** when writing `tasks.md` (`/opsx:propose`), title each group with its PR scope; when implementing, commit as each task's narrow test passes. Related: [[feedback-one-stacked-pr-at-a-time]], [[feedback-tasks-md-is-shared-state]].
