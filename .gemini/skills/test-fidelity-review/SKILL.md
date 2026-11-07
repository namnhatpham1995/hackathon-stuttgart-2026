---
name: test-fidelity-review
description: Review the tests a diff or pull request adds or changes and find the ones that would still pass if the code were wrong - tautological tests, expected values taken from the code under test, mocks asserted against what the test configured, rejection tests that do not say which rejection, assertions that do not reach what the test name claims. Reports only; never deletes, rewrites or commits tests. Use when the user says "test-fidelity-review", asks whether new tests can fail. When full-feature-develop reviews a PR that touches test files, its fresh `independent-pr-reviewer` agent follows this procedure.
argument-hint: "[PR number | branch | path]"
---

This skill lives in `.claude/skills/test-fidelity-review/SKILL.md`, the single copy every tool shares. Read that file now and follow it exactly; the request the user wrote after the skill name is its `$ARGUMENTS`. How to start the agent roles it names in this tool and which model to use: `.claude/rules/multi-tool-agents.md`.
