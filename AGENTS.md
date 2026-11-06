# Agent instructions

Every coding agent (Claude Code, Codex, Cursor, Copilot, …) follows the same rules here. They live
in one place so they never drift:

- Project guide, layout, commands and engineering rules: [`CLAUDE.md`](CLAUDE.md)
- Workflow rules, loaded for every task: [`.claude/rules/`](.claude/rules/CLAUDE.md), above all
  [`git-pr-workflow.md`](.claude/rules/git-pr-workflow.md) (never commit to `main`; one worktree per
  branch via `pnpm worktree`; commit → push → PR is done)
- Test quality: [`docs/code-standards.md`](docs/code-standards.md)
- UI and UX: [`docs/ui-ux-guide.md`](docs/ui-ux-guide.md); security: [`docs/security-guide.md`](docs/security-guide.md)
- Several sessions or machines at once: [`docs/multi-controller-setup.md`](docs/multi-controller-setup.md)
- Product and design context for UI work: `PRODUCT.md` and `DESIGN.md` at the root, written by the
  impeccable skill (`/impeccable init`, then `/impeccable document` once a look is built)

Plan features as OpenSpec changes (`openspec/changes/`); the OpenSpec skills for Codex are in
`.agents/skills/`, for Claude Code in `.claude/skills/`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
