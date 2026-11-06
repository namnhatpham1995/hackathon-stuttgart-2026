---
name: full-feature-develop
description: Run the whole delivery loop for one OpenSpec task group - pick the group, review the change once with the proposal-review skill before its first group, have the task-group-planner subagent plan it on Opus, implement it in the main session, open the PR into main, have the independent-pr-reviewer subagent review its code and tests on Opus, fix findings, and repeat review and fix up to 3 times (stopping early as soon as a review passes), then stop with the PR open and unmerged for the user's own review. Use when the user says "full-feature-develop", asks to take a change or the next tasks all the way to a reviewed PR, or names a change ("work add-team-invites", "continue next tasks", "review PR 12").
argument-hint: "<change name> [group <n>] | next | PR <number>"
---

Take ONE OpenSpec task group from proposal to a reviewed, CI-green PR against `main`, then stop. You implement in this session, on Sonnet. Two steps are delegated, each to one subagent that runs on Opus (the agents' definitions set `model: opus`): the plan (phase 2), so it is made on a stronger model than the one that implements, and the review (phase 4), so the code and its tests are judged by a session that did not write them. Before a change's first group, the `proposal-review` skill also runs its three `proposal-reviewer` subagents on Opus (phase 2), so the change is judged before any code exists. Spawn no other subagent and do not run `opencode` or any other external worker: subagents start cold and burn tokens re-reading context you already hold.

Read `CLAUDE.md` and the applicable rules in `.claude/rules/` first (`token-efficient-execution.md`, `git-pr-workflow.md`, `task-progress-handoff.md`, `development-rules.md`, `documentation-management.md`). They always win over this file. `orchestration-protocol.md` applies to the two delegations: the agents' definitions already carry the task, the constraints, the acceptance criteria and the status format it asks for, so each prompt carries only the inputs named in its phase.

## Request

`$ARGUMENTS` says what to do:
- a change name (`add-team-invites`), optionally with `group <n>`: work that change;
- `next` or empty: continue with the change of the most recent `feat/<change>` PR or branch (`git log origin/main`, `gh pr list --state all --limit 20`), else the oldest active change under `openspec/changes/` (skip `archive/`);
- `PR <number>`: skip to phase 4 (review and fix) for that PR.

## Ground rules

- Never merge a PR, never approve it on GitHub, never commit or push to `main`, never use `--no-verify`, never force-push, never put AI or assistant attribution in commits or PR text.
- Do not ask the user questions during the run. When a choice is open, take the most conservative option that follows the repo rules and the OpenSpec change, and append one line to `<git-common-dir>/agent-runs/<run-id>-decisions.md` (get the folder with `git rev-parse --git-common-dir`; `<run-id>` is this run's start time as `YYYYMMDD-HHMMSS` plus four random characters, chosen once at the start and kept for the whole run, so parallel runs never share a file and the log survives the removal of your worktree): `- <ISO time> | <phase> | <change or PR> | QUESTION: ... | CHOSE: ... | WHY: ...`. Start the run with a `## run <ISO time> | request: <arguments>` line. List these choices in the final report.
- Tests that touch persistence use real PostgreSQL (`pnpm db:up`) and each worktree has its own databases and dev port (`git-pr-workflow.md` section 2), so runs in other worktrees do not matter. Inside your worktree, run one test command at a time: never start `pnpm verify` or a push while another test process of yours runs, never run tests in the background. The pre-push hook runs `pnpm verify`, so a push counts as a test run.
- Docs-only groups (proposals, plans, `docs/`, `.claude/`, root Markdown) need no tests; validate OpenSpec changes with `openspec validate <change> --strict` instead.
- Keep token use down: read only the files the group touches, use Grep/Glob instead of broad reads, read big files by range, and do not re-read a file you just edited.
- Each subagent writes its full output to a file under `<git-common-dir>/agent-runs/` and returns a few lines: read that file, never the agent's transcript. Start it in the foreground when the Agent tool lets you choose. If it runs in the background, wait for its one completion notice and do not poll it.
- Agent definitions load when a session starts. If this session has no `task-group-planner` agent type, or the planner fails or returns `BLOCKED`, write the plan yourself as its definition (`.claude/agents/task-group-planner.md`) describes and log that. If it has no `independent-pr-reviewer` agent type, or the reviewer fails or returns `BLOCKED`, stop at phase 4 with the PR open and report it: never review your own PR instead. Never run the `test-fidelity-review` skill yourself on a PR: it would run on the model that wrote the tests. An agent that returns `NEEDS_CONTEXT` gets the missing input once before these rules apply.

## Phase 0 - Preflight

1. `git fetch --prune origin`. Read `git status`, `git branch -vv`, `git worktree list`, `git stash list`.
2. Always work in a worktree of your own, never in the main checkout (`git-pr-workflow.md` section 2). If the main checkout is clean and on `main`, run section 0 there first: `git pull --ff-only origin main`, then clean up every merged worktree and branch, whoever created it. The session that opens a PR stops before it merges, so nobody else will. A branch is merged when it is `[gone]`, its worktree has no uncommitted changes and its tip equals the head of its merged PR (`gh pr list --head <branch> --state merged --json headRefOid`). For each one run `pnpm worktree remove <branch>` from the main checkout, then `git branch -D <branch>`. If the main checkout holds uncommitted work or sits on another branch, leave it exactly as it is and skip the cleanup.
3. Any other worktree or branch (not `[gone]`, ahead of its remote, dirty, or with no merged PR at that tip) may belong to a session that is still running: do not touch it, only report it. Stashes are reported, never dropped. If this session already runs inside a linked worktree that `pnpm worktree` made, use that one.

## Phase 1 - Pick the group

Read `tasks.md` from the merged state (`git show origin/main:openspec/changes/<change>/tasks.md`). Take the first top-level group with unticked tasks, unless the request names one. It is eligible only if:
- the prerequisites named in `tasks.md` and `proposal.md` (for example "start after add-teams has merged") are merged into `origin/main`;
- it is not already on an open PR or a remote branch of this change that works on it, of any type (`feat/`, `fix/`, `docs/`, `chore/`, `refactor/` + `<change>`) (`gh pr list --base main --state open`, `git branch -r`). A branch works on the groups whose tasks it has ticked (`git show origin/<branch>:openspec/changes/<change>/tasks.md`); when its group cannot be told, count every unticked group of the change as taken. A group that depends on a PR that is open but not merged is not eligible.

If an open PR for the group already exists and is unreviewed, go straight to phase 4 with it. If nothing is eligible, stop and report what is blocked and why.

## Phase 2 - Plan (the `task-group-planner` subagent, on Opus)

Read the change's `proposal.md` and the group's tasks yourself, enough to name the branch `<type>/<change>`. Create the branch and its worktree now with `pnpm worktree <type>/<change>` (it cuts the branch from the freshly fetched `origin/main`, or checks out the existing branch when resuming; a session that already runs inside a linked worktree keeps that one, as phase 0 says), so the plan is made against the tree you will change. Leave `design.md`, `specs/` and the code to the planner: you open them by the symbols and ranges the plan names when you implement.

Before the change's first group (no task of the change ticked on `origin/main`), review the change once: when the change folder in the worktree has no `review.md`, run the `proposal-review` skill on it in the worktree. Never on a later group. Then:
- An owner decision in `review.md` without an `Answered:` line is not yours to settle, and logging a conservative choice does not settle it. Commit `review.md` on the group's branch, push, open no PR, and stop: report the open decisions, the branch and the worktree path. The run resumes on that branch once the owner has answered and `openspec-update-change` has folded the answers into the change.
- With no open decision, fold each plan defect into the change with `openspec-update-change` and log each one; a defect you cannot fold without the owner's answer is an open decision, so stop as above. Run `openspec validate <change> --strict` and commit the change's artifacts together with `review.md` as the group's first commit, before the planner starts.

Start one `task-group-planner` subagent. Its prompt gives the worktree path, the change folder, the group, the tasks already ticked when resuming, and the plan file `<git-common-dir>/agent-runs/<run-id>-task-plan.md` (next to this run's decision log; never a tracked file). What the plan must name is in the agent's definition: every task with its files and line ranges, the narrowest test command per task, the commit split, whether the group is docs-only, whether ticking completes the change (then archive it in the same PR with `openspec-archive-change`, unless the change forbids it yet), the traps, and the disagreements it found.

Read the plan file. For each entry under `Disagreements`, take the conservative reading and log it. The proposal and the code win over the plan and over any earlier note: when a step of the plan turns out wrong while you implement, follow them and log it.

## Phase 3 - Implement and open the PR (you)

Run every later command from the worktree made in phase 2, `.claude/worktrees/<type>-<change>`, and edit no file outside it. Implement only the planned group. Per `task-progress-handoff.md`: tick each task in `tasks.md` as soon as it works and its own narrow test passes, and commit it together with that task's work. Do not push after every task: push when the group's first task is committed (so phase 1 on another computer sees the group's branch and skips it), when the group's last task is done (before opening the PR), after each review fix round (phase 5), and before stopping for any other reason, so no commit is left only on this computer. Archive the change in the same PR when the last task is ticked. Run the planned tests one at a time; fix the cause of a red test, never weaken or skip tests. If the pre-push hook fails, re-run the failing file once alone; if it still fails, stop and report the error, never bypass it, and name the unpushed commits, the branch and the worktree path in the report.

When the group is done, open the PR yourself (`gh pr create --base main`) with a title in conventional form and a body that says what changed, which tasks it ticks, how it was verified, and notes any CI-skipped check. No attribution lines.

## Phase 4 - Review (the `independent-pr-reviewer` subagent, then you)

When you reach this phase without a worktree for the PR's branch (a `PR <number>` request, or an open PR that phase 1 found), first check the branch out into a worktree of its own (`pnpm worktree <its-branch>`).

Review round `n` (of at most 3):

1. In round 1, start one `independent-pr-reviewer` subagent. Its prompt gives the PR number, the PR's worktree path (it returns `BLOCKED` when `git status --porcelain` lists anything), the change folder, the round and the report file `<git-common-dir>/agent-runs/<run-id>-review-<n>.md`, and nothing else: not your plan, not your summary of the change, not what you think of the code. In later rounds, continue the same reviewer with `SendMessage` (the round, the new report file, the earlier report files); if it can no longer be reached, start a new one with all of round 1's inputs plus the earlier report files. Do not review the PR yourself and do not run the `code-review` skill on it: a review by the session that wrote the code is what this phase exists to avoid. When the PR adds or changes tests, the reviewer breaks code and runs tests in the PR's worktree to judge them, so run it in the foreground and touch nothing in the worktree until it returns; then `git status --porcelain` must be empty again: restore anything it left behind with `git checkout -- <file>` before you go on. The reviewer returns only its verdict, the counts and the report path; the findings are in the report file, which it has also posted as a comment on the PR. Read the report file. Each finding carries the fix the reviewer would make: treat it as advice, and still prove a `PLAUSIBLE` finding before you change code. A `test-fidelity` finding says a test passes with the code wrong: `CONFIRMED` when a break-the-code run showed it or the test has no assertion on the claimed behaviour at all, `PLAUSIBLE` when reading only makes it doubtful, and phase 5 proves it with a break-the-code run. The report's "Strengthen" list is advice for the final report.
2. Read CI: `gh pr checks <n> --watch --interval 30` (wait up to 20 minutes). A check that ran and failed is a finding; read its log with `gh run view <run-id> --log-failed` and find the real cause. A check whose job GitHub never started is an account problem, not a code finding: `gh run view <run-id>` shows the annotation that the job was not started (billing or the spending limit), and `gh run view <run-id> --json jobs` shows that job with no steps. Report it to the user in phase 6; it is not a `CONFIRMED` finding, needs no code change and does not block the pass.
3. Merge the findings into one list. The reviewer's findings keep the label it gave them: `CONFIRMED` (shown by the code and a concrete failing input) or `PLAUSIBLE` (could be real, not verified). A CI check that ran and failed is always `CONFIRMED`; one GitHub never started is not a finding (step 2). Note for each: file, line, what is wrong, the failure scenario, what correct looks like.

Triage:
- `CONFIRMED`, any severity: must be fixed.
- `PLAUSIBLE` on correctness, security, DB constraints, permissions or test fidelity: must be proven or dismissed (phase 5), never changed on a hunch.
- `PLAUSIBLE` on style, naming, scope, tests, "might be slow" or taste: do not change code; reply on the PR with a short note or keep it as advice for the final report.

The review passed when the reviewer's verdict for this round is `PASS` and every check that ran is green (a check GitHub never started does not block the pass, step 2). The verdict is the reviewer's: you do not overrule it, and a finding you dismiss stays open until the reviewer accepts the dismissal in the next round. A passing review ends the loop at once, even on round 1: go to phase 6, and do not run further review rounds just to use up the 3. Otherwise go to phase 5.

## Phase 5 - Fix, then review again (at most 3 review rounds in total, stopping as soon as a review passes)

1. Order the findings and fix them yourself as logical commits, then push once for the round. For a `PLAUSIBLE` finding, first prove the problem with a failing test or a concrete failing input: if it reproduces, fix it and keep that test; if it does not, change no code and reply on the PR with the evidence that the finding is not real. A doubtful `test-fidelity` finding is proven the other way round: break the code under test as the `test-fidelity-review` skill describes, and if the test still passes, strengthen the test until the same run fails; if it fails, reply with that run as the evidence. Reply with proof to any `CONFIRMED` finding you dispute. Every reply names the id of the finding it answers.
2. From the second fix onward, say why the earlier attempt failed and fix the root cause.
3. Back to phase 4 for the next review round. The reviewer checks that each earlier finding is really fixed or its dismissal holds, and looks for regressions.

The third review is the last. In it, a low or medium `CONFIRMED` finding may be accepted with a written rationale on the PR if fixing it is disproportionate; a correctness, security, DB-invariant or failing-check finding may not. Log each acceptance and each dismissal. No later round judges what you accept or dismiss after the third review, so it does not turn a `FAIL` into a pass: stop, leave the PR open, and report every finding the third review left open with what you did about it.

## Extra fixes go into the proposal

Whatever you find outside the group's scope, or leave as advice, is written into the change's `tasks.md` as a new task with a one-line reason and how to verify it, in the group whose PR touches the same code (or the next group that fits), as `task-progress-handoff.md` describes. Do it as a docs-only commit in the PR you are working on (validate with `openspec validate <change> --strict`; no tests). List these tasks in the report.

## Phase 6 - Stop and report

The PR stays open and unmerged. Report plainly: the PR URL; one paragraph on what it does; the reviewer's verdict in each round and the CI result, with any check GitHub never started reported as an account problem rather than a finding; the findings fixed along the way; `PLAUSIBLE` findings that were proven and fixed, dismissed with evidence, or left as advice; dismissals the reviewer rejected; findings accepted in the last review with their rationale; when the PR's changed files (`gh pr diff <number> --name-only`) include `src/**/*.tsx` or `src/**/*.css` and the project has the tooling the `ux-review` skill needs (`scripts/ux-review/`), the recommended follow-up `/ux-review pr <number>`, with its reason (it walks the changed pages as the person who uses each one would, at three widths, and checks that every change of data is still true after a reload; it takes minutes of work and real tokens, so the user decides); any branch, stash or worktree you left behind and where it is; and the decisions logged this run (the lines after the last `## run` marker). The follow-up is only named: this skill does not run it, starts no agent for it and asks no question. Do not offer to merge; the user reviews and merges.

## Resuming

If a previous run died, resume instead of restarting: an existing branch or open PR for the group is continued from where its `tasks.md` ticks stop, never recreated. A branch of the change with no ticked task whose commits only add `review.md` and fold its answers is a run that stopped in phase 2 for the owner: continue it there once every decision in `review.md` has its `Answered:` line, and report it as still waiting otherwise. The report files live on the computer that ran the review: when one is missing, read the latest PR comment that starts with `## Independent review` instead, which holds the same text.
