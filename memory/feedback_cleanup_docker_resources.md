---
name: feedback-cleanup-docker-resources
description: "Cleaning up finished work includes its Docker leftovers: per-worktree databases (dev, test, ux), containers, images, build cache, finished ux-review run folders; never the shared data volume"
metadata:
  type: feedback
---

A cleanup after a merge is not done until the Docker resources the work created are gone, not only the worktree and branch.

**Why:** Docker keeps its data in one virtual disk. On Windows that is `%LOCALAPPDATA%\Docker\wsl\disk\docker_data.vhdx`, which grows and never shrinks on its own. Leftover per-worktree databases, ad hoc containers, images and build cache filled the drive, partly because `pnpm worktree remove` printed a `dropdb` error that everyone treated as harmless.

**How to apply:**
- Stop a `/ux-review` target first (`pnpm ux-review:stop` in its worktree); `pnpm worktree remove` refuses while one was not stopped.
- After `pnpm worktree remove`, list the `hackathon_wt%` databases (dev, `_test`, `_ux`) and drop those whose worktree is gone, plus `hackathon_ux` when no run is up in the main checkout (commands in `.claude/rules/git-pr-workflow.md` §3).
- Delete finished `/ux-review` run folders in `.git/agent-runs/ux-review/` by exact path once their findings are filed.
- Remove containers, images, networks and build cache the work started (`docker system df`, `docker ps -a`, `docker image prune -f`, `docker builder prune -f`) and stop leftover dev or test servers.
- Never remove this project's PostgreSQL data volume or container, or another project's resources.
- Compacting the Windows vhdx needs `wsl --shutdown`, which kills every running push: only with the owner's OK and when no hook runs.
- Tell every controller when this rule changes. Related: [[feedback-verify-before-merge]].
