---
name: feedback-color-is-first-class
description: "In design or redesign work, color and contrast are verified explicitly in every phase, not folded into restyle tasks"
metadata:
  type: feedback
---

Treat color as a primary deliverable. The user said "color is important, dont overlook" after a redesign proposal had color checks in only some phases, folded into broad restyle bullets.

**Why:** small color drifts slip through per-PR review when no task names them.

**How to apply:** give every design phase or PR its own color-fidelity and contrast task; treat confirmed values (exact OKLCH tokens in `DESIGN.md` or `src/app/globals.css`) as a contract, never "close enough" or a framework default; end a redesign with a whole-app color-role audit. The impeccable skill's `audit` and `colorize` help here.
