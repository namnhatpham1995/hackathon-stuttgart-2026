import { getRequirementSet } from "@/lib/assessment/requirement-sets";

import type { RequirementSet } from "./contract";

export const requirementNames: Record<string, string> = {
  R1: "Part documentation",
  R2: "ISO 9001 certificate",
  R3: "Inspection report",
  R4: "Traceability record",
  R5: "Packaging acceptance",
};

const source = getRequirementSet("neckar-cap-104", 1);
if (!source) {
  throw new Error("The Neckar CAP-104 requirement set is not available.");
}

/** Buyer checklist shown on the upload card and the report. Values come from the assessment contract. */
export const requirementSet: RequirementSet = {
  key: source.key,
  version: source.version,
  title: "Neckar Maschinenbau GmbH · CAP-104",
  requirements: source.requirements.map((requirement) => ({
    id: requirement.id,
    title: requirement.statement,
    dimension: requirement.dimension,
    kind: requirement.kind,
  })),
};
