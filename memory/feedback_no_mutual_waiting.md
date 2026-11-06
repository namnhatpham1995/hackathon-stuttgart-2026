---
name: feedback-no-mutual-waiting
description: "Controllers and workers never sit waiting on each other's messages: read the run folder on every turn end, merge at PASS, check a silent worker for a stuck prompt"
metadata:
  type: feedback
---

A worker finished (review PASS, test fidelity 0 blocking) but its final report never reached the controller, which kept waiting. The owner merged by hand: "both of you wait for each other the whole day."

**Why:** final texts and turn-end notices get lost between sessions and machines. Waiting on a message that never comes stalls a whole day of delivery.

**How to apply:**
- On every worker turn-end notice, read the worker's latest review and fidelity reports yourself (the run folder, `ls -t`), and its events. Never answer "waiting" without checking.
- Merge as soon as the latest review is PASS and fidelity has 0 blocking on the head; commits after the review must be tests-only (`git show --stat`).
- Every brief tells the worker to send its PASS report and any blocker with SendMessage to the controller (reply to `from`), not only as final text, and never to wait for a controller reply to continue its own loop. A worker must stay in the turn until a background push finishes, or check its result itself.
- Subscribe with `notify_when_idle: true` when you hand a worker a task on the same machine.
- A worker silent for more than 20 minutes: first check whether it sits on a permission prompt ([[feedback-no-wildcard-rm]]).
- After a merge, hand out the next item in the same turn. Related: [[feedback-reuse-workers-clear-before-brief]].
