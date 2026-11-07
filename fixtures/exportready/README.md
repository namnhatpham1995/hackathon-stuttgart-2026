# TradeReady demo fixtures

These files are test-only. They are fictional demo documents for the TradeReady assessment.

Never send `answer-key.json`, or any expected outcome in it, to the model. A live assessment receives the PDF text and the buyer requirements, not this answer key.

Regenerate the PDFs with `pnpm exec tsx scripts/make-fixtures.ts`. That command does not rewrite `answer-key.json`.

`rows` in `answer-key.json` copies section 4 of `docs/exportready-hackathon-working-plan.md` line by line, including the word `Unchanged`. `baseline.findings` and `correction.findings` are those rows with `Unchanged` resolved to the initial status. `baseline` covers documents 01-04. `correction` replaces `03_CAP104_Inspection_RevA.pdf` with `05_CAP104_Inspection_RevB.pdf` and changes only R3. `trap` and `empty` are the two extra files: the RevB filename whose body is revision A still yields R3 `MISMATCH`, and `empty.pdf` makes the result incomplete.

`empty.pdf` has no text operators and no footer, so nothing on the page is selectable. Every other page ends with `FICTIONAL DEMO DOCUMENT - NOT VALID FOR COMMERCIAL USE`.
