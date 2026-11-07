# Deck outline

Six slides for the ExportReady submission deck. Turn this into a PDF. Keep the tagline **From Supplier Potential to Buyer Confidence.**

Claims below match `main` on 2026-11-07 unless a line says **After merge**. Those lines depend on groups 11 (workspace and report), 13 (end-to-end assessment) and 17 (buyer–supplier connections). Do not present an **After merge** line as something the live app already does. Screenshots wait for group 11. See the placeholder in `README.md`.

Willingness to pay has not been tested. Do not put a price, a customer quote or a "buyers will pay" line on any slide.

## 1. Problem and target customers

**On slide**

- A European machinery or automotive buyer looking for a Vietnamese manufacturer still qualifies suppliers from PDFs, spreadsheets, certificates and email.
- The buyer needs capabilities, quality evidence, traceability, origin documents and a clear list of what is missing.
- For the supplier, showing that evidence is often as hard as making the part.
- We start with Vietnamese manufacturers entering European supply chains.

**Speaker note**

This is the problem as written in `docs/exportready-passport-idea.md`. Customer interviews are Phuong's step (task 16.3) and are not filled in. If `customer-learning.md` is still empty on submission day, say the problem is the one we set out to test, and that interview notes are not in yet.

## 2. Solution

**On slide**

- The supplier uploads the documents they have against one fixed buyer checklist.
- Gemini (`gemini-3.6-flash`) returns observations and an exact quote. It does not return a status.
- Rules in code decide `DOCUMENTED`, `MISSING`, `MISMATCH`, `EXPIRED` or `NEEDS_REVIEW`.
- Each finding has a reason and a next action. There is no score and no compliance claim.
- Four dimensions group the rows: Quality, Product and material, Traceability, Packaging and logistics.

**Speaker note**

This is on `main` as libraries and tests. A live smoke of fixtures 01–04 on `gemini-3.6-flash` passed three times: the inspection file yielded revision A, and the certificate yielded validity end 2026-08-01. That smoke is not a full assessment job. The page that shows a report is **After merge** (group 11), and the job that runs the steps in production is **After merge** (group 13). Say "the engine decides this" if the screen is not merged yet. Say "the report shows this" only after group 11 and group 13 are on `main`.

The demo checklist is `neckar-cap-104`: cover cap CAP-104, revision B, ABS grade LM-ABS-01, for fictional buyer Neckar Maschinenbau GmbH and fictional supplier Lotus Mould Co., Ltd.

## 3. Product demo

**On slide**

- Banner on the slide: **Fictional demo documents. Not valid for commercial use.**
- Frames to capture after groups 11, 13 and 17 merge. Do not draw mock screens.

**After merge — frames**

1. Buyer: Neckar posts "Cover cap CAP-104 rev B".
2. Supplier: Lotus Mould uploads the four baseline files and shares the result.
3. Buyer, signed in, reads that one result. No document download.
   - R1 material datasheet: `DOCUMENTED`
   - R2 ISO certificate valid until 2026-08-01: `EXPIRED` on 2026-11-07
   - R3 inspection report at revision A: `MISMATCH`, with the quote from that page
   - R4 traceability record: `MISSING`
   - R5 packaging acceptance for PKG-07 revision 2: `DOCUMENTED`
   - Three open actions (R2, R3, R4). No percentage.
4. Supplier replaces the inspection file with revision B, re-assesses and shares again.
5. Buyer sees R3 `DOCUMENTED` and two open actions (R2, R4).

**Speaker note**

The answer key in `fixtures/exportready/answer-key.json` is what those frames must show. The golden test that checks it is group 13 and is not on `main` yet. Until the three groups merge, this slide stays a caption list, and the live UI is <https://exportready.vercel.app> with sign-in and no workspace page.

`<!-- screenshots: add after group 11 merges -->`

## 4. Market and the business model to test

**On slide**

We would test a B2B2B model rather than charge individual SMEs on day one.

| Who | Model to test |
|---|---|
| Vietnamese SMEs | Free basic passport; paid advanced assessment |
| European buyers | Subscription for supplier discovery and qualification |
| Industry associations | Sponsored supplier-readiness programmes |
| Consultants and service providers | Paid expert services and referrals |
| Development organisations | Sponsored SME readiness programmes |

The commercial hypothesis: buyers and associations may pay for a better-qualified supplier pipeline, and SMEs get a way to show what they can already do.

**On the slide, in the same size as the table:** Willingness to pay has not been tested.

**Speaker note**

Copied from section 5 of `docs/exportready-passport-idea.md`. No interview in this repo supports a price. If 16.3 is still empty, do not imply that anyone agreed to pay.

## 5. Competitive differentiation

**On slide**

- The buyer reads a quote that was checked against the page, not a summary with no source.
- Statuses come from rules. An expired date, a wrong revision and a wrong part are decided in code.
- The supplier gets the next document to add. The baseline story leaves three concrete actions, then two after the revision fix.
- One signed-in buyer sees one shared result. A later assessment stays hidden until the supplier shares it again. **After merge** (group 17).
- The report is not a certificate, not a public link and not a score.

**Speaker note**

Compare with the way qualification works today: a pile of files in email. Do not name a competitor we have not researched. The "one shared result" line stays off the spoken track until group 17 is on `main`. The quote check, the rules and the "no score" line are true of the code on `main`.

## 6. Team and roadmap

**On slide**

- Team: Phuong, Nam, and the other people on the team.
- Who did what: leave blank until the owner fills the same list in `README.md`.

**On main**

- Checklist, PDF text, citation checks, rules, document and job APIs, Gemini extraction library, assistant API (no chat panel), Brevo sender, production UI on Vercel and API plus Postgres on Railway.

**Still open at the time of this outline**

- Workspace, report and action plan (PR #11).
- End-to-end runner and golden test (group 13).
- Buyer requests, sharing and the buyer's read-only report (PR #22).
- Assistant chat panel (task 14.3). Spoken replies are optional and not started (group 15).
- Magic-link sign-in (PR #20). Live roadmap page (group 2).

**After submission**

- Remove hackathon mode and archive the change once every task is ticked.
- Customer learning stays a record of real conversations only.

**Speaker note**

Demo URL: <https://exportready.vercel.app>. API: <https://exportready-production.up.railway.app>. Submission time is 16:45 Europe/Berlin on 2026-11-07.
