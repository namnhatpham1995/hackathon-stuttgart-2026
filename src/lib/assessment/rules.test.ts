import { expect, test } from "vitest";

import { validateCitations } from "./citations";
import { neckarCap104 } from "./requirement-sets";
import { decideFindings } from "./rules";
import type { Citation, Finding, Observation, PageText } from "./types";

const assessmentDate = "2026-11-07";

function source(documentId: string, text: string, filename = `${documentId}.pdf`): PageText {
  return { documentId, filename, page: 1, text };
}

/** A field value whose quote is the `field: value` line on `page`. */
function support(
  requirementId: string,
  page: PageText,
  fields: Record<string, string>,
): { observations: Observation[]; citations: Citation[] } {
  const observations: Observation[] = [];
  const citations: Citation[] = [];
  for (const [field, value] of Object.entries(fields)) {
    const quote = `${field}: ${value}`;
    observations.push({
      requirementId,
      field,
      value,
      documentId: page.documentId,
      page: page.page,
      quote,
    });
    citations.push({
      documentId: page.documentId,
      filename: page.filename,
      page: page.page,
      quote,
    });
  }
  return { observations, citations };
}

function pageFor(documentId: string, fields: Record<string, string>, filename?: string): PageText {
  const text = Object.entries(fields)
    .map(([field, value]) => `${field}: ${value}`)
    .join("\n");
  return source(documentId, text, filename);
}

function findingsFor(args: {
  pages: PageText[];
  observations: Observation[];
  citations: Citation[];
  complete?: boolean;
  date?: string;
}): Finding[] {
  return decideFindings({
    requirementSet: neckarCap104,
    observations: args.observations,
    citations: args.citations,
    pages: args.pages,
    assessmentDate: args.date ?? assessmentDate,
    complete: args.complete ?? true,
  });
}

function byId(findings: Finding[], id: string): Finding {
  const finding = findings.find((item) => item.requirementId === id);
  if (!finding) throw new Error(`missing finding ${id}`);
  return finding;
}

test("an ISO certificate valid to 2026-08-01 is EXPIRED on 2026-11-07", () => {
  const fields = {
    supplierName: "Lotus Mould Co., Ltd.",
    scope: "injection moulding",
    validUntil: "2026-08-01",
  };
  const page = pageFor("doc-iso", fields, "02_Lotus_ISO_Certificate_Demo.pdf");
  const cited = support("R2", page, fields);
  const findings = findingsFor({
    pages: [page],
    observations: cited.observations,
    citations: cited.citations,
  });

  expect(findings.map((finding) => finding.requirementId)).toEqual(["R1", "R2", "R3", "R4", "R5"]);
  const certificate = byId(findings, "R2");
  expect(certificate.status).toBe("EXPIRED");
  expect(certificate.evidenceType).toBe("certificate");
  expect(certificate.observed.validUntil).toBe("2026-08-01");
  expect(certificate.citations).toHaveLength(3);
  expect(certificate.reason).toBe(
    "The extracted document validity end date 2026-08-01 precedes the assessment date 2026-11-07.",
  );
  expect(certificate.nextAction).toBe("Provide a certificate that is valid on 2026-11-07.");

  const traceability = byId(findings, "R4");
  expect(traceability.status).toBe("MISSING");
  expect(traceability.citations).toEqual([]);
  expect(traceability.reason).toBe("No traceability record was found in the processed documents.");
});

test("a certificate still valid on the assessment date is not EXPIRED", () => {
  const fields = {
    supplierName: "Lotus Mould Co., Ltd.",
    scope: "injection moulding",
    validUntil: "2026-11-07",
  };
  const page = pageFor("doc-iso", fields);
  const cited = support("R2", page, fields);
  const certificate = byId(
    findingsFor({ pages: [page], observations: cited.observations, citations: cited.citations }),
    "R2",
  );

  expect(certificate.status).toBe("DOCUMENTED");
  expect(certificate.citations.length).toBeGreaterThan(0);
});

test("revision A against required revision B is MISMATCH", () => {
  const fields = { partNumber: "CAP-104", revision: "A" };
  const page = pageFor("doc-inspection", fields, "03_CAP104_Inspection_RevA.pdf");
  const cited = support("R3", page, fields);
  const report = byId(
    findingsFor({ pages: [page], observations: cited.observations, citations: cited.citations }),
    "R3",
  );

  expect(report.status).toBe("MISMATCH");
  expect(report.observed).toEqual({ partNumber: "CAP-104", revision: "A" });
  expect(report.reason).toBe("Buyer requires revision B; report identifies A.");
  expect(report.nextAction).toBe("Provide the report for CAP-104 revision B.");
});

test("revision B on the matching part is DOCUMENTED", () => {
  const fields = { partNumber: "CAP-104", revision: "B" };
  const page = pageFor("doc-inspection", fields, "05_CAP104_Inspection_RevB.pdf");
  const cited = support("R3", page, fields);
  const report = byId(
    findingsFor({ pages: [page], observations: cited.observations, citations: cited.citations }),
    "R3",
  );

  expect(report.status).toBe("DOCUMENTED");
  expect(report.citations).toHaveLength(2);
});

test("a wrong part never gives DOCUMENTED, even when the revision matches", () => {
  const fields = { partNumber: "CAP-999", revision: "B" };
  const page = pageFor("doc-inspection", fields);
  const cited = support("R3", page, fields);
  const report = byId(
    findingsFor({ pages: [page], observations: cited.observations, citations: cited.citations }),
    "R3",
  );

  expect(report.status).toBe("MISMATCH");
  expect(report.reason).toContain("CAP-104");
  expect(report.reason).toContain("CAP-999");
  expect(report.observed.partNumber).toBe("CAP-999");
});

test("a wrong supplier is MISMATCH before the certificate's expiry", () => {
  const fields = {
    supplierName: "Other Mould Co.",
    scope: "injection moulding",
    validUntil: "2026-08-01",
  };
  const page = pageFor("doc-iso", fields);
  const cited = support("R2", page, fields);
  const certificate = byId(
    findingsFor({ pages: [page], observations: cited.observations, citations: cited.citations }),
    "R2",
  );

  expect(certificate.status).toBe("MISMATCH");
  expect(certificate.reason).toContain("Other Mould Co.");
  expect(certificate.reason).toContain("2026-08-01");
});

test("a different material grade is MISMATCH", () => {
  const fields = {
    partNumber: "CAP-104",
    revision: "B",
    material: "ABS",
    grade: "LM-ABS-99",
  };
  const page = pageFor("doc-material", fields);
  const cited = support("R1", page, fields);
  const material = byId(
    findingsFor({ pages: [page], observations: cited.observations, citations: cited.citations }),
    "R1",
  );

  expect(material.status).toBe("MISMATCH");
  expect(material.reason).toContain("LM-ABS-01");
  expect(material.reason).toContain("LM-ABS-99");
});

test("an incomplete set never gives MISSING", () => {
  const fields = {
    partNumber: "CAP-104",
    revision: "B",
    material: "ABS",
    grade: "LM-ABS-01",
  };
  const page = pageFor("doc-material", fields, "01_Lotus_Material_Datasheet.pdf");
  const cited = support("R1", page, fields);
  const findings = findingsFor({
    pages: [page],
    observations: cited.observations,
    citations: cited.citations,
    complete: false,
  });

  expect(findings.map((finding) => finding.status)).not.toContain("MISSING");
  expect(byId(findings, "R1").status).toBe("DOCUMENTED");
  expect(byId(findings, "R4").status).toBe("NEEDS_REVIEW");
  expect(byId(findings, "R4").citations).toEqual([]);
});

test("a quote that is not on the cited page is dropped and the finding becomes NEEDS_REVIEW", () => {
  const page = source("doc-material", "Cover sheet only.", "01_Lotus_Material_Datasheet.pdf");
  const invented = "Part CAP-104 revision B is ABS grade LM-ABS-01.";
  const cited = support("R1", page, {
    partNumber: "CAP-104",
    revision: "B",
    material: "ABS",
    grade: "LM-ABS-01",
  });
  const observations = cited.observations.map((observation) => ({
    ...observation,
    quote: invented,
  }));
  const citations = cited.citations.map((citation) => ({ ...citation, quote: invented }));

  expect(validateCitations(citations, [page])).toEqual([]);
  const material = byId(findingsFor({ pages: [page], observations, citations }), "R1");
  expect(material.status).toBe("NEEDS_REVIEW");
  expect(material.citations).toEqual([]);
});

test("a hyphenated injection-moulding scope still covers the certificate", () => {
  const fields = {
    supplierName: "Lotus Mould Co., Ltd.",
    scope: "injection-moulding",
    validUntil: "2026-11-07",
  };
  const page = pageFor("doc-iso", fields);
  const cited = support("R2", page, fields);
  const certificate = byId(
    findingsFor({ pages: [page], observations: cited.observations, citations: cited.citations }),
    "R2",
  );

  expect(certificate.status).toBe("DOCUMENTED");
});

test("a different packaging code is MISMATCH", () => {
  const fields = {
    partNumber: "CAP-104",
    revision: "B",
    packagingCode: "PKG-99",
    packagingRevision: "2",
  };
  const page = pageFor("doc-packaging", fields, "04_Lotus_Packaging_Acceptance.pdf");
  const cited = support("R5", page, fields);
  const packaging = byId(
    findingsFor({ pages: [page], observations: cited.observations, citations: cited.citations }),
    "R5",
  );

  expect(packaging.status).toBe("MISMATCH");
  expect(packaging.reason).toContain("PKG-07");
  expect(packaging.reason).toContain("PKG-99");
});

test("conflicting revisions are NEEDS_REVIEW rather than a silent choice", () => {
  const revisionA = pageFor("doc-a", { partNumber: "CAP-104", revision: "A" });
  const revisionB = pageFor("doc-b", { partNumber: "CAP-104", revision: "B" });
  const first = support("R3", revisionA, { partNumber: "CAP-104", revision: "A" });
  const second = support("R3", revisionB, { partNumber: "CAP-104", revision: "B" });
  const report = byId(
    findingsFor({
      pages: [revisionA, revisionB],
      observations: [...first.observations, ...second.observations],
      citations: [...first.citations, ...second.citations],
    }),
    "R3",
  );

  expect(report.status).toBe("NEEDS_REVIEW");
  expect(report.reason).toContain("disagree on revision: A and B");
});
