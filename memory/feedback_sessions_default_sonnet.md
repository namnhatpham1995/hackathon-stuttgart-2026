---
name: feedback-sessions-default-sonnet
description: "Side sessions you start or propose default to Sonnet, not the inherited Opus"
metadata:
  type: feedback
---

When proposing or starting other sessions (OpenSpec task groups, fixes, follow-ups), pass `model: "claude-sonnet-5-5"` unless the user asks for Opus for that task.

**Why:** the user asked for it after a day of parallel change sessions all ran on the inherited Opus model.

**How to apply:** only the session's model changes: briefs for task groups still tell the session to run `full-feature-develop`, whose planner and reviewer subagents keep the models their own definitions set (Opus).
