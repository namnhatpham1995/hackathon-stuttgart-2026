# Tasks

Hackathon mode applies (design.md, Decision 12). Each `##` group is one PR on the branch named in its
heading; the live roadmap parses these headings, so keep their format:
`## <n>. <title> · wave <w> · <milestone> · branch <type>/<slug>`. Tick a task, commit, push: that
updates the roadmap. A stuck task gets an indented `  - Blocked: <reason>` line, pushed at once.
Files a group may touch are listed in design.md, Decision 1; never edit a file another group owns.

## 1. Hackathon-mode workflow rules · wave 0 · M0 · branch chore/hackathon-mode

- [ ] 1.1 Write `.claude/rules/hackathon-mode.md` with every override and every kept rule from design.md Decision 12, its expiry (after submission on 2026-11-07), the claim protocol commands and the merge sequence; verify each bullet of Decision 12 appears in the file
- [ ] 1.2 Add a worker brief template to the same file (group number, branch, owned files from Decision 1, needs, tests to add, review yes/no, "stop when the PR is ready and the hook is green"); verify a controller can fill it for group 7 without reading other files
- [ ] 1.3 Add one index line for `hackathon-mode.md` to `.claude/rules/CLAUDE.md` stating it overrides the git, review and handoff rules until submission; verify the link resolves. Commit with the `agents:` prefix; docs-only, no tests

## 2. Live roadmap page · wave 0 · M0 · branch feat/live-roadmap

- [ ] 2.1 Create `roadmap/milestones.json` with M0 Foundation 10:45 (groups 1-4), M1 Parts merged and app live 12:15 (5-12), M2 End-to-end assessment 13:45 (13), M3 Assistant live 14:45 (14), M4 Feature freeze 15:15 (15), M5 Submitted 16:45 (16), times as ISO strings with +01:00; verify every group number 1-16 appears exactly once
- [ ] 2.2 Implement `roadmap/lib/parse-tasks.ts` (pure): group number, title, wave, milestone and branch from headings; ticked and total counts (`[x]`, `[X]`, `[ x]` count as ticked); `Blocked:` notes; group status and milestone status rules from design.md Decision 10; add `roadmap/**/*.test.ts` to the `vitest.config.ts` include and `roadmap/**/*` to `biome.json` includes; verify `roadmap/lib/parse-tasks.test.ts` covers each status and Late, with expected values written from the spec, and passes
- [ ] 2.3 Implement `roadmap/api/progress.ts` (Web-standard `GET` handler): one GitHub GraphQL query with server-only `GITHUB_TOKEN` for `main`'s tasks.md and open PRs' head tasks.md; fallback to `raw.githubusercontent.com` for `main` only without a token; `Cache-Control: s-maxage=20, stale-while-revalidate=60`; verify by calling the handler from a one-off `tsx` script with and without the token, and that the JSON never contains the token
- [ ] 2.4 Build `roadmap/index.html` (vanilla JS and CSS inline, light and dark, readable at 375 px): milestone strip with target times and On track / Late / Done, groups by wave with status, n/m bar, PR link and draft state, last-commit time, Blocked reason, "last updated" time, stale-data banner on error, polling every 30 s; verify it renders the endpoint's data locally at 375 px and 1280 px
- [ ] 2.5 Write `roadmap/README.md`: heading convention, "tick + push = update", how to change milestone times, the Vercel project settings (root `roadmap/`, framework Other, Ignored Build Step `git diff --quiet HEAD^ HEAD ./`) and the token scope (fine-grained, this repo only, read Contents and Pull requests); verify the owner can follow it alone
- [ ] 2.6 Owner step: create the roadmap Vercel project and set `GITHUB_TOKEN`; the worker ticks this after the owner confirms; verify the production URL shows group 2 In progress from this group's own draft PR, then record the URL as a note under this task

## 3. Assessment contract · wave 0 · M0 · branch feat/assessment-contract

- [ ] 3.1 Add `@google/genai` and `unpdf` with `pnpm add`; verify `pnpm install --frozen-lockfile` and `pnpm typecheck` pass
- [ ] 3.2 Add `GEMINI_API_KEY`, `GEMINI_MODEL`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `APP_BASE_URL`, `ELEVENLABS_API_KEY` to `src/env.ts` as optional, plus a `requireEnv(name)` helper that throws a clear message when a feature needs a missing one, and placeholders to `.env.example`; verify `pnpm dev` starts with none of them set
- [ ] 3.3 Add `src/db/schema/exportready.ts` with the five tables, checks, unique indexes and foreign keys exactly as design.md Decision 2, export it from `index.ts`, and run `pnpm db:generate` once; verify `pnpm db:migrate` applies cleanly on a fresh database
- [ ] 3.4 Add a real-PostgreSQL test that updating a job to COMPLETED without `result_id` is rejected by the check constraint; verify it fails when the check is removed from the schema, then restore it
- [ ] 3.5 Add `src/lib/assessment/types.ts` (RequirementSet, Requirement, PageText, Observation, Citation, Finding, FindingStatus, AssessmentResult, JobStatus, JobStage, FieldOrigin, WorkspaceDirective) and `requirement-sets.ts` with `neckar-cap-104` v1, R1-R5 and their expected values from the working plan, section 3; verify `pnpm typecheck`
- [ ] 3.6 Add every stub file listed in design.md Decision 1 with its final exported signature and a body that throws `not implemented: <name>`, and `assistant-panel.tsx` rendering nothing; verify `pnpm typecheck` passes and a grep for `not implemented:` lists one stub per lane function
- [ ] 3.7 Add `/workspace` to the `src/proxy.ts` matcher; verify a signed-out request to `/workspace` redirects to `/sign-in`
- [ ] 3.8 Add `vitest.golden.config.ts` (includes `src/**/*.golden.ts`, loads `.env`, `passWithNoTests`) and a `test:golden` script; add `unpdf` to `serverExternalPackages` in `next.config.ts` only if `next build` needs it; verify `pnpm test:golden` exits 0 and `pnpm build` passes
- [ ] 3.9 Get one `independent-pr-reviewer` pass (Opus) and fix its blocking findings in one round; verify the review report says PASS for the final head

## 4. Demo fixtures · wave 0 · M0 · branch feat/demo-fixtures

- [ ] 4.1 Write `scripts/make-fixtures.ts`: a dependency-free one-page PDF writer (Helvetica, WinAnsi, correct xref) that prints each line of text and the footer "FICTIONAL DEMO DOCUMENT - NOT VALID FOR COMMERCIAL USE"; verify each output starts with `%PDF-` and opens in a browser PDF viewer with selectable text
- [ ] 4.2 Generate the five files in `fixtures/exportready/` with exactly the contents in the working plan's section 3 table (01 datasheet, 02 ISO certificate valid until 2026-08-01, 03 inspection revision A, 04 packaging acceptance, 05 inspection revision B) and no traceability record anywhere; verify by reading each PDF's text in a viewer against the table
- [ ] 4.3 Generate two trap files: `trap_CAP104_Inspection_RevB.pdf` whose body says revision A, and `empty.pdf` with no text layer; verify the trap's body text shows revision A and the empty one has no selectable text
- [ ] 4.4 Write `fixtures/exportready/answer-key.json` with the baseline and correction outcomes from the working plan's section 4, and `fixtures/exportready/README.md` stating it is test-only and never sent to the model; verify the JSON matches the plan's table line by line

## 5. PDF text extraction · wave 1 · M1 · branch feat/pdf-text

- [ ] 5.1 Implement `extractPages` in `src/lib/assessment/pdf-text.ts` with `unpdf`, returning text per page with document ID, filename and 1-based page number, and an `empty` flag when a document yields no text; verify with 5.2
- [ ] 5.2 Add `pdf-text.test.ts` reading the fixture files: 01 page 1 contains `LM-ABS-01`, 02 contains `2026-08-01`, 03 contains revision `A`, `empty.pdf` is flagged empty; verify it passes and fails if extraction returns an empty string

## 6. Gemini fact extraction · wave 1 · M1 · branch feat/gemini-extraction

- [ ] 6.1 Implement `src/lib/assessment/gemini.ts`: client from `requireEnv("GEMINI_API_KEY")` and `GEMINI_MODEL`, two retries with backoff, 60 s timeout, typed errors; verify a call without a key fails with the clear env message
- [ ] 6.2 Implement `extractFacts` in `extract-facts.ts`: the plan's extraction instruction, requirements and page-labelled text in separate fields, structured output schema for observations only (no statuses), temperature 0, Zod-parse the response; verify `pnpm typecheck`
- [ ] 6.3 Live smoke on fixtures 01-04 with a one-off `tsx` command (not committed): paste the observations into the PR description; verify doc 03 yields revision `A` with an exact quote and doc 02 yields validity end `2026-08-01`

## 7. Rules and citation checks · wave 1 · M1 · branch feat/rules-engine

- [ ] 7.1 Implement `validateCitations` in `citations.ts`: drop citations with an unknown document ID or page, or whose whitespace-normalised quote is not on that page; verify `citations.test.ts`: an invented quote and an unknown document ID are dropped and a real quote is kept
- [ ] 7.2 Implement `decideFindings` in `rules.ts` for R1-R5: identity checks (supplier, part) first, then expiry against the assessment date, revision and grade equality, packaging acceptance; MISSING only for a complete set; NEEDS_REVIEW for incomplete sets or findings left without a valid citation; reason and next action per finding; verify `rules.test.ts` with hand-written observations: 2026-08-01 vs 2026-11-07 gives EXPIRED, revision A vs B gives MISMATCH, a wrong part never gives DOCUMENTED, an incomplete set never gives MISSING
- [ ] 7.3 Get one `independent-pr-reviewer` pass (Opus), fix blocking findings in one round; verify PASS on the final head

## 8. Products and document upload · wave 1 · M1 · branch feat/document-upload

- [ ] 8.1 Implement `src/lib/products/service.ts`: create a product for `neckar-cap-104`, get and list owned products, update allowed fields with origin (Zod-validated), all filtered by `userId`; verify `pnpm typecheck`; full check in 13.4
- [ ] 8.2 Implement `src/lib/documents/service.ts`: add a pending file (MIME, 4 MB, 5 active PDFs, 2 photos, sha256), list active and pending, replace (new pending linked by `replaces_document_id`), and finalise in one transaction (pending to active, replaced to inactive) returning the active set; verify `pnpm typecheck`; full check in 13.4
- [ ] 8.3 Add `POST /api/products/[productId]/documents` (multipart, one file, session required, 401 without one, 404 for a foreign product, 413 with a message naming the 4 MB limit); verify with `curl` and a session cookie: a fixture PDF gives 201 and a 5 MB file gives 413

## 9. Assessment jobs · wave 1 · M1 · branch feat/assessment-jobs

- [ ] 9.1 Implement `startAssessment(userId, productId)` in `src/lib/jobs/service.ts`: compute the document set hash, insert with on-conflict-do-nothing, return the existing or new job, schedule `runAssessment` with `after()`; verify with 9.4
- [ ] 9.2 Implement the claim (`QUEUED` to `PROCESSING` by update-where), `setStage`, `failJob`, and `completeJob` (insert result, set COMPLETED with `result_id`, insert the notification row for the owner's account email, all in one transaction); verify `pnpm typecheck`
- [ ] 9.3 Add `GET /api/jobs/[jobId]` (session required, 404 for a foreign or unknown job, returns status, stage, error and result ID, re-queues a job stuck in PROCESSING for over 5 minutes up to 2 attempts); verify with 9.4
- [ ] 9.4 Add `jobs.test.ts` on real PostgreSQL: two starts for the same snapshot return one job ID and one row; a direct duplicate insert is rejected; another user's job returns 404; verify each fails when its guard is removed, then restore
- [ ] 9.5 Get one `independent-pr-reviewer` pass (Opus), fix blocking findings in one round; verify PASS on the final head

## 10. Completion email · wave 1 · M1 · branch feat/completion-email

- [ ] 10.1 Implement `sendCompletionEmail(notificationId)` in `src/lib/notify/completion-email.ts`: claim by update-where, Brevo `POST /v3/smtp/email` over `fetch` with a 15 s timeout, store `messageId` or the error, mark failed with "email not configured" without a key; verify `pnpm typecheck`
- [ ] 10.2 Add the fixed template (subject "Your ExportReady assessment is ready", issue count from the findings, link `${APP_BASE_URL}/workspace/<productId>/report`, no attachments); verify by rendering it for the baseline findings: the text says three documentation issues remain
- [ ] 10.3 Live send to a team-controlled address from a local notification row; verify the inbox receives it, the link opens the report after sign-in, and the row holds the message ID. Record the address used (not the key) as a note

## 11. Workspace and report UI · wave 1 · M1 · branch feat/workspace-ui

- [ ] 11.1 Add `src/app/workspace/layout.tsx` (requireSession, renders `<AssistantPanel />`) and `src/components/workspace/workspace-events.ts` (a typed client event bus for `WorkspaceDirective`); link `/workspace` from `src/app/page.tsx`; verify a signed-in user reaches `/workspace` and a signed-out one is sent to sign-in
- [ ] 11.2 Build `/workspace` (list and create products) and `/workspace/[productId]`: draft form with origin badges; upload card with dropzone, per-file POST, pending list, a replace control on active documents and an "Upload and assess" button; it responds to the `navigate`, `show_upload_card` and `request_replacement` directives; verify it renders against the contract types and `pnpm typecheck` passes
- [ ] 11.3 Build the progress view: poll `GET /api/jobs/[jobId]` every 2 s while not final, show real stages and an actionable error, stop on COMPLETED and open the report; verify `pnpm typecheck`; live check in 13.4
- [ ] 11.4 Build `/workspace/[productId]/report`: per requirement status, evidence type, reason, next action; citations with filename, page and exact quote; an incomplete-processing banner; a "not a certification" note; no score; verify `pnpm typecheck`; live check in 13.4
- [ ] 11.5 Check the pages at 375 px and 1280 px in light and dark mode against `docs/ui-ux-guide.md`; verify there is no horizontal scroll and text contrast is readable

## 12. Production deploy · wave 1 · M1 · branch chore/production-deploy

- [ ] 12.1 Add `scripts/vercel-build.mjs`: run `pnpm db:migrate` only when `VERCEL_ENV` is `production`, then `next build`; verify locally that without `VERCEL_ENV` it skips migration and builds
- [ ] 12.2 Write `docs/deploy.md`: Vercel project, Neon from the Marketplace, build command, previews off, the env list from design.md Decision 11, rollback by Promote; verify the owner can follow it alone
- [ ] 12.3 Owner step: create the app's Vercel project and Neon database and set the env; the worker ticks this after the owner confirms; verify the production deploy succeeds, then record the URL as a note and set `APP_BASE_URL` and `BETTER_AUTH_URL` to it
- [ ] 12.4 Smoke-test production: sign up, sign in, open `/workspace`; verify each works and nothing else is needed for later merges to deploy

## 13. End-to-end assessment · wave 2 · M2 · branch feat/assessment-integration

- [ ] 13.1 Implement `runAssessment(jobId)` in `pipeline.ts`: claim, set each stage, extract pages, extract facts, validate citations, decide findings, `completeJob`, then `sendCompletionEmail` after commit; on failure `failJob` with an actionable message; verify with 13.2
- [ ] 13.2 Add `assessment.golden.ts`: baseline 01-04 equals the answer key; replacing 03 with 05 flips only R3; the trap file still gives R3 MISMATCH; `empty.pdf` marks the result incomplete; expected values read from `answer-key.json`; verify `pnpm test:golden` passes twice in a row
- [ ] 13.3 Tune only the prompt or rules if 13.2 fails, never the answer key; verify `pnpm test:golden` passes
- [ ] 13.4 Local click-through: create a product, upload 01-04, Upload and assess, see the R3 citation, replace 03 with 05, re-assess, receive the email; verify each step and that reload shows the stored report
- [ ] 13.5 Production click-through of 13.4, closing the tab during processing and reopening after completion; verify the stored report loads, or record the failure honestly as a note
- [ ] 13.6 Get one `independent-pr-reviewer` pass (Opus), fix blocking findings in one round; verify PASS on the final head

## 14. Text assistant · wave 3 · M3 · branch feat/workspace-assistant

- [ ] 14.1 Declare the eight tools from the working plan section 6 in `src/lib/agent/tools.ts` with Zod argument schemas; server tools call the products, documents and jobs services with the session's `userId`; browser tools return validated directives; verify `pnpm typecheck`
- [ ] 14.2 Add `POST /api/assistant` (session required): Gemini function calling over the history, at most 5 rounds, failures explained with a recovery step, replies only from tool results; verify a model-supplied foreign product ID gets "not found"
- [ ] 14.3 Fill `assistant-panel.tsx`: text input, message list, applies directives through `workspace-events.ts`, stays usable while a job runs; verify the demo conversation: "I want to submit my product and documents for this buyer" opens the upload card; after the report, "Why did R3 fail?" cites the revision-A quote and offers a replacement

## 15. Spoken replies (optional, cut at 15:15) · wave 3 · M4 · branch feat/spoken-replies

- [ ] 15.1 Add `POST /api/speech` (session required, text up to 600 characters, ElevenLabs text-to-speech with a stock voice, key server-side) and `src/components/voice/speak-reply.tsx` with a mute toggle; verify a reply plays audio and, with the key unset, the reply stays text with no error dialog
- [ ] 15.2 Mount the speaker in `assistant-panel.tsx` (one line); verify the 14.3 conversation still works with audio off

## 16. Submission package · wave 3 · M5 · branch docs/submission

- [ ] 16.1 Rewrite `README.md`: what ExportReady does, architecture diagram, setup, fixtures, the tests that actually ran, real integrations (Gemini, Brevo, ElevenLabs if done), known limits (durability, authenticity, no compliance claim); verify every claim matches merged code
- [ ] 16.2 Write `docs/pitch/deck-outline.md` (the plan's five slides) and `docs/pitch/video-script.md` (3-minute timeline, fictional-data notice); verify the script matches what the app actually does
- [ ] 16.3 Owner step: record the video (3 minutes or less), finish the deck, submit by 16:45; the worker ticks this after the owner confirms; verify the submission confirmation and that the video plays signed out

## Workflow follow-up

- After submission, delete `.claude/rules/hackathon-mode.md` and its index line so the normal rules apply again.
- Archive this change with `/opsx:archive` once every task is ticked; the roadmap stops tracking it then.
