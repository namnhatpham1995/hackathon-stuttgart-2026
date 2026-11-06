---
name: feedback-controller-context-hygiene
description: "Long-lived controllers stay small: compact often; before a clear save state to memory, after it re-read memory; never delete controller or worker sessions"
metadata:
  type: feedback
---

Controllers live for days and must stay cheap. Compact after each finished item or when context grows. When compaction is not enough: write the current state and open decisions into memory files (not only the conversation), clear the session (keeping its `[Mx]` title prefix), then read `MEMORY.md` and the linked state files first.

**Why:** the owner asked every controller for this. A controller that grows to thousands of messages costs a lot per turn and forgets its own early rules.

**How to apply:**
- Keep a `project_controller_live_state.md` memory (newest entry on top: what is running where, what waits, next dispatch) and, while the owner is away, a decision log ([[feedback-decisions-route-to-main-controller]]). Read both first after a clear.
- A session serving Remote Control cannot be cleared: turn it off first, clear, then turn it on after the next message.
- Optional cleaner session (a small model on low effort) that checks the controller every ~45 min and, after ~250 new messages, sends "CLEANER: your context is long". The controller saves state, turns Remote Control off, replies "READY-TO-CLEAR" and calls `clear_session` on itself as its last call. Nobody messages the controller between READY-TO-CLEAR and the clear (a waiting message cancels it). The cleaner then sends "CLEANER RESTART: read memory, turn Remote Control on, read notifications, continue".
- Never delete, archive or detach a controller or worker session.
