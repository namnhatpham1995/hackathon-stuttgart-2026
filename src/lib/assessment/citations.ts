import type { Citation, PageText } from "./types";

/** Drops a citation whose document or page is unknown, or whose quote is not on that page. */
export function validateCitations(citations: Citation[], pages: PageText[]): Citation[] {
  void citations;
  void pages;
  throw new Error("not implemented: validateCitations");
}
