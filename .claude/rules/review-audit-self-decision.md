# Review, Audit, and Decision Rules

Use this file when reviewing code, applying audit feedback, or cutting scope.

## Verified Decisions

Once a decision is verified by source, tests, or an empirical check, do not reverse it because an audit raises an abstract concern. Reverse only when the audit adds new evidence or the context changed.

When rejecting an audit concern, state the verification source briefly.

## User Decisions

Do not silently undo explicit user decisions. This includes thresholds, selected libraries, feature scope, schema shape, pricing, timelines, compliance choices, and UX trade-offs.

If an audit suggests reversing a user decision, present:

- the original decision
- the audit concern
- the trade-off
- the concrete options

Then wait for the user.

## Threat Model

Before applying a security or robustness finding, identify what the code actually stores, protects, or exposes. Fix real failure modes. Document non-issues briefly. Ask when the risk is plausible but depends on product intent.

## Scout First

For questions answerable by reading the repo, scout before asking. Ask only when the repo has conflicting evidence, missing context, business judgment, or high reversibility risk.

## Proposals Before Implementation

Review an OpenSpec change once, before its first task group is planned, with the `proposal-review` skill: three fresh `proposal-reviewer` agents on the top tier (critic, readiness, codebase) whose code claims are checked before they are kept. Run it after `openspec-propose`, and `full-feature-develop` runs it itself when it reaches a change's first group. The result is the change's `review.md`:

- Owner decisions are the owner's. An agent never answers one, and a logged conservative default does not settle it; the work stops until the owner (or whoever the owner named to decide, see `docs/multi-controller-setup.md`) answers.
- Plan defects are folded into the change with `openspec-update-change` before planning.
- A rejected finding states its evidence, as any rejected audit concern does.

## Tests in a Review

When the diff adds or changes tests, have them reviewed in a fresh context on the top tier with the `test-fidelity-review` skill and treat its blocking findings like any other review finding: in `full-feature-develop` the `independent-pr-reviewer` agent does it as part of its review, elsewhere a fresh agent on the top tier that follows the skill (`multi-tool-agents.md`). Never run that review in the session that wrote the tests (`.claude/rules/CLAUDE.md`, "Models"). Rules: `docs/code-standards.md`, "Test quality".

## Stable Code Artifacts

Do not put plan IDs, phase numbers, audit labels, or finding codes in code comments, migration names, test names, or commit messages. Explain the invariant or behavior directly.
