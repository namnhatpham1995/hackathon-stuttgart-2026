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

const requirementSets = [neckarCap104];

export function getRequirementSet(key: string, version: number): RequirementSet | undefined {
  return requirementSets.find((set) => set.key === key && set.version === version);
}
