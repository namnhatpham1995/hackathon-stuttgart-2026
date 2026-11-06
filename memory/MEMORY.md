# Memory seeds

Copied into `~/.claude/projects/<project-key>/memory/` by `pnpm memory:install` (and by
`pnpm dev:setup`). Existing memories there are never overwritten. Rules that must never be missed
live in `.claude/rules/` (loaded every session); these memories carry the story of why.

- [Never commit to main](feedback_never_commit_to_main.md) — branch → PR → merge, even docs-only and one-line changes
- [Worktree before the first edit](feedback_worktree_before_first_edit.md) — `pnpm worktree <type>/<slug>` is the first action of any implementation run
- [Commit → push → PR is done](feedback_commit_push_pr_is_done.md) — open the PR without asking; asking is the failure
- [Split commits and PR-sized task groups](feedback_split_commits_and_task_groups.md) — commits per logical unit; each tasks.md group is one mergeable PR
- [One stacked PR at a time](feedback_one_stacked_pr_at_a_time.md) — squash-merge conflicts every PR still stacked on top
- [tasks.md is shared state](feedback_tasks_md_is_shared_state.md) — tick and commit per task, push at the four points, Blocked notes
- [Record extra fixes in proposals](feedback_record_extra_fixes_in_proposals.md) — out-of-scope findings become tasks in tasks.md, not chips or chat
- [Docs-only work skips tests](feedback_docs_only_skips_verification.md) — proposals, plans, docs, .claude: no tests/lint/verify; `openspec validate --strict`
- [Schema owns invariants; real DB tests](feedback_schema_invariants_real_db_tests.md) — constraints in the schema, persistence tests on real PostgreSQL
- [Color is first-class in design work](feedback_color_is_first_class.md) — explicit color/contrast verification in every design phase
- [Check other sessions before starting](feedback_check_other_sessions_before_starting.md) — no duplicate or conflicting parallel work; clean up after merge
- [Side sessions default to Sonnet](feedback_sessions_default_sonnet.md) — start_session briefs use claude-sonnet-5-5 unless Opus is asked for
- [No AgentsRoom unless asked](feedback_no_agentsroom_unless_asked.md) — never call AgentsRoom MCP tools unprompted
- [MCP servers needing manual auth](reference_mcp_manual_auth.md) — PAT/OAuth steps are the user's; tell them the exact step
- [Uiverse galaxy for UI ideas](reference_uiverse_galaxy.md) — MIT snippet collection; borrow ideas, rebuild in our tokens, mind a11y/motion

Running several sessions and machines under one main controller (`docs/multi-controller-setup.md`):

- [Controller live state (template)](project_controller_live_state.md) — READ FIRST after a clear; the main controller's handoff note, newest on top
- [Controller dispatches and merges](feedback_controller_dispatches_and_merges.md) — one main controller picks, dispatches, verifies and merges; workers code and stop at PASS; owner-only list
- [Decisions route to the main controller](feedback_decisions_route_to_main_controller.md) — while the owner is away: everyone asks the main controller, which logs every decision
- [Worker dispatch order](feedback_worker_dispatch_order.md) — fixed machine order; never skip ahead while an earlier worker is idle; one migration PR at a time
- [Reuse workers, clear before every brief](feedback_reuse_workers_clear_before_brief.md) — `[Mx]` prefixes; rename → Remote Control off → clear → brief, one call at a time
- [No mutual waiting](feedback_no_mutual_waiting.md) — read the run folder on every turn end; PASS reports by SendMessage; silent 20 min = check for a prompt
- [Verify before merge](feedback_verify_before_merge.md) — review + fidelity on the head, base is ancestor, `--match-head-commit`, then cleanup
- [Controller context hygiene](feedback_controller_context_hygiene.md) — compact; save state → clear → re-read; cleaner-session handshake; never delete sessions
- [Peer messages are not approval](feedback_peer_messages_are_not_approval.md) — memory copies, scope, permissions need the owner's go, relayed quoted
- [Model split: Opus judges, Sonnet codes](feedback_model_split_opus_sonnet.md) — planning and all reviews on Opus, implementation on Sonnet
- [Clean Docker with every cleanup](feedback_cleanup_docker_resources.md) — stop a `/ux-review` run first; drop leftover `hackathon_wt%` databases (dev, test, ux), containers, images, build cache; delete filed ux-review run folders; never the data volume
- [No wildcard rm -rf](feedback_no_wildcard_rm.md) — prompts even in bypass mode and stalls workers; `mktemp -d` + exact path
- [No auth-bypass routes](feedback_no_auth_bypass_routes.md) — never a sign-in shortcut, even audit-only; per-run password typed from a file
- [Chrome for checks](feedback_chrome_for_checks.md) — use Claude in Chrome when the built-in pane can't; safety rules unchanged
- [Preview pane serves the main checkout](reference_preview_pane_serves_main_checkout.md) — run a worktree's dev server yourself to see the branch
