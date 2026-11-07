import { expect, test } from "vitest";

import { validateCitations } from "./citations";
import type { Citation, PageText } from "./types";

const certificate: PageText = {
  documentId: "doc-iso",
  filename: "02_Lotus_ISO_Certificate_Demo.pdf",
  page: 1,
  text: "Supplier: Lotus Mould Co., Ltd.\nScope: injection moulding\nValid until: 2026-08-01",
};

test("drops an invented quote, an unknown document and an unknown page, and keeps a real quote", () => {
  const realQuote = "Valid until:\n2026-08-01";
  const inventedQuote = "Valid until: 2099-01-01";
  const citations: Citation[] = [
    {
      documentId: certificate.documentId,
      filename: certificate.filename,
      page: 1,
      quote: realQuote,
    },
    {
      documentId: certificate.documentId,
      filename: certificate.filename,
      page: 1,
      quote: inventedQuote,
    },
    {
      documentId: "doc-unknown",
      filename: "missing.pdf",
      page: 1,
      quote: "Valid until: 2026-08-01",
    },
    {
      documentId: certificate.documentId,
      filename: certificate.filename,
      page: 2,
      quote: "Valid until: 2026-08-01",
    },
  ];

  expect(validateCitations(citations, [certificate])).toEqual([
    {
      documentId: "doc-iso",
      filename: "02_Lotus_ISO_Certificate_Demo.pdf",
      page: 1,
      quote: realQuote,
    },
  ]);
});

test("drops an empty quote and a quote that differs only by case", () => {
  const kept = validateCitations(
    [
      {
        documentId: certificate.documentId,
        filename: certificate.filename,
        page: 1,
        quote: "   ",
      },
      {
        documentId: certificate.documentId,
        filename: certificate.filename,
        page: 1,
        quote: "valid until: 2026-08-01",
      },
    ],
    [certificate],
  );

  expect(kept).toEqual([]);
});
