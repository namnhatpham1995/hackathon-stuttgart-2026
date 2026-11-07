# Proposal

## Why

The team has one hackathon day (build 10:00-15:15 Europe/Berlin, submission by 17:15 on
2026-11-07) to turn `docs/exportready-hackathon-working-plan.md` into a working ExportReady demo:
a supplier submits documents for a buyer's five requirements and gets a source-cited evidence
report, then fixes the wrong-revision finding by replacing one file. The starter repo only has
sign-in, Drizzle and Postgres. The work must be split so many AI workers (the [D], [O-x] and Cursor
agents) can build it at the same time without merge conflicts, and the owner needs one live page
showing what is done, in progress, blocked or late. Everything merges straight to `main`, which is
also production, so the plan has to keep every merge point green.

## What Changes

- **Hackathon-mode workflow** for this change only: no planner step, one independent review only on
  the critical groups, merge on a green local pre-push hook without waiting for GitHub CI, a lean
  test set (6 fast tests in `pnpm verify`, 2 live "golden" tests run by hand), a claim protocol
  (fixed branch per group, draft PR on the first push) and push after every ticked task so progress
  is visible. Normal rules return after submission.
- **Live roadmap page**: a separate static page on Vercel that reads this change's `tasks.md` from
  `main` and from every open PR, and shows milestones, waves, groups, progress, blockers and PR
  links, refreshing itself. Ticking a task and pushing *is* the roadmap update.
- **Assessment contract first**: one PR fixes the database schema (one migration), dependencies,
  environment variables, shared types and stub service signatures, so every later lane owns its own
  files and never edits a shared one.
- **ExportReady product**, built in parallel lanes on that contract:
  - fictional demo fixture PDFs and an answer key,
  - PDF text extraction with page boundaries,
  - Gemini structured extraction of observed values and exact quotes,
  - deterministic rules (expiry, part/revision match) and citation validation,
  - a private product workspace with upload, finalise and replace,
  - assessment jobs with idempotent start, real stage status and per-user access,
  - Brevo completion email after the result is stored,
  - a text assistant that drives the same services through Gemini function calling,
  - optional ElevenLabs spoken replies, time-boxed and cut first.
- **Production deploy from `main`**: a Vercel project for the app with managed Postgres; migrations
  run only on production builds.

## Capabilities

### New Capabilities

- `live-roadmap`: a public, read-only progress page built from the change's task list on `main` and
  open pull requests.
- `evidence-assessment`: turns an active document set and a buyer requirement set into per-requirement
  findings (DOCUMENTED, MISSING, MISMATCH, EXPIRED, NEEDS_REVIEW) with validated source citations.
- `supplier-workspace`: a signed-in user's private product draft, document uploads, finalised upload
  batches, document replacement and the evidence report view.
- `assessment-jobs`: the job lifecycle from finalised batch to stored result: idempotent start, real
  stage status, failure states and owner-only access.
- `completion-email`: one transactional email per completed job to the user's account address,
  sent after the result is stored and never blocking the report.
- `workspace-assistant`: a text assistant that performs only approved workspace actions for the
  signed-in user and reports their actual outcome.

### Modified Capabilities

None. `openspec/specs/` is empty.

## Impact

- **New code**: `src/lib/assessment/`, `src/lib/documents/`, `src/lib/jobs/`, `src/lib/notify/`,
  `src/lib/agent/`, `src/app/workspace/`, `src/components/workspace/`, `src/components/assistant/`,
  `src/app/api/jobs/`, `src/app/api/assistant/`, `fixtures/exportready/`, `roadmap/`.
- **Schema**: six new tables and one migration (see design.md). `src/proxy.ts` also guards
  `/workspace`.
- **Dependencies**: `@google/genai` (Gemini), `unpdf` (PDF text). Brevo and ElevenLabs are called
  over `fetch`, with no SDK.
- **Environment**: `GEMINI_API_KEY`, `GEMINI_MODEL`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`,
  `APP_BASE_URL`, optional `ELEVENLABS_API_KEY`; the roadmap project has its own `GITHUB_TOKEN`.
- **Process**: `.claude/rules/hackathon-mode.md` overrides parts of the git, review and task-handoff
  rules until submission.
- **Infrastructure the owner sets up**: two Vercel projects (app and roadmap), a managed Postgres
  database, a Brevo sender, a Gemini API key, a read-only GitHub token.
