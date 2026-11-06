---
name: feedback-one-stacked-pr-at-a-time
description: "Open PR N+1 only after PR N has merged into main; a squash-merge conflicts every PR still stacked on top"
metadata:
  type: feedback
---

When a change spans several PRs, open PR N, wait for it to merge, then start PR N+1 in a new worktree off the updated `main`. Do not pre-open the whole stack.

**Why:** squash-merge gives `main` a new hash for content the stacked branches carry as separate commits, so every open PR above shows CONFLICTING although the content is identical. It happened twice in a row on one change.

**How to apply:** if the user wants the stack opened anyway, warn first. To repair: `git rebase origin/main`, `git rebase --skip` on already-squashed commits, `git push --force-with-lease`. Recipe: `.claude/rules/git-pr-workflow.md` §7.
