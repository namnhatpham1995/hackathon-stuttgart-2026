# Gemini CLI instructions

Gemini CLI follows the same rules as every other agent in this repository. Read these before any
task; they win over your defaults:

- [`AGENTS.md`](AGENTS.md): where everything lives, for every tool
- [`CLAUDE.md`](CLAUDE.md): project guide, layout, commands and the required engineering rules
- [`.claude/rules/CLAUDE.md`](.claude/rules/CLAUDE.md): the workflow rules index, above all
  `git-pr-workflow.md` (never commit to `main`; one worktree per branch via `pnpm worktree`;
  commit → push → PR is done)
- [`.claude/rules/multi-tool-agents.md`](.claude/rules/multi-tool-agents.md): the Pro model, not
  Flash; how to start the review roles from Gemini CLI

Skills are in `.gemini/skills/` and `.agents/skills/` (`full-feature-develop`, `proposal-review`,
`test-fidelity-review` point to their single copy in `.claude/skills/`). OpenSpec commands:
`/opsx:propose`, `/opsx:apply`, `/opsx:archive`, `/opsx:explore`, `/opsx:update`, `/opsx:sync`.

@./AGENTS.md
@./CLAUDE.md
