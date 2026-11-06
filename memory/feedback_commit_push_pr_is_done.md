---
name: feedback-commit-push-pr-is-done
description: "Implementation is done only when committed, pushed and open as a PR against main; never ask permission to open the PR"
metadata:
  type: feedback
---

At the end of an implementation run, without being prompted: stage only this change's files, commit in logical units, push, and open the PR with a summary and test plan.

**Why:** runs that stopped at "implementation complete, nothing committed" left work stranded on one machine, and asking "should I open the PR?" was itself the failure the user kept correcting.

**How to apply:** treat the PR link as the deliverable of every apply or fix run. Never merge it yourself; the user reviews and merges. Related: [[feedback-split-commits-and-task-groups]].
