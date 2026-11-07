---
name: proposal-review
description: Review one OpenSpec change before its code is written - run three fresh proposal-reviewer agents in parallel (critic, readiness, codebase), check every code claim they make, and write the merged result to the change's review.md in three sections (owner decisions, plan defects, rejected). Reports only; never edits the change's other artifacts or any code. Use when the user says "proposal-review", asks for a review of a proposal or change before implementation, or after openspec-propose. The full-feature-develop skill runs it before it plans a change's first group.
argument-hint: "<change name> [again]"
---

This skill lives in `.claude/skills/proposal-review/SKILL.md`, the single copy every tool shares. Read that file now and follow it exactly; the request the user wrote after the skill name is its `$ARGUMENTS`. How to start the agent roles it names in this tool and which model to use: `.claude/rules/multi-tool-agents.md`.
