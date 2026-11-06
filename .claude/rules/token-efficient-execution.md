# Token-efficient execution

Use this file for every task, including reviews and documentation-only work.

## Long-running jobs

- Prefer runtime-managed waiting or completion notifications that do not invoke the model again. Use only capabilities explicitly supported by the available tools; ending a reply does not guarantee automatic resumption.
- While a job runs, do useful independent work. A background loop does not save model tokens if an outer wait tool is repeatedly called.
- Allow at most two consecutive model-driven status checks per job without an actionable change: completion, failure, required input, or evidence of a stall needing diagnosis.
- Count all status checks together: sleep, write_stdin, functions.wait, process inspection, status APIs, and log reads. Elapsed time, routine log growth, completed-test counts, and changing tools do not reset the budget.
- At the limit, use a supported completion notification or do independent work without further checks. If neither is available, report the job as pending with its identifier and log location, and explain that manual continuation is required. Never claim success prematurely.
- Preserve the job identifier, log location, and check count across handoffs and continuations. After the limit, resume checks only for an actionable event or an explicit user request; do not restart jobs to reset the budget.

## Logs and context

- Keep verbose logs on disk. Return the exit status, a compact result summary, and relevant failures. Do not repeatedly reread unchanged output.
- Read required instructions once per applicable scope unless they change or are unavailable in the current context. Load only relevant rules and skill references.
- Prefer targeted searches, relevant file sections, and compact diffs over repeated whole-file reads. At a natural handoff, carry a short summary of the branch, findings, completed checks, and pending jobs.

## Verification

- Run focused checks during implementation. Consolidate full verification when project rules allow; rerun for relevant changes, failures, or unresolved risks.
- Preserve mandatory verification and push hooks. Never skip required checks or bypass hooks to save tokens.
