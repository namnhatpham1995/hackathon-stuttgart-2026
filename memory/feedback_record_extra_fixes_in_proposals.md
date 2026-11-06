---
name: feedback-record-extra-fixes-in-proposals
description: "Out-of-scope findings and kept-back review advice become tasks in the right change's tasks.md, not only chips, PR comments or chat"
metadata:
  type: feedback
---

A real defect found while planning was once flagged only as a chip and a chat line, and the user asked for such flags to be written into the proposals: they work through proposals task by task, so a chip or chat remark is easily lost.

**Why:** `tasks.md` is where the next person looks when picking up the next group.

**How to apply:** add a task (one line for what and why, one for how to verify) in the change and group whose PR touches the same code, as a docs-only commit in the current PR. Skip what a task could no longer change (an applied migration). If a chip also exists, say which is the record. List the added tasks in the final report. Rule: `.claude/rules/task-progress-handoff.md`, "Extra fixes found on the way". Related: [[feedback-tasks-md-is-shared-state]].
