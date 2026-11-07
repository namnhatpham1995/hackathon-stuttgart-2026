import { describe, expect, test } from "vitest";

import { baselineFindings, correctedFindings, requirementSet } from "./fixtures";
import { actionPlan, dimensionSummary, documentRequestDraft } from "./report-summary";

const provideCertificate =
  "Provide a current ISO 9001 certificate for Lotus Mould Co., Ltd. covering injection moulding, because the submitted certificate expired on 2026-08-01.";
const provideInspection =
  "Provide the inspection report for CAP-104 revision B, because the submitted report identifies revision A.";
const provideTraceability =
  "Provide a traceability record that links a resin batch to the production lot and the shipment for CAP-104, because no traceability record was found in the processed documents.";

const draftInput = {
  productName: "Cover cap CAP-104",
  supplierName: "Lotus Mould Co., Ltd.",
  partNumber: "CAP-104",
};

describe("dimension summary", () => {
  test("baseline report counts documented and open requirements in each dimension", () => {
    expect(dimensionSummary(baselineFindings, requirementSet.requirements)).toEqual([
      { dimension: "product_material", label: "Product and material", documented: 1, open: 0 },
      { dimension: "quality", label: "Quality", documented: 0, open: 2 },
      { dimension: "traceability", label: "Traceability", documented: 0, open: 1 },
      {
        dimension: "packaging_logistics",
        label: "Packaging and logistics",
        documented: 1,
        open: 0,
      },
    ]);
  });
});

describe("action plan", () => {
  test("baseline plan lists one action each for R2, R3 and R4", () => {
    expect(actionPlan(baselineFindings)).toEqual([
      { requirementId: "R2", nextAction: provideCertificate },
      { requirementId: "R3", nextAction: provideInspection },
      { requirementId: "R4", nextAction: provideTraceability },
    ]);
  });

  test("corrected plan lists one action each for R2 and R4", () => {
    expect(actionPlan(correctedFindings).map((action) => action.requirementId)).toEqual([
      "R2",
      "R4",
    ]);
  });
});

describe("document request draft", () => {
  test("baseline draft names the same three documents and does not rate the supplier", () => {
    const draft = documentRequestDraft({ ...draftInput, findings: baselineFindings });

    expect(draft).toContain(`R2: ${provideCertificate}`);
    expect(draft).toContain(`R3: ${provideInspection}`);
    expect(draft).toContain(`R4: ${provideTraceability}`);
    expect(draft).not.toContain("R1:");
    expect(draft).not.toContain("R5:");
    expect(draft.toLowerCase()).not.toMatch(/score|verified|compliant|%/);
  });

  test("corrected draft names R2 and R4 only", () => {
    const draft = documentRequestDraft({ ...draftInput, findings: correctedFindings });

    expect(draft).toContain(`R2: ${provideCertificate}`);
    expect(draft).toContain(`R4: ${provideTraceability}`);
    expect(draft).not.toContain("R3:");
  });
});
