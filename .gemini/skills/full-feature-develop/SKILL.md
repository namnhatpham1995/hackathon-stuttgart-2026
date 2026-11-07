---
name: full-feature-develop
description: One OpenSpec task group to a reviewed PR, in Claude Code, Cursor or Gemini CLI: proposal-review before a change's first group, plan and implement in this session on the strongest model, open the PR into main, have a fresh independent-pr-reviewer judge code and tests, fix and re-review up to 3 rounds, then stop with the PR open and unmerged. Use when the user says "full-feature-develop", asks to take a change or the next tasks to a reviewed PR, or names a change ("work add-team-invites", "review PR 12").
argument-hint: "<change name> [group <n>] | next | PR <number>"
---

This skill lives in `.claude/skills/full-feature-develop/SKILL.md`, the single copy every tool shares. Read that file now and follow it exactly; the request the user wrote after the skill name is its `$ARGUMENTS`. How to start the agent roles it names in this tool and which model to use: `.claude/rules/multi-tool-agents.md`.
