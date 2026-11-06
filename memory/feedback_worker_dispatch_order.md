---
name: feedback-worker-dispatch-order
description: "Dispatch new work to machines in the owner's fixed order; never use the next machine while an earlier one has an idle worker"
metadata:
  type: feedback
---

The owner sets one dispatch order across machines (for example: cloud VM A → cloud VM B → laptop 1 → laptop 2, slowest or most expensive last). Each new item goes to the first idle worker in that order. Never give work to a later machine while a worker on an earlier one is idle. Work already running stays where it is; the order applies to each new dispatch.

**Why:** the owner changed the order several times as machines joined and left, and corrected the controller each time it skipped ahead ("always use the first one before delegating to the next"). A fixed order keeps cheap machines busy and the owner's own laptop free.

**How to apply:**
- Keep the current order in this memory and update it when the owner changes it; a machine the owner removes takes no new work.
- Before each dispatch, check who is busy (ListAgents plus the controllers' replies).
- File overlap and migrations still win: an idle worker with no safe task stays idle rather than taking work that conflicts with a running group. Only one migration PR is open at a time across all machines.
- Workers on another machine are briefed through that machine's controller; workers on the main controller's own machine are briefed directly ([[feedback-reuse-workers-clear-before-brief]]).
