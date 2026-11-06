---
name: feedback-reuse-workers-clear-before-brief
description: "Keep standing worker sessions with machine prefixes; before every new task rename and CLEAR the worker, then brief it; never delete workers"
metadata:
  type: feedback
---

Each machine keeps one controller and two standing worker sessions, named with the machine prefix: `[M1] Controller`, `[M1] Worker 1 · <task>`, `[M1] Worker 2 · idle`. Workers are reused, never deleted or archived.

For every new task, one call at a time, never batched:
1. `set_session_title` → `[M1] Worker <n> · <task>`.
2. Turn the worker's Remote Control off if it serves one (a session serving Remote Control cannot be cleared).
3. `clear_session`. It must succeed. If it is refused ("still has live work", a pending hook), wait until the worker is idle or give the task to the other, cleared worker.
4. `send_message` with the full brief. Turn Remote Control back on after the first message (turning it on right after the clear fails).

A follow-up on the same task (a review fix, the next round) is not a new task and needs no clear. The next group of the same change is a new task.

**Why:** the owner caught a brief sent into a worker session with more than 4,000 messages, and later two groups sent into one uncleared worker. A batched rename+clear+send once delivered the brief before the clear. Starting new sessions instead needs the user's own turn, so work stalled as cards waiting for a click.

**How to apply:** brief workers to stop at review PASS + green hook and report the full head sha; the controller merges ([[feedback-verify-before-merge]]). Related: [[feedback-controller-dispatches-and-merges]], [[feedback-no-mutual-waiting]].
