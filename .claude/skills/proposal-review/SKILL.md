---
name: proposal-review
description: Review one OpenSpec change before its code is written - run three fresh proposal-reviewer agents in parallel (critic, readiness, codebase), check every code claim they make, and write the merged result to the change's review.md in three sections (owner decisions, plan defects, rejected). Reports only; never edits the change's other artifacts or any code. Use when the user says "proposal-review", asks for a review of a proposal or change before implementation, or after openspec-propose. The full-feature-develop skill runs it before it plans a change's first group.
argument-hint: "<change name> [again]"
---

Judge a change while it is still cheap to change. Three fresh `proposal-reviewer` subagents read it, each in one role, so the judgment comes from contexts that never saw how the change was written. You run them, check what they claim against the code, and write one file. You do not answer the owner's questions, do not edit `proposal.md`, `design.md`, `specs/` or `tasks.md`, and write no code: folding the result into the change is `openspec-update-change`'s job, after the owner has answered.

Read `CLAUDE.md`, `.claude/rules/token-efficient-execution.md` and `.claude/rules/review-audit-self-decision.md` first. `orchestration-protocol.md` applies to the three delegations: the agent's definition carries the roles, limits and status format, so each prompt carries only the inputs below.

## Request

`$ARGUMENTS` names the change (`add-team-invites`; skip `archive/`). Review it as it stands in the current worktree, so an unmerged proposal on its own branch can be reviewed before its PR. Run it once per change: when `openspec/changes/<change>/review.md` already exists, stop and give its path, unless the request says `again`, which overwrites it.

## 1. Preflight

1. Find the change folder; it must hold `proposal.md` and `tasks.md`. Run `openspec validate <change> --strict`; if it fails, stop and report the errors: a change that does not validate is not ready for review.
2. Choose the run id once: the start time as `YYYYMMDD-HHMMSS` plus four random characters. The role reports go to `<git-common-dir>/agent-runs/<run-id>-proposal-<role>.md` (`git rev-parse --git-common-dir`), never into a tracked file.

## 2. The three roles, in parallel

Start three `proposal-reviewer` subagents in one message, one per role: `critic`, `readiness`, `codebase`. Each prompt gives the role, the worktree path, the change folder and that role's report file, and nothing else: not your view of the change, not what the author said about it. They only read, so they may run side by side. Wait for their completion notices; do not poll them.

If this session has no `proposal-reviewer` agent type (it started before the agent was added, or the tool is Cursor or Gemini CLI), start each role as `.claude/rules/multi-tool-agents.md` describes, telling it to read `.claude/agents/proposal-reviewer.md` and act as it describes in the given role; without subagents, run the three one after another. An agent that returns `NEEDS_CONTEXT` gets the missing input once. If a role fails or returns `BLOCKED` twice, write the merged file from the other roles and name the missing role at its top; never review the change yourself in its place.

## 3. Merge and check

Read the three report files. Then:

1. Dedupe: findings with the same root cause become one entry that keeps every id (`C-2, K-4`) and the strongest evidence.
2. Check each claim about the code before keeping it: open the `path:line` it names (for code on an open change, `git show origin/<branch>:<path>`) and confirm it says what the finding says. A claim the code contradicts, or that names nothing you can find, is rejected with what you found. Do not reject a `PLAUSIBLE` finding only because reading did not prove it: keep it and mark it `PLAUSIBLE`.
3. Check each `owner-decision` against the artifacts: one that `proposal.md`, `design.md` or the specs already decide is rejected with the quote. One that the code or the repository's rules settle is a `plan-defect`, not an owner decision.
4. Reject findings that are only wording, formatting or document hygiene, and findings outside the change's scope, each with a one-line reason.

## 4. Write review.md

Write `openspec/changes/<change>/review.md` (OpenSpec ignores extra files in a change folder and archives them with it):

```markdown
# Proposal review

<date>, `git rev-parse --short HEAD`, roles run: critic, readiness, codebase (name any missing role)

## Owner decisions

### D1. <the question, one line> (<ids>)
Where the change stops: <file and heading, short quote>. Why it matters: <what happens to whom if left open>.
Options: <a>, <b>. Conservative default: <one>.

## Plan defects

### P1. <one line> (<ids>, <severity>, CONFIRMED|PLAUSIBLE)
<file and heading or task>: <what is wrong>. Evidence: `<path:line>`. Fix: <the edit to the change>.

## Rejected

- <ids>: <one line why, with the evidence>.
```

Order each section by severity. An empty section says "None." Keep the role reports' wording only where it is already short; no summary of the change and no praise.

## 5. Report

Say where `review.md` is, how many owner decisions and plan defects it holds, and list the owner decisions by their one-line question. Do not commit unless the skill that started you says to: the session that owns the change's branch commits `review.md` with the change. The next step is the owner's: answer the decisions, then `openspec-update-change` folds the answers and the plan defects into the change, and adds an `Answered: <answer>` line under each decision in `review.md` as it folds it. A decision without that line is still open.
