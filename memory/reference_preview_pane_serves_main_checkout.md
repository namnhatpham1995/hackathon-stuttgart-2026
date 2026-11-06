---
name: reference-preview-pane-serves-main-checkout
description: "In the desktop app, preview_start runs the MAIN checkout's .claude/launch.json, so it cannot serve a worktree's code; how to check a branch in the browser pane"
metadata:
  type: reference
---

In a worktree session, `preview_start {name: "dev"}` still starts the dev server from the main checkout, and a config added to the worktree's `.claude/launch.json` is not found. The pane then shows `main`, not the branch.

**How to apply:**
- Use it for the "before" picture (main), then `preview_stop`.
- For the branch: run `pnpm dev` from the worktree in the background (its port is `3000 + 10N`, in the worktree's `.env`), open it with `preview_start {url: "http://localhost:<port>"}`, and stop it afterwards, including any leftover `next … start-server` process, so the port is free.
- Do not edit the main checkout's `launch.json` for this.
- `git checkout -- <file>` to undo a break-the-code test also throws away your own uncommitted edits to that file: copy it aside first.
