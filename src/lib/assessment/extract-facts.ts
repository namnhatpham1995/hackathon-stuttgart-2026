import type { Observation, PageText, Requirement } from "./types";

export async function extractFacts(input: {
  requirements: Requirement[];
  pages: PageText[];
}): Promise<Observation[]> {
  void input;
  throw new Error("not implemented: extractFacts");
}
