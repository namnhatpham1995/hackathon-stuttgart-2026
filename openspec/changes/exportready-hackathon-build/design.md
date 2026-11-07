# Design

## Context

See proposal.md for why. Starting point on `main` (87f79e0): Next.js 16 App Router, Better Auth
(`user.id` is `text`), Drizzle with `casing: "snake_case"`, PostgreSQL 16 in Docker on port 5434,
Zod-validated `src/env.ts`, Vitest against a real test database recreated per run, Biome. There is no
storage, AI client, job runner, email or deploy target yet. GitHub Actions has not been running on PRs,
so the local pre-push hook (`pnpm verify`) is the only automatic gate.

Workers: the [D] controller with two workers, [O-1], [O-2] and [O-4] with two workers each, plus Cursor
agents. That is up to about eight lanes at once. Only machines that ran `pnpm dev:setup` have
PostgreSQL. `main` is production: there is no pre-prod branch.

The product behavior is fixed by `docs/exportready-hackathon-working-plan.md` and the specs in this
change. This design covers how to build it in parallel.

## Goals / Non-Goals

**Goals:**
- Every lane edits only files it owns, so PRs merge in any order within a wave without conflicts.
- Every merge to `main` builds and deploys, so the app is demoable after each merge.
- Progress is visible on the roadmap within a minute of a worker pushing.

**Non-Goals:**
- Durability across a crashed Railway process (see Decision 6).
- OCR, drawings, photos as evidence, editable requirement sets, public profiles, Exa, Page Agent,
  n8n, Wispr API integration (dictating with the installed Wispr app into the text box is allowed and
  needs no code).
- Archiving this change before submission: the roadmap reads its `tasks.md`.

## Decisions

### 1. Contract first, then lanes that own folders

Group 3 (the contract) is the only PR in wave 0 that touches shared files. It lands the schema, the one
migration, all dependencies, all environment variables, shared types and a stub for every function
another lane implements. A stub has the final signature and throws `new Error("not implemented: <name>")`.
Lanes then replace stub bodies in files they own.

```
 wave 0  [1 hackathon-mode rules]                               alone, docs-only, ~10 min
 wave 1  [2 roadmap] [3 CONTRACT] [4 fixtures]                  parallel, 3 gates wave 2
 wave 2  [5 pdf] [6 gemini] [7 rules] [8 docs] [9 jobs] [10 email] [11 UI] [12 deploy]
 wave 3  [13 integration] [17 connections]                      13 needs 5-11; 17 needs 8-11
 wave 4  [14 assistant] [15 voice, optional] [16 submission]
         [18 buyer backend] [19 buyer pages]                    parallel on the buyer contract stub
```

Group 1 merges before anything else is dispatched: until `hackathon-mode.md` is on `main`, workers
follow the normal rules (planner, up to three review rounds, no draft PR, pushes only at handoff
points), which would slow the contract and hide work from the roadmap.

| Group | Branch | Owns (creates or edits only these) | Needs |
|---|---|---|---|
| 1 | `chore/hackathon-mode` | `.claude/rules/hackathon-mode.md`, `.claude/rules/CLAUDE.md` (one index line) | - |
| 2 | `feat/live-roadmap` | `roadmap/**`, `vitest.config.ts` (include line), `biome.json` (includes) | 1 |
| 3 | `feat/assessment-contract` | `package.json`, `pnpm-lock.yaml`, `src/env.ts`, `.env.example`, `src/db/schema/exportready.ts`, `src/db/schema/index.ts`, `drizzle/**`, `src/proxy.ts`, `next.config.ts`, `vitest.golden.config.ts`, `src/lib/assessment/types.ts`, `src/lib/assessment/requirement-sets.ts`, `src/db/schema/exportready.test.ts`, all stub files below | 1 |
| 4 | `feat/demo-fixtures` | `fixtures/exportready/**`, `scripts/make-fixtures.ts` | 1 |
| 5 | `feat/pdf-text` | `src/lib/assessment/pdf-text.ts` (+ test) | 3, 4 |
| 6 | `feat/gemini-extraction` | `src/lib/assessment/extract-facts.ts`, `src/lib/assessment/gemini.ts` | 3, 4 |
| 7 | `feat/rules-engine` | `src/lib/assessment/rules.ts`, `src/lib/assessment/citations.ts` (+ tests) | 3 |
| 8 | `feat/document-upload` | `src/lib/products/**`, `src/lib/documents/**`, `src/app/api/products/**` | 3 |
| 9 | `feat/assessment-jobs` | `src/lib/jobs/**`, `src/app/api/jobs/**` (+ tests) | 3 |
| 10 | `feat/completion-email` | `src/lib/notify/**` | 3 |
| 11 | `feat/workspace-ui` | `src/app/workspace/**`, `src/components/workspace/**`, `src/app/page.tsx` (link) | 3 |
| 12 | `chore/production-deploy` | `scripts/vercel-build.mjs`, `docs/deploy.md` | 3 |
| 13 | `feat/assessment-integration` | `src/lib/assessment/pipeline.ts`, `src/lib/assessment/*.golden.ts` | 5-11 |
| 14 | `feat/workspace-assistant` | `src/lib/agent/**`, `src/components/assistant/**`, `src/app/api/assistant/**` | 13 |
| 15 | `feat/spoken-replies` | `src/components/voice/**`, `src/app/api/speech/**`, one mount line in `assistant-panel.tsx` | 14 merged |
| 16 | `docs/submission` | `README.md`, `docs/pitch/**` | 13 |
| 17 | `feat/buyer-supplier-connections` | `src/lib/connections/**`, `src/components/connections/**`, `src/app/connections/**` | 8-11 |
| 18 | `feat/buyer-workspace-backend` | `src/lib/buyer/**` (bodies only; the exported types and signatures are the contract) | buyer contract on `main` |
| 19 | `feat/buyer-workspace-ui` | `src/app/buyer/**`, `src/components/buyer/**`, one link line in `connections-nav.tsx` | buyer contract on `main`; 17 merged for the link and the click-through |

Every lane also ticks its own group's lines in this change's `tasks.md`. Groups are separate sections,
so those edits merge cleanly.

A lane that needs a shared file it does not own (a new dependency, an environment variable, a schema
column, a `next.config.ts` option) does not edit it. It adds a `Blocked:` note and the controller
dispatches a small serialized PR for it. At most one open PR may contain a migration at a time.

Alternative considered: let each lane add its own dependencies and columns. Rejected because every
lockfile and migration edit conflicts with every other one, and each conflict costs a rebase plus a
full verify run.

Stub files created by group 3: `src/lib/assessment/{pdf-text,extract-facts,gemini,rules,citations,pipeline}.ts`,
`src/lib/products/service.ts`, `src/lib/documents/service.ts`, `src/lib/jobs/service.ts`,
`src/lib/notify/completion-email.ts`, `src/lib/notify/brevo.ts` (`sendBrevoEmail`, filled by group 10),
`src/lib/connections/service.ts`, and the slot components `src/components/assistant/assistant-panel.tsx`,
`src/components/connections/connections-nav.tsx`, `product-connections.tsx` and `report-share.tsx`
(each renders nothing until its lane fills it). Group 11 mounts every slot from the start
(`<AssistantPanel />` and `<ConnectionsNav />` in the workspace layout, `<ProductConnections productId />`
on the product page, `<ReportShare resultId />` on the report page), so groups 14 and 17 never edit
group 11's files.

### 2. Data model (one migration, in group 3)

All tables are new, snake_case, in `src/db/schema/exportready.ts`. Ownership is `product.user_id`, and
every other row reaches a user through `product`.

- **`product`**: `id text pk`; `user_id text not null references user(id) on delete cascade`;
  `requirement_set_key text not null`; `requirement_set_version integer not null`; `name text not null`;
  `fields jsonb not null default '{}'`, holding `{supplierName, partNumber, revision, material,
  packaging}` as `{value, origin: "user"|"assistant"|"document"}`, validated with Zod;
  `profile jsonb not null default '{}'`, holding the declared supplier profile `{companyName, country,
  productCategory, capabilities: string[], targetMarket}`, validated with Zod and never read by the
  assessment; `listed boolean not null default false` (shown in the supplier directory); timestamps.
  Index on `user_id`.
- **`document`**: `id text pk`; `product_id text not null references product(id) on delete cascade`;
  `filename text not null`; `mime_type text not null check in ('application/pdf','image/jpeg','image/png')`;
  `kind text not null check in ('evidence','photo')`; check that `kind = 'evidence'` implies a PDF;
  `size_bytes integer not null check (size_bytes > 0 and size_bytes <= 4194304)`; `sha256 text not null`;
  `content bytea not null`; `state text not null check in ('pending','active','inactive')`;
  `replaces_document_id text references document(id)`; `created_at`. Index on `(product_id, state)`.
- **`assessment_job`**: `id text pk`; `product_id text not null references product(id) on delete cascade`;
  `requirement_set_key`, `requirement_set_version`; `document_set_hash text not null`;
  `document_ids text[] not null` (the frozen snapshot); `status text not null check in
  ('QUEUED','PROCESSING','COMPLETED','NEEDS_ATTENTION')`; `stage text check in
  ('extracting_text','extracting_facts','checking_rules','saving')`; `error text`;
  `attempts integer not null default 0`; `result_id text references assessment_result(id)`;
  `created_at`, `started_at`, `finished_at`. **Unique** `(product_id, requirement_set_key,
  requirement_set_version, document_set_hash)` (idempotent start). **Check** `status <> 'COMPLETED' or
  result_id is not null` (never completed without a stored result).
- **`assessment_result`**: `id text pk`; `job_id text not null unique references assessment_job(id) on
  delete cascade`; `product_id text not null references product(id) on delete cascade`;
  `assessment_date date not null`; `complete boolean not null`; `findings jsonb not null`;
  `documents jsonb not null` (id, filename, sha256 per assessed document); `created_at`.
- **`buyer_request`**: `id text pk`; `buyer_user_id text not null references user(id) on delete cascade`;
  `buyer_org_name text not null`; `title text not null`; `part_number text not null`;
  `requirement_set_key text not null`; `requirement_set_version integer not null`; `message text check
  (char_length(message) <= 1000)`; `visibility text not null check in ('open','direct')` (`direct` is
  created by a buyer's "Request evidence" and stays off the board); `status text not null default 'open'
  check in ('open','closed')`; `created_at`. Index on `(status, visibility)`.
- **`request_connection`**: `id text pk`; `request_id text not null references buyer_request(id) on delete
  cascade`; `product_id text not null references product(id) on delete cascade`; `initiated_by text not
  null check in ('buyer','supplier')`; `status text not null check in
  ('requested','in_progress','shared','declined')`; `message text check (char_length(message) <= 1000)`;
  `shared_result_id text references assessment_result(id)`; `created_at`, `updated_at`. **Unique**
  `(request_id, product_id)`. **Check** `status <> 'shared' or shared_result_id is not null`. That the
  shared result belongs to the connected product, and that buyer and supplier are different users, is
  checked in the service, since a check constraint cannot read other rows.
- **`notification`**: `id text pk`; `job_id text references assessment_job(id) on delete cascade`;
  `connection_id text references request_connection(id) on delete cascade`; `recipient_user_id text not
  null references user(id) on delete cascade`; `recipient_email text not null`; `type text not null check
  in ('assessment_completed','request_received','report_shared')`; `title text not null` (the inbox line);
  `read_at timestamptz`; `status text not null check in ('pending','sent','failed')`;
  `provider_message_id text`; `error text`; `attempts integer not null default 0`; `created_at`, `sent_at`.
  **Check** that `assessment_completed` has a `job_id` and no `connection_id`, and the two connection
  types have a `connection_id` and no `job_id`. **Unique** `(job_id, recipient_email, type)`; a re-share
  is a new notice, so connection notices are not unique per connection. Index on
  `(recipient_user_id, created_at)` for the inbox.

The job and result tables reference each other (`assessment_job.result_id` and
`assessment_result.job_id`). Both columns are nullable or inserted in order inside one transaction:
insert the result, then update the job to COMPLETED with its `result_id`.

The requirement set is code, not a table: `src/lib/assessment/requirement-sets.ts` exports
`neckar-cap-104` v1 with R1-R5, each with `kind`, a `dimension` (`quality`, `product_material`,
`traceability`, `packaging_logistics`; R1 product_material, R2 and R3 quality, R4 traceability, R5
packaging_logistics) and expected values (part `CAP-104`, revision `B`,
material `ABS`, grade `LM-ABS-01`, supplier `Lotus Mould Co., Ltd.`, packaging `PKG-07` rev `2`).
Alternative considered: a table. Rejected because there is no editor UI, and seeding production adds a
deploy step.

The "five active PDFs per product" limit is checked in code, since PostgreSQL cannot express a count
limit as a check constraint.

### 3. Sessions

Pages `/workspace`, `/workspace/[productId]` and `/workspace/[productId]/report` call
`requireSession()`. Route handlers `POST /api/products/[productId]/documents`, `GET /api/jobs/[jobId]`
and `POST /api/assistant` call `auth.api.getSession()` and return 401 without one. Every server action
and service function takes the session's `userId` and filters by `product.user_id`; a mismatch returns
404. `src/proxy.ts` adds `/workspace` and `/connections` to its matcher as a fast pre-check only.

The connection pages under `/connections` also call `requireSession()`. Board and directory reads are
open to any signed-in user but select only the listed columns (never documents, results or emails). A
connection, its messages and its shared result are readable only when the session user is the request's
buyer or the product's owner; anyone else gets 404.

### 4. Evidence pipeline

```
 active docs (bytea) --> pdf-text: pages[{documentId, filename, page, text}]
        |                    | empty text -> mark incomplete
        v                    v
 requirement set ---> extract-facts (Gemini, structured output, temperature 0)
                          -> observations[{requirementId, field, value, documentId, page, quote}]
                                 |
                                 v
                     citations: drop any citation whose doc/page is unknown
                                or whose quote is not on that page (whitespace-normalised)
                                 |
                                 v
                     rules: per requirement, code compares observed vs expected
                            (dates, part, revision, supplier, grade) -> Finding
                                 |
                                 v
                     result row + job COMPLETED + notification row (one transaction)
```

- Text extraction uses `unpdf`, page by page. Gemini receives page-labelled text, not the PDF bytes, so
  every quote can be checked against exactly the text we hold.
- The prompt is the plan's extraction instruction. It asks for observations and quotes only, never
  statuses, and never includes expected outcomes. Expected values are passed only so the model knows
  which facts to look for.
- Rules decide every status. A requirement with no valid observation in a complete set is MISSING. An
  incomplete set gives NEEDS_REVIEW. Identity checks (supplier, part) run before the revision check, so
  a wrong part never counts as support.
- The dimension summary, action plan and document-request draft are pure functions of the stored
  findings and the requirement set (`src/components/workspace/report-summary.ts`, owned by group 11),
  with no extra model call. The same findings therefore always give the same plan, and the assistant
  can quote it.
- Ideas from `docs/exportready-passport-idea.md` that are left out: numeric readiness scores (the spec
  forbids a score), public signed-out passports (a report is shared only with one signed-in buyer
  through a connection, Decision 16), buyer-entered requirements (buyers pick a fixed requirement set;
  there is no editor), free-form message threads, compliance conclusions, and Supabase (the stack is
  Postgres with Drizzle on Railway).
- Alternative considered: let Gemini output statuses. Rejected because R2 and R3 are what the demo
  shows, and code makes them deterministic and testable without an API key.

### 5. Gemini access

The client is `@google/genai` with `GEMINI_API_KEY`. Production `GEMINI_MODEL` is
`gemini-3.6-flash`. The owner chose it; Gemini 3.8 Flash was too slow. Group 6 wraps the client in
`gemini.ts` (retry twice with backoff, a 60 s timeout), and group 14 reuses it for function calling,
so no second AI dependency is added. The key stays server-side.

### 6. Jobs: stored state, run after the response

- The start action computes `document_set_hash` (sha256 of the sorted `sha256`s of the active
  documents) and inserts the job with `on conflict do nothing`, then returns the existing or new job.
- The runner claims the job with `update ... set status='PROCESSING' where id=$1 and status='QUEUED'
  returning *`. Zero rows means another runner has it.
- The start action schedules the runner with Next's `after()`, so it keeps running when the user closes
  the tab.
- In production the job runner must run on Railway. Railway has no function timeout. Start it from a
  Railway-served `/api` route, not from a Vercel server action: `after()` there still ends with that
  function.
- Status reads re-queue a job stuck in PROCESSING for more than 5 minutes (up to 2 attempts). That is
  the recovery path when the Railway process dies mid-job.
- The UI polls `GET /api/jobs/[jobId]` every 2 s while the job is not final. The model never polls.
- Alternative considered: Vercel Workflow or n8n. Rejected for today because each is new infrastructure
  on demo day. The README states that durability across a crashed process is limited to this re-queue.

### 7. Uploads go through a route handler, one file per request

Server Actions default to a 1 MB body, so uploads do not use them. The UI posts each file to
`POST /api/products/[productId]/documents` as `multipart/form-data`, one file per request, and the
file cap is 4 MB (the plan suggested 5 MB). In production that route is served by Railway
(Decision 11). Vercel's 4.5 MB function body limit does not apply there, and Railway has no function
timeout. Files land as `pending`.
"Upload and assess" turns pending into active (and replaced documents into inactive) in one
transaction, then starts the job.

### 8. Completion email (Brevo)

A notification row is inserted in the same transaction that completes the job. After commit,
`sendCompletionEmail(notificationId)` claims it (`pending` to sending, by update-where), calls
`POST https://api.brevo.com/v3/smtp/email` with `api-key: BREVO_API_KEY`, sender
`BREVO_SENDER_EMAIL`, the fixed template and the link `${APP_BASE_URL}/workspace/<productId>/report`.
It then stores `messageId` or the error. Without a configured key it marks the notification failed
with "email not configured" and the report is unaffected. The HTTP call itself lives in
`src/lib/notify/brevo.ts` (`sendBrevoEmail({to, subject, text})`), which group 17 reuses for connection
notices.

### 9. Assistant: server-side function calling plus client directives

`POST /api/assistant` receives the message history and the current product ID and runs Gemini
function calling for at most 5 rounds.

- **Server tools** (`get_workflow_state`, `update_product_draft`, `start_assessment`,
  `get_assessment_status`) call the same services as the manual UI, with the session's `userId`.
- **Browser tools** (`navigate_workspace`, `show_upload_card`, `show_report`, `request_replacement`)
  are not executed on the server. They are validated, then returned as `directives[]`, which
  `<AssistantPanel />` applies through a small client event bus that the workspace components
  subscribe to.

History lives in the panel's state only. The source of truth is the database.

### 10. Live roadmap: separate static project, data from GitHub

```
 browser (roadmap/index.html, vanilla JS, polls every 30 s)
      |  GET /api/progress
      v
 roadmap/api/progress.ts  (Vercel function, Cache-Control: s-maxage=20, stale-while-revalidate=60)
      |  one GitHub GraphQL query with GITHUB_TOKEN (server-only):
      |    main:openspec/changes/exportready-hackathon-build/tasks.md
      |    open PRs: number, url, isDraft, headRefName, updatedAt, head:<tasks.md>
      v
 roadmap/lib/parse-tasks.ts (pure): groups, ticks, Blocked notes, heading metadata
      +  roadmap/milestones.json (M0-M5 with target times and group numbers)
```

- It is a **separate Vercel project** with root directory `roadmap/` and no framework. That way it is
  up from minute one and stays up when the app's build breaks. It needs no rebuild for progress,
  because data is read at request time. Its "Ignored Build Step" skips builds unless `roadmap/` changed.
- **Heading convention** (the parser's contract):
  `## <n>. <title> · wave <w> · <milestone id> · branch <type>/<slug>`. Indented `- Blocked: <reason>`
  under a task marks the group Blocked.
- **Status rules** (first match wins):
  - Blocked: a Blocked note exists.
  - Done: all ticked on `main`.
  - Merged, verifying: every task except those marked `(post-merge)` is ticked on `main` and no open
    PR uses the branch.
  - Ready to merge: a non-draft open PR with every non-post-merge task ticked.
  - In progress: an open PR exists.
  - Not started: otherwise.
- **Without `GITHUB_TOKEN`** it falls back to `raw.githubusercontent.com` for `main` only. The repo is
  public, but that CDN caches for about 5 minutes and shows no PRs.
- The parser is unit-tested from strings, which keeps it fast and needs no network.
- Alternative considered: a `/roadmap` route inside the app. Rejected because it would go down
  whenever the app's build or database broke, which is exactly when the owner needs it most.
- Alternative considered: a hand-edited `roadmap.json`. Rejected because agents would forget it, and it
  duplicates `tasks.md`.

### 11. Production deploy from `main`

The same codebase is deployed twice. There is no Neon database.

- **Railway** runs the full Next.js server and a Railway PostgreSQL service. All `/api/*` routes
  (auth, uploads, jobs, assistant) are served from Railway, and the job runner runs there (Decision
  6): no 4.5 MB body limit and no function timeout. `DATABASE_URL` on that service is
  `${{Postgres.DATABASE_URL}}`. `railway.json` records Railpack, build `pnpm build`, pre-deploy
  `pnpm db:migrate`, start `pnpm start` (listens on `$PORT`), and healthcheck `GET /api/health`.
  Node 22 is pinned with `RAILPACK_NODE_VERSION=22`. A project created now does not read
  `railway.json` (Config as Code is closed to new services; the file stops being read on
  2026-12-01), so the owner copies those settings onto the service. `docs/deploy.md` has the steps.
- **Vercel** serves pages and the UI. `next.config.ts` rewrites `/api/:path*` to
  `${BACKEND_URL}/api/:path*` only when `BACKEND_URL` is set (unset in local dev and on Railway),
  and the rewrite is `beforeFiles` so Vercel does not serve its own `/api` routes. The browser stays
  on the Vercel origin, so Better Auth cookies keep working. Vercel never migrates. Its server
  components and server actions read the same Railway Postgres through `DATABASE_URL` (Railway's
  public connection URL). The build command is `node scripts/vercel-build.mjs`, which runs
  `next build` only. Preview deployments stay off.
- `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` are identical on both. `BETTER_AUTH_URL` and
  `APP_BASE_URL` are the Vercel origin. Railway also gets `GEMINI_API_KEY`, `GEMINI_MODEL`
  (`gemini-3.6-flash`), `BREVO_API_KEY` and `BREVO_SENDER_EMAIL`.
- Rollback is redeploying the previous Railway deployment and promoting the previous Vercel
  deployment. Migrations here are additive only.

### 12. Hackathon-mode rules (group 1)

`.claude/rules/hackathon-mode.md`, valid until submission on 2026-11-07, overrides:

- **No planner.** This design and the group's tasks are the plan; `full-feature-develop`'s planner
  step is skipped.
- **Review.** One `independent-pr-reviewer` pass (Opus) only for groups 3, 7, 9, 13 and 17. It covers the
  code and the tests that group adds, with at most one fix round. Other groups get the controller's
  diff read.
- **Merge.** Merge on a green local pre-push hook. Do not wait for GitHub CI. Before asking for the
  merge, the worker runs `git merge origin/main` (no rebase), resolves its own `tasks.md` lines, and
  pushes; the hook then verifies the combined code. The controller merges with
  `gh pr merge --squash --match-head-commit`.
- **Claim protocol.**
  1. The branch is fixed by the group heading.
  2. Before starting, run `git ls-remote origin <branch>` and `gh pr list --head <branch>`. If either
     shows something, the group is taken.
  3. Commit the first ticked task, push, and immediately `gh pr create --draft`.
  4. Mark the PR ready when every task is ticked.
- **Push cadence.** Push after every ticked task, not only at the four handoff points, so the roadmap
  moves.
- **Tests.** Only the tests named in the tasks. The golden tests run with `pnpm test:golden` by hand,
  not in `pnpm verify`.
- **Review head.** After a PASS, the only commit allowed before the merge is the tick of that group's
  review task in `tasks.md`. Any code change after a PASS needs a new review.
- **Post-merge tasks.** A task marked `(post-merge)` can only be checked once its group is on `main`
  (production deploys, live roadmap URL, submission). A PR may merge with only those tasks unticked.
  Afterwards the controller ticks them in a small docs-only PR (`docs/tick-<group>`), which the hook
  skips. The roadmap shows such a group as "Merged, verifying".
- **Archive.** Do not archive this change until after submission.
- **Kept unchanged:** worktrees, never committing to `main`, the pre-push hook with no `--no-verify`,
  no secrets, session checks, one migration PR at a time.

### 13. Lean test set

| Test | Group | Kind |
|---|---|---|
| ISO certificate valid to 2026-08-01, assessed 2026-11-07, gives EXPIRED; revision A vs B gives MISMATCH; wrong part never supports | 7 | pure |
| Quote not on cited page is dropped and the finding becomes NEEDS_REVIEW; unknown document ID is dropped | 7 | pure |
| Fixture PDFs give page-labelled text containing their key values; a PDF with no text is flagged empty | 5 | pure, reads `fixtures/` |
| Same snapshot started twice returns one job; direct duplicate insert is rejected by the unique index | 9 | real PG |
| Another user's job returns 404 | 9 | real PG |
| Roadmap parser: ticks, Blocked notes, heading metadata, status rules | 2 | pure |
| Report summary: dimension counts and action plan for the baseline and the corrected findings | 11 | pure |
| Buyer workspace: another buyer's requests never appear; unlisted and own products are absent from the catalog; no email in any result | 18 | real PG |
| Connections: the buyer sees only the shared result; a third user gets 404; a duplicate connection and a shared status without a result are rejected by the database | 17 | real PG |
| Golden baseline: documents 01-04 match the answer key | 13 | live Gemini, `pnpm test:golden` |
| Golden correction: replacing 03 with 05 flips only R3 | 13 | live Gemini, `pnpm test:golden` |

Expected values come from `fixtures/exportready/answer-key.json` and the plan, never from the code under
test. The answer key is read only by tests.

### 14. Fixtures without a dependency

`scripts/make-fixtures.ts` writes one-page, text-based PDFs with a minimal hand-written PDF serializer
(Helvetica, WinAnsi, a correct xref table). It needs no new dependency, so group 4 runs in parallel with
the contract. The generated PDFs and `answer-key.json` are committed, and each page carries
"FICTIONAL DEMO DOCUMENT - NOT VALID FOR COMMERCIAL USE". Fallback: if `unpdf` cannot read them, group 5
adds a `Blocked:` note and the controller dispatches a one-file swap to `pdf-lib` through a small
contract follow-up PR.

### 15. Where lanes can run

Every push of a code change runs `pnpm verify`, and `test/global-setup.ts` fails hard without
PostgreSQL on `localhost:5434`. So any agent that pushes code needs a machine where `pnpm dev:setup`
has run and `pnpm db:up` is running, even for pure lanes.

| Lane needs | Groups | Run on |
|---|---|---|
| Docs only (hook skips) | 1, 16 | any agent, including Cursor cloud agents |
| Node, no database in the code itself | 2, 4, 5, 7, 11, 19 | [D] / [O-x] workers, or a Cursor agent on a set-up machine |
| Gemini key in `.env` | 6, 13, 14 | a worker whose `.env` has `GEMINI_API_KEY` |
| PostgreSQL used by the code | 3, 8, 9, 10, 13, 17, 18 | [D] / [O-x] workers |
| Owner's dashboards (Vercel, Railway, Brevo, GitHub token) | 2, 12 | worker prepares; owner clicks |

A Cursor cloud agent may write code for a pure lane, but its branch is then pushed by a [D] or
[O-x] worker that merges `origin/main` and lets the hook run. Never `--no-verify`.

### 16. Buyer-supplier connections (group 17)

```
 buyer: /connections/requests/new --> buyer_request (open)  --> board /connections/requests
 supplier: "Respond" with an existing or new product ------------+
                                                                  v
                                                       request_connection (initiated_by)
                                                                  ^
 buyer: "Request evidence" on a listing in /connections/suppliers  (creates a direct request)
                                                                  |
 supplier: <ReportShare /> on a completed result --> status shared, shared_result_id
                                                                  |
 buyer: /connections/[connectionId] renders that one result with the workspace report components
 both: notices in /connections/inbox, plus one Brevo email each to the recipient's own address
```

- All writes go through `src/lib/connections/service.ts`, which takes the session's `userId` and checks
  the caller's side before every change: only the request's buyer closes a request or asks for evidence
  on a listing, only the product's owner responds, lists a product or shares a result.
- Responding with a new product creates it through group 8's `createProduct` with the request's
  requirement set, then links it. The supplier then uploads and assesses as usual.
- Sharing stores the result ID on the connection. The buyer's page loads exactly that result by joining
  through the connection, so a later assessment stays invisible until it is shared again. Documents are
  never served to the buyer: the report shows filenames, pages and quotes from the stored findings only.
- The buyer view reuses group 11's report components read-only. If they need a prop to hide the
  supplier's actions, group 17 adds a `Blocked:` note and the controller dispatches a one-line follow-up,
  rather than group 17 editing group 11's files.
- Notices are inserted in the same transaction as the connection or the share. The Brevo call runs after
  commit, and its failure only marks the notice failed. Neither notice names the sender's email address;
  it names the organisation (buyer) or the supplier profile's company name.
- Cut order if time runs short: the supplier directory and "Request evidence" go first; the board,
  respond, share and inbox are the demo path and stay.
- Alternative considered: public share links for reports. Rejected because they leak documents' quotes to
  anyone with the URL and need expiry and revocation; a connection scopes the share to one signed-in
  buyer.

### 17. Buyer workspace (groups 18 and 19)

Group 17 gives the buyer separate pages (board, directory, inbox, a shared report) but no home. The
buyer workspace at `/buyer` adds one: the buyer's own requests with their suppliers and statuses, and a
searchable catalog of listed products. It was added while group 17 was already in progress, so it
never edits group 17's files except one nav link after 17 merges.

```
 contract on main:  src/lib/buyer/service.ts  (types, signatures, stubs that throw)  +  /buyer in proxy.ts
        |                                         |
 group 18 (backend)                        group 19 (pages)
   fills the bodies with Drizzle             /buyer, /buyer/products, /buyer/products/[id]
   reads buyer_request,                      calls the buyer service, plus group 17's
   request_connection, product               requestEvidence for "Request evidence"
   + real-PG test                            links to /connections/requests/new and /connections/[id]
        _______________ both merge, then 19.6 clicks through _______________/
```

- **No migration.** Everything reads existing columns: `buyer_request.buyer_user_id`, `status`,
  `visibility`; `request_connection.status`, `initiated_by`, `shared_result_id`; `product.listed`,
  `fields` (part number) and `profile` (company, country, category).
- **Scoping.** Every query filters by the caller: `listMyRequests` by `buyer_user_id`, the catalog by
  `listed = true` and another owner. The catalog selects listing columns only, so no document, result or
  email can leak, and the report itself is still read only through group 17's connection page.
- **Contract first.** The planning PR that added these groups also landed `src/lib/buyer/service.ts`
  with final types and stubs, and `/buyer` in the proxy matcher, so groups 18 and 19 start at the same
  time and touch disjoint files. Group 18 may not change an exported type or signature; if it must, it
  adds a `Blocked:` note and the controller changes the contract in a small PR.
- **Review.** No Opus pass, to fit before the feature freeze: the backend is read-only queries plus one
  update-where, and 18.4 tests every scoping rule against real PostgreSQL. The controller reads both
  diffs.
- **Cut order.** Closing a request (18.3, 19.4) goes first, then the filters (text search stays). The
  home list and the catalog with "Request evidence" are the demo path.
- Alternative considered: re-split group 17 into backend and frontend groups. Rejected because group 17
  was already claimed with a draft PR, and rewriting its tasks would collide with that worker.

## Risks / Trade-offs

- [Contract PR is late, so wave 1 waits] → Keep it to schema, types and stubs only. It gets the first
  worker and the first review slot, with a 45-minute timebox.
- [Two lanes need the same shared file] → `Blocked:` note plus a serialized follow-up PR; lanes never
  edit unowned files.
- [Merged lanes break each other at type level] → Merging `origin/main` into the branch before the merge
  request makes the pre-push hook verify the combined code.
- [Gemini extraction is inaccurate on fixtures] → The rules and citation checks decide statuses. Group 13
  tunes the prompt against the golden test. The cut rule is text-based PDFs only.
- [Vercel 4.5 MB body limit] → Does not apply to `/api/*` in production. Those routes run on Railway,
  which has no 4.5 MB body limit. Uploads stay one file per request, with the app's 4 MB cap. Server
  Actions stay at their 1 MB default and are not the upload path.
- [Railway process dies mid-job] → Re-queue on status read for jobs stuck in PROCESSING. The README
  states the limit honestly. The runner must run on Railway, not in a Vercel server action.
- [Brevo sender not verified in time] → The notification is marked failed and the report still works.
  The demo then shows the stored report and states that email is unfinished. A mocked email is never
  shown.
- [Roadmap GitHub token missing or rate-limited] → It falls back to `main`-only data with a visible
  notice. The GraphQL call is one request per 20 s cache window.
- [Hackathon mode skips reviews on most lanes] → The critical lanes (contract, rules, jobs and access,
  integration, buyer connections) keep one Opus review, and session checks are never skipped.
- [Lane runs on a machine without PostgreSQL] → Section 15 assigns lanes by need.

## Migration Plan

1. Merge this proposal PR (docs only). Start PostgreSQL (`pnpm db:up`) on every worker machine.
2. Wave 0: group 1 alone; merge it at once.
3. Wave 1, in parallel: groups 2, 3, 4. The owner creates the roadmap Vercel project and token when
   group 2 asks.
4. After group 3 merges: start groups 5-12 in parallel. Group 12 puts the UI on Vercel and the
   Next.js server plus PostgreSQL on Railway; from then on every merge to `main` deploys both.
5. After groups 5-11 merge: group 13, then the golden tests. Group 17 starts as soon as 8-11 merge,
   in parallel with 13.
6. Then groups 14, 16 and optionally 15. Groups 18 and 19 start together once the buyer contract is on
   `main`. Feature freeze at 15:15.
7. Rollback: redeploy the previous Railway deployment and promote the previous Vercel deployment.
   The schema is additive, so no down-migration is needed.

## Open Questions

- The production domain for `APP_BASE_URL` and `BETTER_AUTH_URL`, known once group 12 creates the
  Vercel project. Production `GEMINI_MODEL` is `gemini-3.6-flash` (Decision 5).
