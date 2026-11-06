---
name: feedback-verify-before-merge
description: "Verify a worker's PASS yourself before merging: review report, fidelity, head sha, up to date with main, merge with --match-head-commit"
metadata:
  type: feedback
---

A worker's PASS report is a claim, not proof. Before merging, the controller checks:
- the latest `review-N.md` says PASS and a test-fidelity result exists for the head (and which model ran it: Opus);
- the PR head on GitHub equals the reviewed full sha, or the later commits are tests-only;
- the branch contains the current base: `git fetch && git merge-base --is-ancestor origin/main <head>`; never claim "no newer commit" from a remembered sha;
- mergeable, and `gh pr checks` has nothing that ran and failed.

Then `gh pr merge <n> --squash --match-head-commit <sha>`, and ask the worker to clean up: worktree removed, branch deleted only after its tip equals the merged PR head, Docker leftovers dropped ([[feedback-cleanup-docker-resources]]).

**Why:** a worker once reported a stale head while another commit was still in its hook, and two PRs that both edited translation files merged against an old base. `--match-head-commit` refuses a merge if anything was pushed after you looked.

**How to apply:** relay or merge only what you verified. When two open PRs touch the same files, the second re-merges `main` and re-runs its hook after the first merges. Related: [[feedback-no-mutual-waiting]].
