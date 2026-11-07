---
name: feedback-model-top-tier
description: "One session plans and implements a task group on the strongest model (Opus, or the same tier in Cursor/Gemini); reviews run in a fresh context on that tier"
metadata:
  type: feedback
---

A task group is planned and implemented by one session on the strongest model of its tool: Claude Code Opus, Cursor's top model (not Auto), Gemini CLI Pro (not Flash). There is no separate planner agent and no Sonnet implementer. Proposal review, independent PR review and test-fidelity review still run as separate roles on the same tier, each in a fresh context. No session grades its own work.

**Why:** the owner decided on 2026-11-07 (Stuttgart hackathon day) to merge planner and implementer onto Opus or an equal tier, and to run the workflow from Cursor and Gemini CLI as well as Claude Code. Independence of review now comes from a fresh context, not a different model.

**How to apply:** start or propose task-group, fix and follow-up sessions on Opus (`claude-opus-5-5`), not Sonnet. Briefs tell the session to run `full-feature-develop`. Starting review roles outside Claude Code (subagent, headless CLI, or a pasted prompt): `.claude/rules/multi-tool-agents.md`. The rule is in `.claude/rules/CLAUDE.md`, "Models".
