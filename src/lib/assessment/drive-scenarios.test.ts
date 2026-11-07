import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

import { evidencePages } from "./extract-facts";
import { extractPages } from "./pdf-text";
import { neckarCap104Qualification } from "./requirement-sets";
import { decideFindings } from "./rules";
import type { Citation, Observation } from "./types";

const root = join(process.cwd(), "fixtures/test-pack");
const manifest = JSON.parse(readFileSync(join(root, "drive-manifest.json"), "utf8")) as {
  files: { name: string; path: string; size: number; sha256: string }[];
};

type Fact = [requirementId: string, field: string, value: string, filename: string, quote: string];
const wrongSpec = "TC02_02_Product_Specification_RevA_WRONG.pdf";
const wrongInspection = "TC02_03_Inspection_Report_RevA_WRONG.pdf";
const correctedSpec = "TC05_01_CORRECTED_Product_Specification_RevB.pdf";
const correctedInspection = "TC01_04_Inspection_Report_RevB.pdf";
const expiredCertificate = "TC03_01_ISO9001_Certificate_EXPIRED_Sample.pdf";

const revisionFacts: Fact[] = [
  ["R1", "partNumber", "CAP-104", wrongSpec, "Product code CAP-104"],
  ["R1", "productName", "Cover Cap", wrongSpec, "Product name Cover Cap"],
  ["R3", "partNumber", "CAP-104", wrongInspection, "Product code CAP-104"],
  ["R3", "revision", "A", wrongInspection, "Revision inspected A"],
];
const expiredFacts: Fact[] = [
  [
    "R4",
    "supplierName",
    "Lotus Mould Co. Ltd.",
    expiredCertificate,
    "Organisation Lotus Mould Co. Ltd.",
  ],
  ["R4", "standard", "ISO 9001:2015", expiredCertificate, "Standard stated ISO 9001:2015"],
  [
    "R4",
    "scope",
    "Manufacture of injection-moulded plastic components for industrial applications.",
    expiredCertificate,
    "Manufacture of injection-moulded plastic components for industrial applications.",
  ],
  ["R4", "validityEnd", "2025-12-31", expiredCertificate, "Expiry date 31 December 2025"],
];

async function assess(filenames: string[], facts: Fact[]) {
  const extraction = await extractPages(
    filenames.map((filename) => {
      const entry = manifest.files.find((file) => file.name === filename);
      if (!entry) throw new Error(`Unknown supplied fixture ${filename}`);
      return { documentId: filename, filename, content: new Uint8Array(readFileSync(entry.path)) };
    }),
  );
  expect(extraction.emptyDocuments).toEqual([]);
  const observations: Observation[] = facts.map(
    ([requirementId, field, value, documentId, quote]) => ({
      requirementId,
      field,
      value,
      documentId,
      page: 1,
      quote,
    }),
  );
  const citations: Citation[] = observations.map(({ documentId, page, quote }) => ({
    documentId,
    filename: documentId,
    page,
    quote,
  }));
  // Facts are independently transcribed from the supplied PDFs. These checks exercise
  // PDF extraction, citation validation and rules; live model results are recorded separately.
  return decideFindings({
    requirementSet: neckarCap104Qualification,
    observations,
    citations,
    pages: evidencePages(extraction.pages),
    assessmentDate: "2026-11-07",
    complete: true,
  });
}

function statuses(findings: Awaited<ReturnType<typeof assess>>) {
  return Object.fromEntries(findings.map((finding) => [finding.requirementId, finding.status]));
}

test("all sixteen test-pack PDFs match the downloaded Drive originals", () => {
  expect(manifest.files).toHaveLength(16);
  for (const file of manifest.files) {
    const bytes = readFileSync(file.path);
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    expect(bytes.length).toBe(file.size);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(file.sha256);
  }
});

test("TC02 cites the inspection revision A and asks for revision B", async () => {
  const findings = await assess(
    ["TC02_01_Buyer_Requirement_RevisionB.pdf", wrongSpec, wrongInspection],
    revisionFacts,
  );
  expect(statuses(findings)).toEqual({
    R1: "DOCUMENTED",
    R2: "MISSING",
    R3: "MISMATCH",
    R4: "MISSING",
    R5: "MISSING",
    R6: "MISSING",
  });
  const inspection = findings.find((finding) => finding.requirementId === "R3");
  expect(inspection?.observed.revision).toBe("A");
  expect(inspection?.citations).toContainEqual({
    documentId: wrongInspection,
    filename: wrongInspection,
    page: 1,
    quote: "Revision inspected A",
  });
  expect(inspection?.reason).toContain("Buyer requires revision B");
  expect(inspection?.nextAction).toContain("revision B");
});

test("TC03 uses the actual expiry date and reports the other absent evidence", async () => {
  const findings = await assess([expiredCertificate], expiredFacts);
  expect(statuses(findings)).toEqual({
    R1: "MISSING",
    R2: "MISSING",
    R3: "MISSING",
    R4: "EXPIRED",
    R5: "MISSING",
    R6: "MISSING",
  });
  const certificate = findings.find((finding) => finding.requirementId === "R4");
  expect(certificate?.observed.validityEnd).toBe("2025-12-31");
  expect(
    certificate?.citations.some((citation) => citation.quote === "Expiry date 31 December 2025"),
  ).toBe(true);
  expect(certificate?.nextAction).toBe("Provide a certificate that is valid on 2026-11-07.");
});

test("TC04 does not invent traceability from an inspection lot", async () => {
  const spec = "TC04_01_Product_Specification_CAP104.pdf";
  const material = "TC04_02_Material_Declaration_CAP104.pdf";
  const inspection = "TC04_03_Inspection_Report_RevB.pdf";
  const findings = await assess(
    [spec, material, inspection],
    [
      ["R1", "partNumber", "CAP-104", spec, "Product code CAP-104"],
      ["R1", "productName", "Cover Cap", spec, "Product name Cover Cap"],
      ["R2", "partNumber", "CAP-104", material, "Product code CAP-104"],
      ["R2", "material", "Polypropylene (PP)", material, "Base material Polypropylene (PP)"],
      ["R3", "partNumber", "CAP-104", inspection, "Product code CAP-104"],
      ["R3", "revision", "B", inspection, "Revision inspected B"],
    ],
  );
  expect(statuses(findings)).toEqual({
    R1: "DOCUMENTED",
    R2: "DOCUMENTED",
    R3: "DOCUMENTED",
    R4: "MISSING",
    R5: "MISSING",
    R6: "MISSING",
  });
  const traceability = findings.find((finding) => finding.requirementId === "R5");
  expect(traceability?.observed).toEqual({});
  expect(traceability?.citations).toEqual([]);
  expect(traceability?.nextAction).toContain("traceability record");
});

test("the supplied TC05 product-spec replacement leaves the revision-A inspection unresolved", async () => {
  const before = await assess([wrongSpec, wrongInspection], revisionFacts);
  const facts = revisionFacts.map(
    (fact): Fact => [
      fact[0],
      fact[1],
      fact[2],
      fact[3] === wrongSpec ? correctedSpec : fact[3],
      fact[4],
    ],
  );
  const after = await assess([correctedSpec, wrongInspection], facts);
  expect(statuses(after)).toEqual(statuses(before));
  expect(statuses(after).R3).toBe("MISMATCH");
  expect(
    after
      .find((finding) => finding.requirementId === "R3")
      ?.citations.every((citation) => citation.filename === wrongInspection),
  ).toBe(true);
});

test("replacing the inspection changes only R3 while expired certification and missing traceability remain", async () => {
  const facts: Fact[] = [...revisionFacts, ...expiredFacts];
  const before = await assess([wrongSpec, wrongInspection, expiredCertificate], facts);
  const afterFacts = facts.map(
    (fact): Fact =>
      fact[3] === wrongInspection
        ? [
            fact[0],
            fact[1],
            fact[1] === "revision" ? "B" : fact[2],
            correctedInspection,
            fact[1] === "revision" ? "Revision inspected B" : "Product CAP-104 Cover Cap",
          ]
        : fact,
  );
  const after = await assess([wrongSpec, correctedInspection, expiredCertificate], afterFacts);
  expect(statuses(before)).toEqual({
    R1: "DOCUMENTED",
    R2: "MISSING",
    R3: "MISMATCH",
    R4: "EXPIRED",
    R5: "MISSING",
    R6: "MISSING",
  });
  expect(statuses(after)).toEqual({
    R1: "DOCUMENTED",
    R2: "MISSING",
    R3: "DOCUMENTED",
    R4: "EXPIRED",
    R5: "MISSING",
    R6: "MISSING",
  });
  expect(
    after
      .find((finding) => finding.requirementId === "R3")
      ?.citations.every((citation) => citation.filename === correctedInspection),
  ).toBe(true);
  expect(statuses(before).R3).toBe("MISMATCH");
});
