---
name: feedback-tasks-md-is-shared-state
description: "tasks.md on the feature branch is the only shared record across agents and machines: tick per task, push at the four points, never batch ticks"
metadata:
  type: feedback
---

Tick a task as soon as it works and its narrow test passes, and commit the tick with that task's work. Push when the group's first task is committed, when its last is done, after each review fix round, and before stopping for any reason. Leave unfinished work unticked with an indented `Blocked:` note, pushed at once.

**Why:** agents on different machines share nothing but the remote. Batched ticks at the end made the next agent redo or skip work.

**How to apply:** trust ticked tasks; start from the first unticked one; one session owns a whole group. Full rule: `.claude/rules/task-progress-handoff.md`. Related: [[feedback-record-extra-fixes-in-proposals]].
