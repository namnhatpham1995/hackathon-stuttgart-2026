import { getRequirementSet } from "@/lib/assessment/requirement-sets";

import type { RequirementSet } from "./contract";
import { requirementNames as demoNames, requirementSet as demoSet } from "./fixtures";

export type Checklist = {
  set: RequirementSet;
  /** Short label per requirement id. */
  names: Record<string, string>;
};

const demoChecklist: Checklist = { set: demoSet, names: demoNames };

/**
 * The buyer checklist a product was created with. The original demo checklist keeps its
 * hand-written titles; any other set comes from `requirement-sets.ts`.
 */
export function checklistFor(key?: string, version?: number): Checklist {
  if (!key || key === demoSet.key) return demoChecklist;
  const set = getRequirementSet(key, version ?? 1);
  if (!set) return demoChecklist;
  return {
    set: {
      key: set.key,
      version: set.version,
      title: "Neckar Maschinenbau GmbH · CAP-104",
      requirements: set.requirements.map((requirement) => ({
        id: requirement.id,
        title: requirement.statement,
        dimension: requirement.dimension,
        kind: requirement.kind,
      })),
    },
    names: Object.fromEntries(
      set.requirements.map((requirement) => [requirement.id, requirement.name ?? requirement.id]),
    ),
  };
}
