import { extractText } from "unpdf";

import type { PageText } from "./types";

export type PdfDocument = {
  documentId: string;
  filename: string;
  content: Uint8Array;
};

export type PageExtraction = {
  pages: PageText[];
  /** Active documents that yielded no text. Callers must not treat those as missing evidence. */
  emptyDocuments: { documentId: string; filename: string }[];
};

function hasText(text: string): boolean {
  return text.trim().length > 0;
}

/**
 * Reads each PDF with unpdf. Each page that contains text is returned with its
 * document id, filename and 1-based PDF page number. A document whose pages are
 * all blank is listed in `emptyDocuments` and contributes no pages.
 */
export async function extractPages(documents: PdfDocument[]): Promise<PageExtraction> {
  const pages: PageText[] = [];
  const emptyDocuments: PageExtraction["emptyDocuments"] = [];

  for (const document of documents) {
    const { text } = await extractText(document.content, { mergePages: false });
    let yieldedText = false;
    for (let index = 0; index < text.length; index += 1) {
      const pageText = text[index];
      if (pageText === undefined || !hasText(pageText)) continue;
      yieldedText = true;
      pages.push({
        documentId: document.documentId,
        filename: document.filename,
        page: index + 1,
        text: pageText,
      });
    }
    if (!yieldedText) {
      emptyDocuments.push({
        documentId: document.documentId,
        filename: document.filename,
      });
    }
  }

  return { pages, emptyDocuments };
}
