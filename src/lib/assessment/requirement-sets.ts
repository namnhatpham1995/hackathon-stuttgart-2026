import type { RequirementSet } from "./types";

/**
 * Buyer checklist for the fictional Neckar / Lotus Mould demo.
 * Expected strings are the working plan's demo values. R2 has no expected end date:
 * the rules compare the observed validity end with the assessment date.
 */
export const neckarCap104: RequirementSet = {
  key: "neckar-cap-104",
  version: 1,
  requirements: [
    {
      id: "R1",
      statement: "Part-specific documentation identifies CAP-104 revision B as ABS grade LM-ABS-01",
      kind: "material_datasheet",
      dimension: "product_material",
      expected: {
        partNumber: "CAP-104",
        revision: "B",
        material: "ABS",
        grade: "LM-ABS-01",
      },
    },
    {
      id: "R2",
      statement:
        "Submitted ISO 9001 certificate names the supplier, covers injection moulding and is unexpired on the assessment date",
      kind: "certificate",
      dimension: "quality",
      expected: {
        supplierName: "Lotus Mould Co., Ltd.",
        scope: "injection moulding",
      },
    },
    {
      id: "R3",
      statement: "Inspection report identifies CAP-104 revision B",
      kind: "inspection_report",
      dimension: "quality",
      expected: {
        partNumber: "CAP-104",
        revision: "B",
      },
    },
    {
      id: "R4",
      statement: "Sample record links a resin batch to production lot and shipment for CAP-104",
      kind: "traceability_record",
      dimension: "traceability",
      expected: {
        partNumber: "CAP-104",
      },
    },
    {
      id: "R5",
      statement: "Supplier explicitly accepts PKG-07 revision 2 for CAP-104 revision B",
      kind: "packaging_acceptance",
      dimension: "packaging_logistics",
      expected: {
        partNumber: "CAP-104",
        revision: "B",
        packagingCode: "PKG-07",
        packagingRevision: "2",
      },
    },
  ],
};

/**
 * Buyer checklist from the organisers' test pack (TC01_01, "Buyer Supplier Evidence
 * Requirements", assessment reference ER-TEST-TC01). Ids and wording follow that document.
 * R6 names no carton configuration, so the check is that the specification states one.
 */
export const neckarCap104Qualification: RequirementSet = {
  key: "neckar-cap-104-qualification",
  version: 1,
  requirements: [
    {
      id: "R1",
      name: "Product identity",
      statement: "Product code CAP-104 and product name must match the purchase specification",
      kind: "product_specification",
      dimension: "product_material",
      expected: { partNumber: "CAP-104", productName: "Cover Cap" },
    },
    {
      id: "R2",
      name: "Material declaration",
      statement: "Material declaration must identify polypropylene (PP) and match CAP-104",
      kind: "material_declaration",
      dimension: "product_material",
      expected: { partNumber: "CAP-104", material: "Polypropylene (PP)" },
    },
    {
      id: "R3",
      name: "Inspection revision",
      statement: "Inspection report must refer to CAP-104, Revision B",
      kind: "inspection_report",
      dimension: "quality",
      expected: { partNumber: "CAP-104", revision: "B" },
    },
    {
      id: "R4",
      name: "Quality certificate",
      statement: "ISO 9001 certificate must be in date on the assessment date",
      kind: "certificate",
      dimension: "quality",
      expected: { supplierName: "Lotus Mould Co. Ltd.", standard: "ISO 9001" },
    },
    {
      id: "R5",
      name: "Traceability",
      statement:
        "Provide a batch/lot traceability record linking material lot to finished-product batch",
      kind: "traceability_record",
      dimension: "traceability",
      expected: { partNumber: "CAP-104" },
      traceLinks: ["resinBatch", "productionLot"],
    },
    {
      id: "R6",
      name: "Packaging",
      statement:
        "Packaging specification must identify CAP-104 and the agreed carton configuration",
      kind: "packaging_specification",
      dimension: "packaging_logistics",
      expected: { partNumber: "CAP-104" },
    },
  ],
};

/** New products use this checklist. Products created earlier keep the key they were saved with. */
export const DEFAULT_REQUIREMENT_SET = neckarCap104Qualification;

const requirementSets = [neckarCap104, neckarCap104Qualification];

export function getRequirementSet(key: string, version: number): RequirementSet | undefined {
  return requirementSets.find((set) => set.key === key && set.version === version);
}
