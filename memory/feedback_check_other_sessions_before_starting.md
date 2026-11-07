---
name: feedback-check-other-sessions-before-starting
description: "Before starting a session for a task group or fix, confirm no other session or machine is on it; never run conflicting tasks in parallel; clean up after merge"
metadata:
  type: feedback
---

Before starting work on a task group or fix, check that nobody else already owns it: ListAgents (other sessions), remote branches (`git ls-remote`, `gh pr list --head <branch>`) and PR comments. If an owner exists, message it or skip. Do not run tasks in parallel that touch the same files, migrations or shared config. Run at most 2 task sessions at once on one laptop.

**Why:** a local fixer once duplicated a fix that the PR author's session on another machine was already pushing, and parallel test runs overloaded the laptop until pushes needed several attempts.

**How to apply:** after a session's PR merges, run `pnpm worktree remove <branch>` from the main checkout, `git branch -D` only after checking the tip equals the merged PR head (as its own step), then delete that session if it ran on this machine. Leave a session alone while it still works. Related: [[feedback-model-top-tier]].
