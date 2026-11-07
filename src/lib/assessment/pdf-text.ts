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

export async function extractPages(documents: PdfDocument[]): Promise<PageExtraction> {
  void documents;
  throw new Error("not implemented: extractPages");
}
