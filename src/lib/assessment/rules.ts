import type { Citation, Finding, Observation, PageText, RequirementSet } from "./types";

export function decideFindings(input: {
  requirementSet: RequirementSet;
  observations: Observation[];
  citations: Citation[];
  pages: PageText[];
  /** ISO date `YYYY-MM-DD`. Expiry is compared against this, not against a stored expected date. */
  assessmentDate: string;
  /** False when any active document yielded no text. */
  complete: boolean;
}): Finding[] {
  void input;
  throw new Error("not implemented: decideFindings");
}
