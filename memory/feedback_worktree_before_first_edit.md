---
name: feedback-worktree-before-first-edit
description: "The first action of an implementation run (opsx:apply, a fix) is pnpm worktree <type>/<slug>, before any file edit"
metadata:
  type: feedback
---

Create the branch and its worktree before touching any file: `pnpm worktree feat/<change>` (or `fix/`, `docs/`, …), then work only inside `.claude/worktrees/<type>-<slug>`.

**Why:** edits made first and branched later landed on whatever branch was active, mixing unrelated work. A worktree per branch also lets several agents build and test at once: each gets its own databases and dev port.

**How to apply:** in `/opsx:apply`, `full-feature-develop` and any fix, run `pnpm worktree` first. Never `git checkout -b` in the main checkout. Remove it after merge with `pnpm worktree remove <branch>` from the main checkout. Related: [[feedback-never-commit-to-main]].
