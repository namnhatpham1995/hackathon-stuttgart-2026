import { expect, test } from "vitest";

import { checklistFor } from "./checklists";
import type { ProductDocument } from "./contract";
import { assignDocuments } from "./documents";

function doc(id: string, filename: string, extra: Partial<ProductDocument> = {}): ProductDocument {
  return {
    id,
    filename,
    mimeType: "application/pdf",
    kind: "evidence",
    sizeBytes: 1000,
    state: "active",
    replacesDocumentId: null,
    ...extra,
  };
}

const tc01 = [
  "TC01_02_Product_Specification_RevB.pdf",
  "TC01_03_Material_Declaration_CAP104.pdf",
  "TC01_04_Inspection_Report_RevB.pdf",
  "TC01_05_ISO9001_Certificate_Current_Sample.pdf",
  "TC01_06_Traceability_Record_CAP104.pdf",
  "TC01_07_Packaging_Specification_CAP104.pdf",
].map((name, index) => doc(`d${index + 1}`, name));

const requirements = (key?: string) => checklistFor(key, 1).set.requirements;

test("each TC01 requirement gets its own document and none is shown twice", () => {
  const rows = assignDocuments(requirements("neckar-cap-104-qualification"), tc01);
  expect([...rows.entries()].map(([id, d]) => [id, d?.filename])).toEqual([
    ["R1", "TC01_02_Product_Specification_RevB.pdf"],
    ["R2", "TC01_03_Material_Declaration_CAP104.pdf"],
    ["R3", "TC01_04_Inspection_Report_RevB.pdf"],
    ["R4", "TC01_05_ISO9001_Certificate_Current_Sample.pdf"],
    ["R5", "TC01_06_Traceability_Record_CAP104.pdf"],
    ["R6", "TC01_07_Packaging_Specification_CAP104.pdf"],
  ]);
});

test("a missing traceability record leaves R5 empty instead of borrowing the packaging file", () => {
  const without = tc01.filter((d) => !d.filename.includes("Traceability"));
  const rows = assignDocuments(requirements("neckar-cap-104-qualification"), without);
  expect(rows.get("R5")).toBeNull();
  expect(rows.get("R6")?.filename).toBe("TC01_07_Packaging_Specification_CAP104.pdf");
});

test("a waiting replacement takes the row of the file it replaces", () => {
  const pending = doc("new", "scan_0042.pdf", { state: "pending", replacesDocumentId: "d5" });
  const rows = assignDocuments(requirements("neckar-cap-104-qualification"), [...tc01, pending]);
  expect(rows.get("R5")?.id).toBe("new");
  expect(rows.get("R6")?.id).toBe("d6");
});

test("a document the supplier assigned to a requirement stays there", () => {
  const upload = doc("x", "anything.pdf", { requirementId: "R5" });
  const rows = assignDocuments(requirements("neckar-cap-104-qualification"), [upload]);
  expect(rows.get("R5")?.id).toBe("x");
  expect(rows.get("R6")).toBeNull();
});

test("the demo checklist keeps its mapping", () => {
  const demo = [
    doc("a", "01_Lotus_Material_Datasheet.pdf"),
    doc("b", "02_Lotus_ISO_Certificate_Demo.pdf"),
    doc("c", "03_CAP104_Inspection_RevA.pdf"),
    doc("e", "04_Lotus_Packaging_Acceptance.pdf"),
  ];
  const rows = assignDocuments(requirements(), demo);
  expect([...rows.values()].map((d) => d?.id ?? null)).toEqual(["a", "b", "c", null, "e"]);
});
