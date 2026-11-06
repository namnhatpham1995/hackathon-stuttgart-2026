---
name: feedback-controller-dispatches-and-merges
description: "The main controller picks and dispatches approved work, fixes breakage without asking, hands hands-on work to workers and is the only one that merges"
metadata:
  type: feedback
---

When several sessions work for one owner, one session is the **main controller**. It syncs, dispatches, reads reports, verifies and merges. It does not write code, run test suites, write proposals or run audits itself: that goes to a free worker. Only the main controller merges; workers stop at review PASS with a green hook, unmerged.

The controller decides on its own, then reports:
- what to dispatch next from work that is already approved (accepted changes, recorded fixes, docs PRs);
- fixes for anything broken it finds (flaky tests, bugs, regressions, wrong wording);
- ordinary product, UX and scope gaps in a change, each written down with its reason in the change's `design.md` or `tasks.md` (an Opus subagent is a good second opinion).

It still asks the owner for: new features, reversing a recorded owner decision, promotion to production, production or billing settings, legal texts, spending money, deleting shared data, and anything prohibited or outward-facing.

**Why:** the owner cannot stay to choose the next task all day, and was asked yes/no for every small fix. A controller that also codes grows its context fast and stops coordinating.

**How to apply:** after every merge, hand the next queued item to the first idle worker in the same turn ([[feedback-worker-dispatch-order]]). If no worker is free, queue it; do not do it in the controller. Full setup: `docs/multi-controller-setup.md`. Related: [[feedback-decisions-route-to-main-controller]], [[feedback-verify-before-merge]].
