import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, expect, test } from "vitest";

import { evidencePages, isBuyerRequirementsPage } from "./extract-facts";
import { extractPages } from "./pdf-text";
import { neckarCap104, neckarCap104Qualification } from "./requirement-sets";
import { decideFindings } from "./rules";
import type { Citation, Finding, Observation, PageText, RequirementSet } from "./types";

/**
 * The organisers' test pack, case TC01 ("Complete pack"). Its README expects every buyer
 * requirement R1-R6 to be matched by evidence on the assessment date 07 November 2026.
 * Observations stand in for the model: each value is quoted from the real extracted text.
 */
const packDir = join(process.cwd(), "fixtures", "test-pack", "tc01");
const files = {
  buyer: "TC01_01_Buyer_Requirements_CAP-104.pdf",
  spec: "TC01_02_Product_Specification_RevB.pdf",
  material: "TC01_03_Material_Declaration_CAP104.pdf",
  inspection: "TC01_04_Inspection_Report_RevB.pdf",
  certificate: "TC01_05_ISO9001_Certificate_Current_Sample.pdf",
  traceability: "TC01_06_Traceability_Record_CAP104.pdf",
  packaging: "TC01_07_Packaging_Specification_CAP104.pdf",
} as const;
type DocKey = keyof typeof files;

let pages: PageText[] = [];

beforeAll(async () => {
  const extraction = await extractPages(
    Object.entries(files).map(([documentId, filename]) => ({
      documentId,
      filename,
      content: new Uint8Array(readFileSync(join(packDir, filename))),
    })),
  );
  pages = extraction.pages;
});

type Fact = [requirementId: string, field: string, value: string, doc: DocKey, quote: string];

const tc01Facts: Fact[] = [
  ["R1", "partNumber", "CAP-104", "spec", "Product code CAP-104"],
  ["R1", "productName", "Cover Cap", "spec", "Product name Cover Cap"],
  ["R2", "partNumber", "CAP-104", "material", "Product code CAP-104"],
  ["R2", "material", "Polypropylene (PP)", "material", "Base material Polypropylene (PP)"],
  ["R3", "partNumber", "CAP-104", "inspection", "Product CAP-104 Cover Cap"],
  ["R3", "revision", "B", "inspection", "Revision inspected B"],
  [
    "R4",
    "supplierName",
    "Lotus Mould Co. Ltd.",
    "certificate",
    "Organisation Lotus Mould Co. Ltd.",
  ],
  ["R4", "standard", "ISO 9001:2015", "certificate", "Standard stated ISO 9001:2015"],
  [
    "R4",
    "scope",
    "Manufacture of injection-moulded plastic components for industrial applications.",
    "certificate",
    "Manufacture of injection-moulded plastic components for industrial applications.",
  ],
  ["R4", "validityEnd", "2027-12-31", "certificate", "Expiry date 31 December 2027"],
  ["R5", "partNumber", "CAP-104", "traceability", "Product CAP-104 Cover Cap"],
  ["R5", "resinBatch", "PP-LOT-260901", "traceability", "Material supplier lot PP-LOT-260901"],
  [
    "R5",
    "productionLot",
    "MFG-CAP104-261028-04",
    "traceability",
    "Production batch MFG-CAP104-261028-04",
  ],
  ["R5", "shipment", "DISP-261030-022", "traceability", "Dispatch reference DISP-261030-022"],
  ["R6", "partNumber", "CAP-104", "packaging", "Product code CAP-104"],
  [
    "R6",
    "cartonConfiguration",
    "10 inner bags per carton",
    "packaging",
    "Outer carton 10 inner bags per carton",
  ],
];

function assess(facts: Fact[], requirementSet: RequirementSet = neckarCap104Qualification) {
  const observations: Observation[] = [];
  const citations: Citation[] = [];
  for (const [requirementId, field, value, doc, quote] of facts) {
    observations.push({ requirementId, field, value, documentId: doc, page: 1, quote });
    citations.push({ documentId: doc, filename: files[doc], page: 1, quote });
  }
  return decideFindings({
    requirementSet,
    observations,
    citations,
    pages,
    assessmentDate: "2026-11-07",
    complete: true,
  });
}

function byId(findings: Finding[], id: string): Finding {
  const finding = findings.find((item) => item.requirementId === id);
  if (!finding) throw new Error(`missing finding ${id}`);
  return finding;
}

function replaced(requirementId: string, field: string, fact: Fact): Fact[] {
  return tc01Facts.map((item) => (item[0] === requirementId && item[1] === field ? fact : item));
}

test("the TC01 checklist has the six buyer requirements R1-R6", () => {
  expect(neckarCap104Qualification.requirements.map((requirement) => requirement.id)).toEqual([
    "R1",
    "R2",
    "R3",
    "R4",
    "R5",
    "R6",
  ]);
});

test("TC01 complete pack: every requirement is DOCUMENTED with a citation", () => {
  const findings = assess(tc01Facts);

  expect(findings.map((finding) => [finding.requirementId, finding.status])).toEqual([
    ["R1", "DOCUMENTED"],
    ["R2", "DOCUMENTED"],
    ["R3", "DOCUMENTED"],
    ["R4", "DOCUMENTED"],
    ["R5", "DOCUMENTED"],
    ["R6", "DOCUMENTED"],
  ]);
  for (const finding of findings) expect(finding.citations.length).toBeGreaterThan(0);
});

test("the packaging specification's revision A does not affect R6, which names no revision", () => {
  const findings = assess([...tc01Facts, ["R6", "revision", "A", "packaging", "Revision A"]]);

  expect(byId(findings, "R6").status).toBe("DOCUMENTED");
});

test("a material other than polypropylene is a MISMATCH on R2", () => {
  const findings = assess(
    replaced("R2", "material", [
      "R2",
      "material",
      "Polypropylene",
      "material",
      "Base material Polypropylene (PP)",
    ]),
  );
  expect(byId(findings, "R2").status).toBe("DOCUMENTED");

  const wrong = assess(
    replaced("R2", "material", [
      "R2",
      "material",
      "ABS",
      "material",
      "Base material Polypropylene (PP)",
    ]),
  );
  expect(byId(wrong, "R2").status).toBe("MISMATCH");
});

test("a packaging specification without a carton configuration is not DOCUMENTED", () => {
  const findings = assess(tc01Facts.filter((fact) => fact[1] !== "cartonConfiguration"));

  expect(byId(findings, "R6").status).toBe("NEEDS_REVIEW");
});

test("a certificate for another standard does not satisfy the ISO 9001 requirement", () => {
  const findings = assess(
    replaced("R4", "standard", [
      "R4",
      "standard",
      "ISO 14001:2015",
      "certificate",
      "Standard stated ISO 9001:2015",
    ]),
  );

  expect(byId(findings, "R4").status).toBe("MISMATCH");
});

test("a certificate that ended before the assessment date is EXPIRED", () => {
  const findings = assess(
    replaced("R4", "validityEnd", [
      "R4",
      "validityEnd",
      "2025-12-31",
      "certificate",
      "Expiry date 31 December 2027",
    ]),
  );

  expect(byId(findings, "R4").status).toBe("EXPIRED");
});

test("supplier punctuation and 'injection-moulded' do not mismatch the demo certificate requirement", () => {
  const findings = assess(
    [
      [
        "R2",
        "supplierName",
        "Lotus Mould Co. Ltd.",
        "certificate",
        "Organisation Lotus Mould Co. Ltd.",
      ],
      [
        "R2",
        "scope",
        "Manufacture of injection-moulded plastic components for industrial applications.",
        "certificate",
        "Manufacture of injection-moulded plastic components for industrial applications.",
      ],
      ["R2", "validityEnd", "2027-12-31", "certificate", "Expiry date 31 December 2027"],
    ],
    neckarCap104,
  );

  expect(byId(findings, "R2").status).toBe("DOCUMENTED");
});

test("a different supplier still mismatches after punctuation folding", () => {
  const findings = assess(
    replaced("R4", "supplierName", [
      "R4",
      "supplierName",
      "Lotus Moulding Co. Ltd.",
      "certificate",
      "Organisation Lotus Mould Co. Ltd.",
    ]),
  );

  expect(byId(findings, "R4").status).toBe("MISMATCH");
});

test("the buyer requirements PDF is recognised and kept out of the evidence", () => {
  const buyerPages = pages.filter((page) => page.documentId === "buyer");
  expect(buyerPages.length).toBeGreaterThan(0);
  expect(buyerPages.some((page) => isBuyerRequirementsPage(page.text))).toBe(true);
  for (const page of pages.filter((item) => item.documentId !== "buyer")) {
    expect(isBuyerRequirementsPage(page.text)).toBe(false);
  }

  const kept = new Set(evidencePages(pages).map((page) => page.documentId));
  expect([...kept].sort()).toEqual(
    ["certificate", "inspection", "material", "packaging", "spec", "traceability"].sort(),
  );
});
