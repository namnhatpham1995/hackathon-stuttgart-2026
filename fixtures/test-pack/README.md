# Supplied scenario test pack

The sixteen PDFs are the original fictional test documents from the shared Drive folder. `drive-manifest.json` records each source URL, byte count and SHA-256 digest. The existing TC01 copies match the current Drive files byte-for-byte.

The Google Doc and pack guide define TC01 through TC05. `scenarios.json` records the uploaded file sets and expected findings for the existing six-requirement `neckar-cap-104-qualification` checklist, assessed on 7 November 2026.

## Ground-truth conflicts

- The Google Doc retains older references to five requirements. The supplied buyer requirements PDF explicitly defines R1 through R6, which the tests use.
- TC02's separate buyer PDF requires both the product specification and inspection report to identify Revision B. The saved six-requirement checklist's R1 checks product identity, while R3 checks inspection revision. Product-specification revision is an additional requirement the existing checklist does not validate. The report distinguishes that coverage gap from inspection detection.
- TC04 contains three PDFs only. In addition to traceability, it lacks a certificate and packaging specification. Those findings remain missing.
- The supplied TC05 replacement corrects the product specification, while TC02's inspection report remains Revision A. Therefore the stated expectation that inspection R3 becomes documented conflicts with the remaining evidence. The original supplied replacement is tested separately from an inspection-correction control using TC01's Revision B inspection PDF.

## Checks

Run the PDF/citation/rule regression checks with the project's real test PostgreSQL available.

```sh
pnpm exec vitest run src/lib/assessment/tc01.test.ts src/lib/assessment/drive-scenarios.test.ts
```

The observations in these tests are independently transcribed, source-cited facts. These checks exercise PDF parsing, citation validation and deterministic rules. Live provider assessment results are recorded separately in the scenario validation report. Expected outcomes are never sent to the extraction model.
