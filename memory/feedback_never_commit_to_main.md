---
name: feedback-never-commit-to-main
description: "Never commit or push directly to main, including docs-only and one-line changes"
metadata:
  type: feedback
---

Every change reaches `main` through a feature branch and a PR. No exceptions for docs, config or "tiny" fixes. Before any `git commit`, check the branch is not `main`.

**Why:** direct commits skipped review and the pre-push checks, and once produced a commit + revert + merge tangle that took a `git reset --hard origin/main` to undo. In a hackathon that costs the hour before the demo.

**How to apply:** start every change with `pnpm worktree <type>/<slug>` ([[feedback-worktree-before-first-edit]]); the main checkout stays on `main` for syncing only. Full rule: `.claude/rules/git-pr-workflow.md` §1.
