import type { Citation, PageText } from "./types";

/** Collapses whitespace so a quote still matches the page it was copied from. */
export function normaliseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function pageKey(documentId: string, page: number): string {
  return `${documentId}\0${page}`;
}

/**
 * Drops a citation whose document or page is unknown, or whose quote is not on that page.
 * Matching ignores runs of whitespace and drops an empty quote. The comparison is
 * case-sensitive: the quote has to be the page text, not a paraphrase.
 */
export function validateCitations(citations: Citation[], pages: PageText[]): Citation[] {
  const textByPage = new Map<string, string[]>();
  for (const page of pages) {
    const key = pageKey(page.documentId, page.page);
    const normalised = normaliseWhitespace(page.text);
    const texts = textByPage.get(key);
    if (texts) texts.push(normalised);
    else textByPage.set(key, [normalised]);
  }

  const kept: Citation[] = [];
  const seen = new Set<string>();
  for (const citation of citations) {
    const quote = normaliseWhitespace(citation.quote);
    if (quote.length === 0) continue;
    const texts = textByPage.get(pageKey(citation.documentId, citation.page));
    if (!texts?.some((text) => text.includes(quote))) continue;
    const dedupeKey = `${pageKey(citation.documentId, citation.page)}\0${quote}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    kept.push(citation);
  }
  return kept;
}
