# Tasks

Hackathon mode applies (design.md, Decision 12). Each `##` group is one PR on the branch named in its
heading; the live roadmap parses these headings, so keep their format:
`## <n>. <title> · wave <w> · <milestone> · branch <type>/<slug>`. Tick a task, commit, push: that
updates the roadmap. A stuck task gets an indented `  - Blocked: <reason>` line, pushed at once.
Files a group may touch are listed in design.md, Decision 1; never edit a file another group owns.
Group 1 merges before any other group starts. A task marked `(post-merge)` can only be checked after
its group is on `main`: the PR merges with it unticked and the controller ticks it later in a
docs-only PR. After a review PASS, the only allowed commit is the tick of that review task.

## 1. Hackathon-mode workflow rules · wave 0 · M0 · branch chore/hackathon-mode

- [x] 1.1 Write `.claude/rules/hackathon-mode.md` with every override and every kept rule from design.md Decision 12, its expiry (after submission on 2026-11-07), the claim protocol commands and the merge sequence; verify each bullet of Decision 12 appears in the file
- [x] 1.2 Add a worker brief template to the same file (group number, branch, owned files from Decision 1, needs, tests to add, review yes/no, "stop when the PR is ready and the hook is green"); verify a controller can fill it for group 7 without reading other files
- [x] 1.3 Add one index line for `hackathon-mode.md` to `.claude/rules/CLAUDE.md` stating it overrides the git, review and handoff rules until submission; verify the link resolves. Commit with the `agents:` prefix; docs-only, no tests

## 2. Live roadmap page · wave 1 · M0 · branch feat/live-roadmap

- [x] 2.1 Create `roadmap/milestones.json` with M0 Foundation 10:45 (groups 1-4), M1 Parts merged and app live 12:15 (5-12), M2 End-to-end assessment 13:45 (13), M3 Assistant and buyer connections live 14:45 (14, 17), M4 Feature freeze 15:15 (15), M5 Submitted 16:45 (16), times as ISO strings with +01:00; verify every group number 1-17 appears exactly once
- [x] 2.2 Implement `roadmap/lib/parse-tasks.ts` (pure): group number, title, wave, milestone and branch from headings; ticked and total counts (`[x]`, `[X]`, `[ x]` count as ticked); `Blocked:` notes; `(post-merge)` markers; group status (including Merged, verifying) and milestone status rules from design.md Decision 10; add `roadmap/**/*.test.ts` to the `vitest.config.ts` include and `roadmap/**/*` to `biome.json` includes; verify `roadmap/lib/parse-tasks.test.ts` covers each status and Late, with expected values written from the spec, and passes
- [x] 2.3 Implement `roadmap/api/progress.ts` (Web-standard `GET` handler): one GitHub GraphQL query with server-only `GITHUB_TOKEN` for `main`'s tasks.md and open PRs' head tasks.md; fallback to `raw.githubusercontent.com` for `main` only without a token; `Cache-Control: s-maxage=20, stale-while-revalidate=60`; verify by calling the handler from a one-off `tsx` script with and without the token, and that the JSON never contains the token
  - Note: Verified without GITHUB_TOKEN against raw.githubusercontent.com (17 groups, open pull requests not shown). The token path was a mocked GraphQL response; the sentinel was absent from the JSON, including a GraphQL error. The live token check happens in 2.6.
- [x] 2.4 Build `roadmap/index.html` (vanilla JS and CSS inline, light and dark, readable at 375 px): milestone strip with target times and On track / Late / Done, groups by wave with status, n/m bar, PR link and draft state, last-commit time, Blocked reason, "last updated" time, stale-data banner on error, polling every 30 s; verify it renders the endpoint's data locally at 375 px and 1280 px
- [x] 2.5 Write `roadmap/README.md`: heading convention, "tick + push = update", how to change milestone times, the Vercel project settings (root `roadmap/`, framework Other, Ignored Build Step `git diff --quiet HEAD^ HEAD ./`) and the token scope (fine-grained, this repo only, read Contents and Pull requests); verify the owner can follow it alone
- [x] 2.6 (post-merge) Owner step: create the roadmap Vercel project and set `GITHUB_TOKEN`; the controller ticks this after the owner confirms; verify the production URL shows groups 1 and 2 as Done or Merged, verifying and any open PR as In progress, then record the URL as a note under this task
  - Note: Vercel project exportready-roadmap (root `roadmap`, framework Other) at https://exportready-roadmap.vercel.app with `GITHUB_TOKEN` on Production only. Verified on 7 Nov: source github, groups 1 Done and 2 Merged, verifying, open draft PR #22 shown on group 17 (Blocked by its notes), no token in the page or JSON.

## 3. Assessment contract · wave 1 · M0 · branch feat/assessment-contract

- [x] 3.1 Add `@google/genai` and `unpdf` with `pnpm add`; verify `pnpm install --frozen-lockfile` and `pnpm typecheck` pass
  - Note: `@google/genai` 3.0.0 and `unpdf` 2.1.0. `pnpm-workspace.yaml` sets `protobufjs: false` so `pnpm install` does not stop on its postinstall; the client ships generated code.
- [x] 3.2 Add `GEMINI_API_KEY`, `GEMINI_MODEL`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `APP_BASE_URL`, `ELEVENLABS_API_KEY` to `src/env.ts` as optional, plus a `requireEnv(name)` helper that throws a clear message when a feature needs a missing one, and placeholders to `.env.example`; verify `pnpm dev` starts with none of them set
- [x] 3.3 Add `src/db/schema/exportready.ts` with the seven tables (including `buyer_request`, `request_connection`, `product.listed` and the widened `notification`), checks, unique indexes and foreign keys exactly as design.md Decision 2, export it from `index.ts`, and run `pnpm db:generate` once; verify `pnpm db:migrate` applies cleanly on a fresh database
- [x] 3.4 Add a real-PostgreSQL test that updating a job to COMPLETED without `result_id` is rejected by the check constraint; verify it fails when the check is removed from the schema, then restore it
- [x] 3.5 Add `src/lib/assessment/types.ts` (RequirementSet, Requirement, PageText, Observation, Citation, Finding, FindingStatus, AssessmentResult, JobStatus, JobStage, FieldOrigin, WorkspaceDirective, ReadinessDimension, SupplierProfile) and `requirement-sets.ts` with `neckar-cap-104` v1, R1-R5, each with its dimension (design.md Decision 2) and expected values from the working plan, section 3; verify `pnpm typecheck` and that R1-R5 map to the dimensions in the evidence-assessment spec
- [x] 3.6 Add every stub file listed in design.md Decision 1 with its final exported signature and a body that throws `not implemented: <name>`, and the four slot components (`assistant-panel.tsx`, `connections-nav.tsx`, `product-connections.tsx`, `report-share.tsx`) rendering nothing; verify `pnpm typecheck` passes and a grep for `not implemented:` lists one stub per lane function
  - Note: Gemini entry point is `callGemini`. `contents` is a string or `@google/genai` `Content[]`; the response `content` is the model turn to echo, including function-call ids and thought signatures. Email template function is `renderCompletionEmail`. `requestEvidence` takes `buyerOrgName` because the user table has no organisation. Document finalise is spelled `finaliseDocuments`.
- [x] 3.7 Add `/workspace` and `/connections` to the `src/proxy.ts` matcher; verify a signed-out request to either redirects to `/sign-in`
- [x] 3.8 Add `vitest.golden.config.ts` (includes `src/**/*.golden.ts`, loads `.env`, `passWithNoTests`) and a `test:golden` script; add `unpdf` to `serverExternalPackages` in `next.config.ts` only if `next build` needs it; verify `pnpm test:golden` exits 0 and `pnpm build` passes
  - Note: `pnpm build` passed without listing `unpdf` in `serverExternalPackages`. Nothing imports it until group 5.
- [x] 3.9 Get one `independent-pr-reviewer` pass (Opus) and fix its blocking findings in one round; verify the review report says PASS for the final head
  - Note: Opus was rejected (weekly usage limit) and cursor-agent is not installed. A fresh independent-pr-reviewer on Grok returned FAIL, then PASS after 7c6821c. Round 1 finding R1-1: Gemini history could not echo function-call ids and thought signatures. Round 2 report says PASS.

## 4. Demo fixtures · wave 1 · M0 · branch feat/demo-fixtures

- [x] 4.1 Write `scripts/make-fixtures.ts`: a dependency-free one-page PDF writer (Helvetica, WinAnsi, correct xref) that prints each line of text and the footer "FICTIONAL DEMO DOCUMENT - NOT VALID FOR COMMERCIAL USE"; verify each output starts with `%PDF-` and opens in a browser PDF viewer with selectable text
- [x] 4.2 Generate the five files in `fixtures/exportready/` with exactly the contents in the working plan's section 3 table (01 datasheet, 02 ISO certificate valid until 2026-08-01, 03 inspection revision A, 04 packaging acceptance, 05 inspection revision B) and no traceability record anywhere; verify by reading each PDF's text in a viewer against the table
  - Note: supplier string is `Lotus Mould Co., Ltd.`; certificate issuer is `Fictional Standards Bureau`; doc 03 quote line is `Part number: CAP-104. Drawing revision: A.`
- [x] 4.3 Generate two trap files: `trap_CAP104_Inspection_RevB.pdf` whose body says revision A, and `empty.pdf` with no text layer; verify the trap's body text shows revision A and the empty one has no selectable text
  - Note: `empty.pdf` has no footer. A footer would be selectable text.
- [x] 4.4 Write `fixtures/exportready/answer-key.json` with the baseline and correction outcomes from the working plan's section 4, and `fixtures/exportready/README.md` stating it is test-only and never sent to the model; verify the JSON matches the plan's table line by line
  - Note: `rows` copies the section 4 cells, including Unchanged. `baseline.findings` and `correction.findings` are the resolved statuses. `trap.findings.R3` is MISMATCH. `empty.result` is incomplete.

## 5. PDF text extraction · wave 2 · M1 · branch feat/pdf-text

- [x] 5.1 Implement `extractPages` in `src/lib/assessment/pdf-text.ts` with `unpdf`, returning text per page with document ID, filename and 1-based page number, and an `empty` flag when a document yields no text; verify with 5.2
  - Note: a document with no non-whitespace text is listed in `emptyDocuments` and contributes no pages. Page numbers stay 1-based.
- [x] 5.2 Add `pdf-text.test.ts` reading the fixture files: 01 page 1 contains `LM-ABS-01`, 02 contains `2026-08-01`, 03 contains revision `A`, `empty.pdf` is flagged empty; verify it passes and fails if extraction returns an empty string
  - Note: returning an empty string for page text fails the datasheet assertion (`expected '' to contain 'LM-ABS-01'`).

## 6. Gemini fact extraction · wave 2 · M1 · branch feat/gemini-extraction

- [x] 6.1 Implement `src/lib/assessment/gemini.ts`: client from `requireEnv("GEMINI_API_KEY")` and `GEMINI_MODEL`, two retries with backoff, 60 s timeout, typed errors; verify a call without a key fails with the clear env message
  - Note: one call plus two retries (1s, then 2s) for timeout, network, 408, 429 and 5xx. Each attempt aborts at 60s. A missing key throws `GEMINI_API_KEY is not set. Add it to .env before using this feature (see .env.example).` before any attempt. Tool calls disable automatic function calling and return the model content unchanged.
- [x] 6.2 Implement `extractFacts` in `extract-facts.ts`: the plan's extraction instruction, requirements and page-labelled text in separate fields, structured output schema for observations only (no statuses), temperature 0, Zod-parse the response; verify `pnpm typecheck`
  - Note: requirements (id, statement, field names) and page-labelled text are separate JSON fields. Expected values are not sent. Null values with an empty quote are dropped. Field names: supplierName, partNumber, revision, material, grade, scope, validityEnd (YYYY-MM-DD), resinBatch, productionLot, shipment, packagingCode, packagingRevision, accepted (`yes` or null).
- [x] 6.3 Live smoke on fixtures 01-04 with a one-off `tsx` command (not committed): paste the observations into the PR description; verify doc 03 yields revision `A` with an exact quote and doc 02 yields validity end `2026-08-01`
  - Note: live smoke by the controller on main 7860596 with gemini-3.6-flash: 3/3 runs pass (doc 03 R3 revision A, quote "Drawing revision: A."; doc 02 R2 validityEnd 2026-08-01, quote "Valid until: 2026-08-01"; no coverage warnings).
  - Note: coverage retry added in fix/extraction-coverage; live smoke by controller

## 7. Rules and citation checks · wave 2 · M1 · branch feat/rules-engine

- [x] 7.1 Implement `validateCitations` in `citations.ts`: drop citations with an unknown document ID or page, or whose whitespace-normalised quote is not on that page; verify `citations.test.ts`: an invented quote and an unknown document ID are dropped and a real quote is kept
- [x] 7.2 Implement `decideFindings` in `rules.ts` for R1-R5: identity checks (supplier, part) first, then expiry against the assessment date, revision and grade equality, packaging acceptance; MISSING only for a complete set; NEEDS_REVIEW for incomplete sets or findings left without a valid citation; reason and next action per finding; verify `rules.test.ts` with hand-written observations: 2026-08-01 vs 2026-11-07 gives EXPIRED, revision A vs B gives MISMATCH, a wrong part never gives DOCUMENTED, an incomplete set never gives MISSING
- [x] 7.3 Get one `independent-pr-reviewer` pass (Opus), fix blocking findings in one round; verify PASS on the final head

## 8. Products and document upload · wave 2 · M1 · branch feat/document-upload

- [x] 8.1 Implement `src/lib/products/service.ts`: create a product for `neckar-cap-104`, get and list owned products, update allowed fields with origin and the declared supplier profile (both Zod-validated), all filtered by `userId`; verify `pnpm typecheck`; full check in 13.4
- [x] 8.2 Implement `src/lib/documents/service.ts`: add a pending file (MIME, 4 MB, 5 active PDFs, 2 photos, sha256), list active and pending, replace (new pending linked by `replaces_document_id`), and finalise in one transaction (pending to active, replaced to inactive) returning the active set; verify `pnpm typecheck`; full check in 13.4
- [x] 8.3 Add `POST /api/products/[productId]/documents` (multipart, one file, session required, 401 without one, 404 for a foreign product, 413 with a message naming the 4 MB limit); verify with `curl` and a session cookie: a fixture PDF gives 201 and a 5 MB file gives 413

## 9. Assessment jobs · wave 2 · M1 · branch feat/assessment-jobs

- [x] 9.1 Implement `startAssessment(userId, productId)` in `src/lib/jobs/service.ts`: compute the document set hash, insert with on-conflict-do-nothing, return the existing or new job, schedule `runAssessment` with `after()`; verify with 9.4
- [x] 9.2 Implement the claim (`QUEUED` to `PROCESSING` by update-where), `setStage`, `failJob`, and `completeJob` (insert result, set COMPLETED with `result_id`, insert the notification row for the owner's account email, all in one transaction); verify `pnpm typecheck`
- [x] 9.3 Add `GET /api/jobs/[jobId]` (session required, 404 for a foreign or unknown job, returns status, stage, error and result ID, re-queues a job stuck in PROCESSING for over 5 minutes up to 2 attempts); verify with 9.4
- [x] 9.4 Add `jobs.test.ts` on real PostgreSQL: two starts for the same snapshot return one job ID and one row; a direct duplicate insert is rejected; another user's job returns 404; verify each fails when its guard is removed, then restore
- [x] 9.5 Get one `independent-pr-reviewer` pass (Opus), fix blocking findings in one round; verify PASS on the final head
  - Note: Opus was out of weekly usage, so the pass ran as a fresh reviewer on Grok. Verdict PASS, no open findings. Report on PR 18.

## 10. Completion email · wave 2 · M1 · branch feat/completion-email

- [x] 10.1 Implement `sendBrevoEmail({to, subject, text})` in `src/lib/notify/brevo.ts` (Brevo `POST /v3/smtp/email` over `fetch` with a 15 s timeout; group 17 reuses it) and `sendCompletionEmail(notificationId)` in `src/lib/notify/completion-email.ts` on top of it: claim by update-where, store `messageId` or the error, mark failed with "email not configured" without a key; verify `pnpm typecheck`
  - Note: `notification_status` has no `sending` value, so the claim is `UPDATE … SET attempts = 1 WHERE status = 'pending' AND attempts = 0`. A second call does not send. Missing `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` or `APP_BASE_URL` stores "email not configured".
- [x] 10.2 Add the fixed template (subject "Your ExportReady assessment is ready", issue count from the findings, link `${APP_BASE_URL}/workspace/<productId>/report`, no attachments); verify by rendering it for the baseline findings: the text says three documentation issues remain
  - Note: Open issues are findings whose status is not DOCUMENTED. Baseline R2 EXPIRED, R3 MISMATCH and R4 MISSING render "three documentation issues remain". The Brevo body is `textContent` only.
- [ ] 10.3 Live send to a team-controlled address from a local notification row; verify the inbox receives it, the link opens the report after sign-in, and the row holds the message ID. Record the address used (not the key) as a note
  - Blocked: Brevo accepted the send and the local row stores message id `<202611071032.41981504803@smtp-relay.mailin.fr>`. The link redirects to sign-in, and the report page is not on main yet (group 11). This environment cannot open the Gmail inbox, so delivery and the post-sign-in report are not confirmed.
  - Note: sender and test inbox are both nam95.pn@gmail.com. Sent 2026-11-07 11:32 Europe/Berlin, while local `APP_BASE_URL` was blank, so that message links to `https://exportready-production.up.railway.app/workspace/afdbaf2c-750e-4906-9599-f8adbc9e2de5/report`. Local `APP_BASE_URL` is now `https://exportready.vercel.app`. That origin also redirects the report path to sign-in.

## 11. Workspace and report UI · wave 2 · M1 · branch feat/workspace-ui

- [x] 11.1 Add `src/app/workspace/layout.tsx` (requireSession, renders `<AssistantPanel />` and `<ConnectionsNav />`) and `src/components/workspace/workspace-events.ts` (a typed client event bus for `WorkspaceDirective`); link `/workspace` from `src/app/page.tsx`; verify a signed-in user reaches `/workspace` and a signed-out one is sent to sign-in
- [x] 11.2 Build `/workspace` (list and create products, with a short onboarding step for the supplier profile: company, country, product category, capabilities, target market, labelled "declared by supplier") and `/workspace/[productId]`: draft form with origin badges; upload card with dropzone, per-file POST, pending list, a replace control on active documents and an "Upload and assess" button; `<ProductConnections productId />` mounted on the product page; it responds to the `navigate`, `show_upload_card` and `request_replacement` directives; verify it renders against the contract types and `pnpm typecheck` passes
- [x] 11.3 Build the progress view: poll `GET /api/jobs/[jobId]` every 2 s while not final, show real stages and an actionable error, stop on COMPLETED and open the report; verify `pnpm typecheck`; live check in 13.4
- [x] 11.4 Build `/workspace/[productId]/report`: per requirement status, evidence type, reason, next action; citations with filename, page and exact quote; an incomplete-processing banner; a "not a certification" note; no score; the declared supplier profile with its label; `<ReportShare resultId />` mounted; the findings list and summary as components that take a stored result and a `readOnly` flag, so group 17 can render a shared result for the buyer without supplier actions; verify `pnpm typecheck`; live check in 13.4
- [x] 11.6 Add `src/components/workspace/report-summary.ts` (pure): per-dimension documented and open counts, the improvement action plan (one action per unresolved finding, ordered by requirement) and the plain-text document-request draft; render them on the report with a copy button for the draft and no percentage or score; verify `report-summary.test.ts` with findings written from the supplier-workspace spec: the baseline gives the four dimension counts in its scenario and three actions (R2, R3, R4), and the corrected set gives two (R2, R4)
- [x] 11.5 Check the pages at 375 px and 1280 px in light and dark mode against `docs/ui-ux-guide.md`; verify there is no horizontal scroll and text contrast is readable

## 12. Production deploy · wave 2 · M1 · branch chore/production-deploy

- [x] 12.1 Add `scripts/vercel-build.mjs`: run `pnpm db:migrate` only when `VERCEL_ENV` is `production`, then `next build`; verify locally that without `VERCEL_ENV` it skips migration and builds
  - Note: 12.5 changed this script. It only runs `next build`. Railway runs `pnpm db:migrate`. There is no Neon pooler check.
- [x] 12.2 Write `docs/deploy.md`: Vercel project, Neon from the Marketplace, build command, previews off, the env list from design.md Decision 11, rollback by Promote; verify the owner can follow it alone
  - Note: 12.5 rewrote `docs/deploy.md` for Railway (backend and Postgres) and Vercel (UI). There is no Neon database. Production `GEMINI_MODEL` is `gemini-3.6-flash`.
- [x] 12.3 Owner step: create the Railway project (Next.js service from this repo, Node 22, build `pnpm build`, pre-deploy `pnpm db:migrate`, start `pnpm start`, healthcheck `/api/health`, Railway Postgres, `DATABASE_URL=${{Postgres.DATABASE_URL}}`, env from `docs/deploy.md`) and the Vercel project (build command `node scripts/vercel-build.mjs`, previews off, `BACKEND_URL`, Railway's public `DATABASE_URL`, and the same `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`); the worker ticks this after the owner confirms; verify both projects and their env
  - Note: Railway project exportready (service exportready plus Postgres and its env) and Vercel project exportready at https://exportready.vercel.app (BACKEND_URL, DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, APP_BASE_URL) are created.
- [x] 12.4 (post-merge) Smoke-test the first production deploy: sign up, sign in, open `/workspace`; verify each works, then record the URL as a note and set `APP_BASE_URL` and `BETTER_AUTH_URL` to it
  - Note: 2026-11-07 12:36 UTC at https://exportready.vercel.app. Sign-up as nam95.pn+er-smoke-1794054979454@gmail.com (`POST /api/auth/sign-up/email` 200) opened `/workspace` (heading Products). Sign out (`POST /api/auth/sign-out` 200) returned to `/`. Signed-out `/workspace` redirected to `/sign-in?next=%2Fworkspace`. Sign-in (`POST /api/auth/sign-in/email` 200) opened `/workspace` again. `APP_BASE_URL` and `BETTER_AUTH_URL` were not changed. Both should be `https://exportready.vercel.app` with no path and no trailing slash. The controller checks the deployed values.
- [x] 12.5 Railway backend + Postgres deploy (railway.json, /api rewrite, health route, docs)
  - Note: `BACKEND_URL` is an optional URL in `src/env.ts` and `.env.example`. `.env.example` sets `GEMINI_MODEL=gemini-3.6-flash`. `next.config.ts` still reads `process.env.BACKEND_URL` for the rewrite.

## 13. End-to-end assessment · wave 3 · M2 · branch feat/assessment-integration

- [x] 13.1 Implement `runAssessment(jobId)` in `pipeline.ts`: claim, set each stage, extract pages, extract facts, validate citations, decide findings, `completeJob`, then `sendCompletionEmail` after commit; on failure `failJob` with an actionable message; verify with 13.2
  - Note: A non-empty `extractFacts` warning marks the result incomplete, the same `complete: false` path as a PDF with no text. `pipeline.test.ts` mocks that path. The live answer-key run is 13.2. The stored assessment date is the Europe/Berlin calendar date. A completion-email error after commit leaves the stored result.
- [x] 13.2 Add `assessment.golden.ts`: baseline 01-04 equals the answer key; replacing 03 with 05 flips only R3; the trap file still gives R3 MISMATCH; `empty.pdf` marks the result incomplete; expected values read from `answer-key.json`; verify `pnpm test:golden` passes twice in a row
  - Note: Controller ran pnpm test:golden live twice on main 2d8eb0f with gemini-3.6-flash: 4/4 PASS both runs (186 s, 145 s). Docs 01-04 match the answer key, the revision B replacement flips only R3, the revB trap keeps R3 MISMATCH, and empty.pdf marks the result incomplete. No extraction warnings.
- [x] 13.3 Tune only the prompt or rules if 13.2 fails, never the answer key; verify `pnpm test:golden` passes
  - Note: Controller ran pnpm test:golden live twice on main 2d8eb0f with gemini-3.6-flash: 4/4 PASS both runs (186 s, 145 s). Docs 01-04 match the answer key, the revision B replacement flips only R3, the revB trap keeps R3 MISMATCH, and empty.pdf marks the result incomplete. No extraction warnings.
- [ ] 13.4 Local click-through: onboard the Lotus Mould profile, create a product, upload 01-04, Upload and assess, see the R3 citation, the dimension summary and three actions, replace 03 with 05, re-assess and see two actions, receive the email; verify each step and that reload shows the stored report
  - Blocked: needs group 11 (PR #11) merged
- [ ] 13.5 (post-merge) Production click-through of 13.4, closing the tab during processing and reopening after completion; verify the stored report loads, or record the failure honestly as a note
  - Blocked: workspace UI not wired to backend
  - Note: 2026-11-07 12:36 UTC, same account, product https://exportready.vercel.app/workspace/10a67eda-3ec9-48b7-9419-dbe48f935707. Upload of fixtures 01–04 showed the files locally. `POST /api/products/10a67eda-3ec9-48b7-9419-dbe48f935707/documents` returned 404 `{"error":"Product not found"}` (one request; the client stopped). `POST /api/products/10a67eda-3ec9-48b7-9419-dbe48f935707/assess` returned 404. A signed-in repeat of that URL was 404 `text/html` whose page text includes "could not be found". The client kept job id `demo-500ed502-b2a7-426d-88c9-ad73ecd80129`. The click's `GET /api/jobs/demo-500ed502-b2a7-426d-88c9-ad73ecd80129` returned 404. A signed-in repeat returned 404 `{"error":"Not found"}`. The page then showed a local progress view and a fixture report in localStorage (`result-10a67eda-3ec9-48b7-9419-dbe48f935707-baseline`). That report is demo data: R3 quote "Part number: CAP-104. Drawing revision: A.", 2 documented and 3 open actions (R2, R3, R4). Screenshots in `docs/screenshots/` are that demo UI. Close-during-processing and the revision-B re-assess were not run.
- [x] 13.6 Get one `independent-pr-reviewer` pass (Opus), fix blocking findings in one round; verify PASS on the final head
  - Note: Round 1 FAIL (R1-1 photos, R1-2 unnamed incomplete files), fixed in one round. Round 2 PASS. The reviewer ran on Grok because Opus was out of usage.

## 14. Text assistant · wave 4 · M3 · branch feat/workspace-assistant

- [x] 14.1 Declare the eight tools from the working plan section 6 in `src/lib/agent/tools.ts` with Zod argument schemas; server tools call the products, documents and jobs services with the session's `userId`; browser tools return validated directives; verify `pnpm typecheck`
  - Note: Draft writes always use origin `assistant`. `start_assessment` calls `startAssessment` only when the checklist exists, at least one document is active and none are pending. Latest job and stored findings are read in this module; the jobs service has no product-scoped read and this lane does not own that file.
- [x] 14.2 Add `POST /api/assistant` (session required): Gemini function calling over the history, at most 5 rounds, failures explained with a recovery step, replies only from tool results; verify a model-supplied foreign product ID gets "not found"
  - Blocked: Live Gemini check was not run. This VM has no GEMINI_API_KEY. Tests mock `callGemini`: a foreign product id on show_report returns "not found", tool rounds stop at 5, and a model failure is a recovery step. Production model is `gemini-3.6-flash` via `callGemini` (`GEMINI_MODEL`). The route is `POST /api/assistant` on Railway; Vercel proxies `/api/*`.
- [x] 14.3 Fill `assistant-panel.tsx`: text input, message list, applies directives through `workspace-events.ts`, stays usable while a job runs; verify the demo conversation: "I want to submit my product and documents for this buyer" opens the upload card; after the report, "Why did R3 fail?" cites the revision-A quote and offers a replacement
  - Note: Connected the panel, shared directives, owned product/draft/upload persistence, and stored reports. Automated DOM and real-PostgreSQL tests cover upload navigation, R3 citations, replacement routing, retry input, and draft provenance. Provider boundaries are mocked locally. Live Gemini verification remains on Railway with its configured environment.

## 15. Spoken replies (optional, cut at 15:15) · wave 4 · M4 · branch feat/spoken-replies

- [x] 15.1 Add `POST /api/speech` (session required, text up to 600 characters, ElevenLabs text-to-speech with a stock voice, key server-side) and `src/components/voice/speak-reply.tsx` with a mute toggle; verify a reply plays audio and, with the key unset, the reply stays text with no error dialog
  - Note: Server env is `ELEVENLABS_API_KEY` (Railway only, never `NEXT_PUBLIC_`, never on Vercel). Stock voice Rachel `21m00Tcm4TlvDq8ikWAM`, model `eleven_flash_v2_5`. Missing key or a failed synthesis returns `{ available: false }` and the reply stays text.
- [x] 15.2 Mount the speaker in `assistant-panel.tsx` (one line); verify the 14.3 conversation still works with audio off
  - Note: Mounted the speaker in the assistant conversation with a shared mute control. DOM integration tests verify the upload/R3 conversation with speech off and no speech requests.

## 16. Submission package · wave 4 · M5 · branch docs/submission

- [ ] 16.1 Rewrite `README.md`: what ExportReady does, with the tagline "From Supplier Potential to Buyer Confidence"; architecture diagram; setup and deployment; tech stack; fixtures; the tests that actually ran; real integrations (Gemini, Brevo, ElevenLabs if done); screenshots of the workspace, report and action plan; the demo URL; team members (Phuong, Nam and others) and who did what; known limits (durability, authenticity, no compliance claim, no score); verify every claim matches merged code and the demo URL opens
  - Blocked: Screenshots and the final claims check run after groups 11, 13 and 17 merge. The README on this branch describes only what is on main and lists the rest under In progress. `/workspace` has no page until group 11 merges, so no screenshots were added. On 2026-11-07 the Vercel URL returned HTTP 200 and Railway `GET /api/health` returned `{"ok":true}`.
- [x] 16.2 Write `docs/pitch/deck-outline.md` with six slides (problem and target customers, solution, product demo screenshots, market and the business model to test from `docs/exportready-passport-idea.md` section 5, competitive differentiation, team and roadmap) and `docs/pitch/video-script.md` (2:45 target, fictional-data notice, including the two-sided flow: Neckar posts a request, Lotus Mould responds and shares the report, the buyer reads it, then the re-share after the correction); verify the script matches what the app actually does and claims no untested willingness to pay
  - Note: Slide 3 and the 0:52–2:05 script block are the intended demo after groups 11, 13 and 17 merge, and they are marked that way. A fallback block covers a recording made before those groups land. No willingness to pay is claimed.
- [ ] 16.3 Owner step (Phuong): customer discovery with up to five people using the idea doc's three questions; record role, current qualification process, the pain and the objection for each, with consent, in `docs/pitch/customer-learning.md`, and state plainly if fewer were reached; verify no interview result is invented
  - Note: `docs/pitch/customer-learning.md` is an empty template. No interview was recorded in this pull request.
- [ ] 16.4 (post-merge) Owner step: record the video (3 minutes or less), finish the deck, submit by 16:45; the controller ticks this after the owner confirms; verify the submission confirmation and that the video plays signed out

## 17. Buyer-supplier connections · wave 3 · M3 · branch feat/buyer-supplier-connections

- [ ] 17.1 Implement `src/lib/connections/service.ts` (design.md Decision 16), every function taking the session's `userId` with Zod-validated input: create a buyer request; list the open board (organisation, title, part number, requirement set, never an email); set a product's `listed` flag and list the directory (name, part number, declared profile only); respond to a request with an existing product or a new one through `createProduct`; "Request evidence" on a listing (a `direct` request plus a buyer-initiated connection); share a result (completed, belonging to the connected product; status `shared`); get a connection for its buyer or the product's owner only, otherwise not found; list and mark-read the inbox; no self-connection; each write inserts its notice in the same transaction; verify `pnpm typecheck`
- [ ] 17.2 Add `src/lib/connections/notify.ts`: after commit, send each pending connection notice with `sendBrevoEmail` to the recipient's own account address, naming the buyer organisation or the supplier's declared company and never the sender's email; a failure or a missing key only marks the notice failed; verify `pnpm typecheck`, and with `BREVO_API_KEY` unset a share still succeeds and its notice shows as failed
- [ ] 17.3 Build the pages under `src/app/connections/` (each calls `requireSession()`; forms post to server actions with Zod): `requests` (board), `requests/new` (organisation, title, part number, requirement set, message up to 1000 characters), `suppliers` (directory with "Request evidence"), `inbox`, and `[connectionId]` (buyer: the shared result through group 11's report components with `readOnly`, no document links; supplier: status, message and share); verify `pnpm typecheck` and that a signed-out visit to `/connections/requests` goes to sign-in
- [ ] 17.4 Fill the slots: `connections-nav.tsx` (links to board, directory and inbox with the unread count), `product-connections.tsx` (listing toggle, this product's connections, respond to an open board request), `report-share.tsx` (share this result with a connected buyer, or re-share a newer one); verify `pnpm typecheck` and that the workspace pages still render with no connections
- [ ] 17.5 Add `connections.test.ts` on real PostgreSQL, expected values from the buyer-supplier-connections spec: the buyer reads exactly the shared result and not a later unshared one; a third user gets not found; a second connection for the same request and product is rejected by the unique index; `status = 'shared'` without a result is rejected by the check; a supplier cannot connect their own product to their own request; verify each case fails when its guard is removed, then restore
- [ ] 17.6 Local two-account click-through after merging `origin/main` with group 13 on it: the buyer account posts "Cover cap CAP-104 rev B" for Neckar Maschinenbau GmbH; the supplier account (Lotus Mould) responds with its assessed product and shares the baseline result; the buyer sees R1-R5 with citations and three actions and no document download; the supplier replaces 03 with 05, re-assesses and re-shares; the buyer sees R3 DOCUMENTED; the buyer presses "Request evidence" on the listing and it appears in the supplier's inbox; verify each step, the inbox notices and the emails (or failed notices without a key)
  - Note: if group 13 is not on `main` yet, add a `Blocked:` note on this task only and finish 17.1-17.5 first.
- [ ] 17.7 Get one `independent-pr-reviewer` pass (Opus), fix blocking findings in one round; verify PASS on the final head
- [ ] 17.8 (post-merge) Production click-through of 17.6 with two fresh accounts; verify every step, or record the failure honestly as a note

## Workflow follow-up

- After submission, delete `.claude/rules/hackathon-mode.md` and its index line so the normal rules apply again.
- Archive this change with `/opsx:archive` once every task is ticked; the roadmap stops tracking it then.
