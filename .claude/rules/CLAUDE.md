# Shared workflow index

These repository-owned rules apply to every coding agent. Read the files relevant to the task;
reuse instructions already available in the current context unless they change.

## Workflows

- Token-efficient execution (every task): `./.claude/rules/token-efficient-execution.md`
- Primary workflow: `./.claude/rules/primary-workflow.md`
- Git and PR workflow: `./.claude/rules/git-pr-workflow.md`
- Development rules: `./.claude/rules/development-rules.md`
- Documentation management: `./.claude/rules/documentation-management.md`
- Task progress handoff: `./.claude/rules/task-progress-handoff.md`
- Review and audit decisions: `./.claude/rules/review-audit-self-decision.md`
- Orchestration protocol (only when delegating): `./.claude/rules/orchestration-protocol.md`

## Skills in this repo

- OpenSpec (`/opsx:propose`, `/opsx:apply`, `/opsx:archive`, `/opsx:explore`, `/opsx:update`,
  `/opsx:sync`): plan every feature as a change under `openspec/changes/` before building it.
- `full-feature-develop`: one OpenSpec task group from plan to a reviewed PR, with the
  `task-group-planner` and `independent-pr-reviewer` subagents.
- `test-fidelity-review`: finds tests that would still pass if the code were wrong.
- `impeccable`: all UI work (design, critique, polish, audit). It reads `PRODUCT.md` and
  `DESIGN.md` at the root: create them with `/impeccable init` before the first UI task and keep
  them current.
- `ui-ux-pro-max`: searchable UI/UX data (styles, palettes, font pairings, UX guidelines, stack
  notes) to consult while designing or reviewing an interface.
- `proposal-review`: three `proposal-reviewer` agents (critic, readiness, codebase) review an
  OpenSpec change once, before its first group is planned.
- `ux-review`: audits the running app like real users at three widths in light and dark, against a
  local production build with synthetic data, and writes a prioritized `UX_AUDIT.md`. Its target is
  `pnpm ux-review:serve` (a production build on port 3005 + 10N over a throwaway `_ux` database with
  synthetic personas), stopped with `pnpm ux-review:stop`.

How to build good UI and keep the app safe: [`docs/ui-ux-guide.md`](../../docs/ui-ux-guide.md) and
[`docs/security-guide.md`](../../docs/security-guide.md). Running several machines and sessions
under one main controller: [`docs/multi-controller-setup.md`](../../docs/multi-controller-setup.md).

## Models

Planning and judging run on a stronger model than the one that writes the code, so no session grades
its own work. Where a tool lets you choose the model, use:

- Proposal review (`proposal-reviewer` in three roles, started by the `proposal-review` skill once
  per change, before its first group is planned): Opus.
- Planning (`task-group-planner`): Opus.
- Independent PR review, including the test fidelity review of the tests the PR adds or changes
  (`independent-pr-reviewer`, which follows the `test-fidelity-review` skill for them): Opus.
- Implementation (code, fixes, commits, pushes) in the worker session: Sonnet.

The Opus roles are agents in `.claude/agents/` whose `model: opus` the harness honours, so a Sonnet
session that starts them gets Opus.

## Commits and PRs

Use the `agents:` prefix, with no scope, for commit messages and PR titles when changing
`.claude/` files. Do not use `chore:` or `docs:` for those changes. Follow the Git and PR
workflow for branches, worktrees, verification and publication.

## Tool permissions

Respect tool permission and privacy blocks. Obtain any required user approval before retrying;
do not work around a block or assume an unavailable tool exists.
