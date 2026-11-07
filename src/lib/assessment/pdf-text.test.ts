import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "vitest";

import { extractPages, type PdfDocument } from "./pdf-text";

const fixturesDir = path.resolve(import.meta.dirname, "../../../fixtures/exportready");

function fixture(filename: string, documentId: string): PdfDocument {
  return {
    documentId,
    filename,
    content: new Uint8Array(readFileSync(path.join(fixturesDir, filename))),
  };
}

test("fixture PDFs yield page-labelled text containing their key values", async () => {
  const datasheet = fixture("01_Lotus_Material_Datasheet.pdf", "doc-01");
  const certificate = fixture("02_Lotus_ISO_Certificate_Demo.pdf", "doc-02");
  const inspection = fixture("03_CAP104_Inspection_RevA.pdf", "doc-03");

  const { pages, emptyDocuments } = await extractPages([datasheet, certificate, inspection]);

  const datasheetPage = pages.find((page) => page.documentId === "doc-01" && page.page === 1);
  const certificatePage = pages.find((page) => page.documentId === "doc-02" && page.page === 1);
  const inspectionPage = pages.find((page) => page.documentId === "doc-03" && page.page === 1);

  expect(datasheetPage).toMatchObject({
    documentId: "doc-01",
    filename: "01_Lotus_Material_Datasheet.pdf",
    page: 1,
  });
  expect(datasheetPage?.text).toContain("LM-ABS-01");

  expect(certificatePage).toMatchObject({
    documentId: "doc-02",
    filename: "02_Lotus_ISO_Certificate_Demo.pdf",
    page: 1,
  });
  expect(certificatePage?.text).toContain("2026-08-01");

  expect(inspectionPage).toMatchObject({
    documentId: "doc-03",
    filename: "03_CAP104_Inspection_RevA.pdf",
    page: 1,
  });
  expect(inspectionPage?.text).toContain("revision A");

  expect(emptyDocuments).toEqual([]);
});

test("a PDF with no text layer is flagged empty", async () => {
  const empty = fixture("empty.pdf", "doc-empty");
  const { pages, emptyDocuments } = await extractPages([empty]);

  expect(pages).toEqual([]);
  expect(emptyDocuments).toEqual([{ documentId: "doc-empty", filename: "empty.pdf" }]);
});
