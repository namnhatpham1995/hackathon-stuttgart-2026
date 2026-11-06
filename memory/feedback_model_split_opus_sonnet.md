---
name: feedback-model-split-opus-sonnet
description: "Planning, proposal review, independent PR review and test-fidelity review run on Opus; implementation runs on Sonnet"
metadata:
  type: feedback
---

Plan on Opus, review on Opus (proposal review, independent PR review, test-fidelity review), code on Sonnet in the worker session. No session grades its own work.

**Why:** test fidelity is judgement work (tautologies, values copied from the code, mocks asserted against themselves), and a miss is invisible: a hollow test merges. It costs a small share of tokens next to coding. It used to run as a skill inside the Sonnet worker.

**How to apply:** the planner and reviewer agents in `.claude/agents/` carry `model: opus`, so a Sonnet worker that starts them gets Opus. A running session only sees agent types that existed when it started: restart it after adding one (fallback: `general-purpose` with `model: "opus"`). When checking workers, confirm the model in their transcripts. The rule is in `.claude/rules/CLAUDE.md`, "Models". Related: [[feedback-sessions-default-sonnet]].
