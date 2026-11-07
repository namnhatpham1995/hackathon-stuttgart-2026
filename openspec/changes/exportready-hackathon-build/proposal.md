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
- **From the passport idea** (`docs/exportready-passport-idea.md`), kept inside the plan's limits:
  - readiness dimensions (Quality, Product and material, Traceability, Packaging and logistics) as
    labels that group requirements, with documented and open counts per dimension and no score,
  - a supplier profile at onboarding (company, country, product category, capabilities, target
    market), shown as declared by the supplier and never treated as evidence,
  - an improvement action plan on the report, plus a copyable document-request draft built from the
    unresolved findings,
  - submission content: a 6-slide deck, tagline, business model, README with screenshots, demo URL
    and team contributions, and customer-discovery notes.
- **Buyer-supplier connections**, two-sided, for the demo:
  - buyers post sourcing requests on a board,
  - suppliers list products in a directory that shows only the declared profile,
  - either side starts contact (a supplier responds, or a buyer asks a listed supplier for evidence),
  - the supplier answers with a new or existing product and shares one result with that one buyer,
  - each side is notified in an in-app inbox and by email to their own account address,
  - a buyer workspace at `/buyer` follows the buyer's own requests and their suppliers, and searches
    listed products by text, category and country. It is built as a backend group and a pages group
    that run in parallel against a stub contract already on `main`.
- **Kept out from the idea**: numeric readiness scores, public (signed-out) passports, buyer-defined
  checklists (buyers pick from the fixed requirement sets), free-form messaging threads, compliance
  conclusions and Supabase.
- **Production deploy from `main`**: Vercel serves the UI and Railway runs the Next.js server
  plus PostgreSQL. Vercel rewrites `/api/:path*` to Railway when `BACKEND_URL` is set. Migrations
  run on Railway (`pnpm db:migrate` as the pre-deploy command), never on Vercel. There is no Neon
  database.

## Capabilities

### New Capabilities

- `live-roadmap`: a public, read-only progress page built from the change's task list on `main` and
  open pull requests.
- `evidence-assessment`: turns an active document set and a buyer requirement set into per-requirement
  findings (DOCUMENTED, MISSING, MISMATCH, EXPIRED, NEEDS_REVIEW) with validated source citations.
- `supplier-workspace`: a signed-in user's private supplier profile and product draft, document
  uploads, finalised upload batches, document replacement, and the evidence report with its
  dimension summary and improvement action plan.
- `assessment-jobs`: the job lifecycle from finalised batch to stored result: idempotent start, real
  stage status, failure states and owner-only access.
- `completion-email`: one transactional email per completed job to the user's account address,
  sent after the result is stored and never blocking the report.
- `buyer-supplier-connections`: buyer requests, supplier listings, contact in either direction,
  per-buyer report sharing and notices to the other party.
- `workspace-assistant`: a text assistant that performs only approved workspace actions for the
  signed-in user and reports their actual outcome.

### Modified Capabilities

None. `openspec/specs/` is empty.

## Impact

- **New code**: `src/lib/assessment/`, `src/lib/documents/`, `src/lib/jobs/`, `src/lib/notify/`,
  `src/lib/agent/`, `src/app/workspace/`, `src/components/workspace/`, `src/components/assistant/`,
  `src/app/api/jobs/`, `src/app/api/assistant/`, `src/lib/connections/`, `src/components/connections/`,
  `src/app/connections/`, `src/lib/buyer/`, `src/app/buyer/`, `src/components/buyer/`,
  `fixtures/exportready/`, `roadmap/`.
- **Schema**: seven new tables and one migration, all in the contract group (see design.md). `src/proxy.ts` also guards
  `/workspace` and `/connections`.
- **Dependencies**: `@google/genai` (Gemini), `unpdf` (PDF text). Brevo and ElevenLabs are called
  over `fetch`, with no SDK.
- **Environment**: `GEMINI_API_KEY`, `GEMINI_MODEL` (`gemini-3.6-flash` in production),
  `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `APP_BASE_URL`, optional `ELEVENLABS_API_KEY`. Vercel
  also sets `BACKEND_URL` (the Railway origin). Railway does not. The roadmap project has its own
  `GITHUB_TOKEN`.
- **Process**: `.claude/rules/hackathon-mode.md` overrides parts of the git, review and task-handoff
  rules until submission.
- **Infrastructure the owner sets up**: a Railway project (backend service + Railway PostgreSQL),
  a Vercel project for the UI app, a separate Vercel project for the roadmap, no Neon, a Brevo
  sender, a Gemini API key, a read-only GitHub token.
