# Video script

Target length: **2:45**. Hard limit: 3:00. Read the voice lines at a measured pace and cut a sentence before you run over.

**Fictional-data notice.** The first frame and the first sentence say that every company and document in the demo is fictional and not valid for commercial use.

**What is on `main` today.** Sign-in, the document and job APIs, the extraction and rules libraries, the assistant route, the Brevo sender, and the Vercel plus Railway deploy. `runAssessment` still throws. `/workspace` has no page. Buyer connections still throw. The chat panel renders nothing. ElevenLabs is not built.

**After merge.** The product block below is the demo to record once groups **11**, **13** and **17** are on `main`. Do not say those lines, and do not show a click-through, before that. A fallback block is at the end if you have to record earlier. The fallback does not pretend the two-sided flow works.

No line claims that a customer would pay, has asked for a price, or has agreed to buy.

## 0:00–0:12 — Title and fictional data

**On screen:** ExportReady. From Supplier Potential to Buyer Confidence. Under it: "Fictional demo. Not valid for commercial use."

**Voice:**

These documents are fictional. Lotus Mould and Neckar Maschinenbau are not real companies, and nothing on screen is a real certificate.

## 0:12–0:32 — Problem

**Voice:**

A European buyer looking for a Vietnamese manufacturer still qualifies suppliers from PDFs and email. They need capabilities, quality evidence, traceability, and a clear list of what is missing. For the supplier, showing that is often as hard as making the part.

## 0:32–0:52 — Solution

**Voice:**

ExportReady holds one buyer checklist. The supplier uploads the files they have. Gemini reads the text and returns an observation with the exact quote. Rules in our code set the status: documented, missing, mismatch, expired, or needs review. There is no score. The model is not asked to say the supplier is compliant.

**On screen if the report page is not merged yet:** the five status words, and the line "Statuses come from code." Do not show a fake report.

## 0:52–2:05 — Product (after groups 11, 13 and 17 merge)

**Director:** Record this block only when the workspace, the assessment pipeline and buyer connections are on `main`, and a local or production click-through has matched the answer key. The buyer account posts the request. The supplier account is Lotus Mould. Both people are signed in. Documents are the fixture PDFs.

**On screen for the whole block:** "Fictional demo documents."

**Voice:**

Here is that checklist with fictional data.

Neckar posts a request for cover cap CAP-104, revision B.

Lotus Mould responds with its product and shares one assessment: a material datasheet, an ISO certificate valid until 1 August 2026, an inspection report at revision A, and a packaging acceptance.

The buyer opens that shared result only. The datasheet is documented. The certificate is expired on 7 November 2026. The inspection report quotes revision A, so it mismatches revision B. There is no traceability record, so that row is missing. The packaging acceptance is documented. Three actions. No score. The buyer cannot download the files.

Lotus Mould replaces the inspection file with revision B and shares the new result. Only that row changes to documented. The expired certificate and the missing traceability record stay open. The buyer now sees two actions.

**On screen, in order:** the request, the upload, the shared report with the revision-A quote, the replaced file, the updated report with R3 documented.

**If a step fails on the day:** say what the screen actually did. Do not narrate the answer key over a different result.

## 2:05–2:28 — Business model to test

**Voice:**

The model we want to test is B2B2B. A basic passport the supplier can complete, and a pipeline that buyers, associations or a sponsored programme might pay for. We have not tested willingness to pay.

**On screen:** the five rows from section 5 of `docs/exportready-passport-idea.md`, plus the sentence "Willingness to pay has not been tested."

Leave out any interview result unless `docs/pitch/customer-learning.md` has a real row with consent. Never invent one.

## 2:28–2:45 — Close

**Voice:**

We start with Vietnamese manufacturers and European buyers. A supplier sees the exact gap. A buyer reads the evidence behind it. From supplier potential to buyer confidence.

**On screen:** the demo URL <https://exportready.vercel.app>, the team names the owner has filled in, and the tagline.

## Fallback if 11, 13 or 17 are still open

Use this **instead of** the 0:52–2:05 block. Keep the title, problem, solution, business and close. The video will run short. That is better than a demo the app does not do.

**Voice:**

The libraries that read the page, check the quote and decide the status are on main, and the app is deployed. The workspace screen, the live assessment and the buyer share are still merging, so this recording does not show that click-through. When they land, the demo is Neckar's request, Lotus Mould's shared report, and the second share after the inspection file is replaced.

**On screen:** <https://exportready.vercel.app> after sign-in, then the README architecture diagram. Do not tour an unfinished pull request as if it were production.
