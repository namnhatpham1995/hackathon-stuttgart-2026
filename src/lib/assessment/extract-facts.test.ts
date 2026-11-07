import { beforeEach, expect, test, vi } from "vitest";

import { extractFacts } from "./extract-facts";
import type { Observation, PageText, Requirement } from "./types";

const { callClaude } = vi.hoisted(() => ({
  callClaude: vi.fn(),
}));

vi.mock("./claude", () => ({
  callClaude,
}));

const certificate: Requirement = {
  id: "R2",
  statement: "The submitted certificate covers the assessment date.",
  kind: "certificate",
  dimension: "quality",
  expected: { supplierName: "Lotus Mould" },
};

const inspection: Requirement = {
  id: "R3",
  statement: "The inspection report matches the drawing revision.",
  kind: "inspection_report",
  dimension: "quality",
  expected: { partNumber: "CAP-104", revision: "A" },
};

const pages: PageText[] = [
  {
    documentId: "doc-02",
    filename: "02_Lotus_ISO_Certificate_Demo.pdf",
    page: 1,
    text: "Certificate valid to 2026-08-01.",
  },
  {
    documentId: "doc-03",
    filename: "03_CAP104_Inspection_RevA.pdf",
    page: 1,
    text: "Part number: CAP-104. Drawing revision: A.",
  },
];

const certificateObservation: Observation = {
  requirementId: "R2",
  field: "validityEnd",
  value: "2026-08-01",
  documentId: "doc-02",
  page: 1,
  quote: "Valid to 2026-08-01",
};

const inspectionObservation: Observation = {
  requirementId: "R3",
  field: "revision",
  value: "A",
  documentId: "doc-03",
  page: 1,
  quote: "Drawing revision: A.",
};

type ClaudeRequest = {
  system: string;
  content: string;
  schema: Record<string, unknown>;
};

function modelResponse(observations: Observation[]) {
  return { text: JSON.stringify({ observations }) };
}

function requestBody(request: ClaudeRequest): { documentIds: string[]; pages: string } {
  return JSON.parse(request.content) as { documentIds: string[]; pages: string };
}

beforeEach(() => {
  callClaude.mockReset();
});

test("retries a document the first extraction omitted and keeps the retried observation", async () => {
  callClaude.mockImplementation(async (request: ClaudeRequest) => {
    const body = requestBody(request);
    if (body.documentIds.length === 1 && body.documentIds[0] === "doc-03") {
      return modelResponse([inspectionObservation]);
    }
    return modelResponse([certificateObservation]);
  });

  const result = await extractFacts({ requirements: [certificate, inspection], pages });

  expect(callClaude).toHaveBeenCalledTimes(2);
  const first = callClaude.mock.calls[0]?.[0] as ClaudeRequest;
  const second = callClaude.mock.calls[1]?.[0] as ClaudeRequest;
  expect(first.system).toContain("every uploaded document");
  expect(first.system).toContain('"doc-02"');
  expect(first.system).toContain('"doc-03"');
  expect(requestBody(first).documentIds).toEqual(["doc-02", "doc-03"]);

  const retry = requestBody(second);
  expect(retry.documentIds).toEqual(["doc-03"]);
  expect(retry.pages).toContain("documentId: doc-03");
  expect(retry.pages).not.toContain("doc-02");
  expect(second.system).toContain('"doc-03"');
  expect(second.system).not.toContain('"doc-02"');

  expect(result.warnings).toEqual([]);
  expect([...result]).toEqual([certificateObservation, inspectionObservation]);
});

test("warns when a document still has no observations after its retry", async () => {
  callClaude.mockImplementation(async (request: ClaudeRequest) => {
    const body = requestBody(request);
    if (body.documentIds.length === 1) return modelResponse([]);
    return modelResponse([certificateObservation]);
  });

  const result = await extractFacts({ requirements: [certificate, inspection], pages });

  expect(callClaude).toHaveBeenCalledTimes(2);
  expect(requestBody(callClaude.mock.calls[1]?.[0] as ClaudeRequest).documentIds).toEqual([
    "doc-03",
  ]);
  expect([...result]).toEqual([certificateObservation]);
  expect(result.warnings).toEqual([
    {
      documentId: "doc-03",
      filename: "03_CAP104_Inspection_RevA.pdf",
      message:
        "No observations were extracted for document doc-03 (03_CAP104_Inspection_RevA.pdf) after one retry. Mark processing incomplete.",
    },
  ]);
});

test("does not retry when every uploaded document has an observation", async () => {
  callClaude.mockResolvedValue(modelResponse([certificateObservation, inspectionObservation]));

  const result = await extractFacts({ requirements: [certificate, inspection], pages });

  expect(callClaude).toHaveBeenCalledTimes(1);
  const request = callClaude.mock.calls[0]?.[0] as ClaudeRequest;
  expect(request.schema).toMatchObject({ type: "object", additionalProperties: false });
  expect(request.system).toContain("every uploaded document");
  expect(request.system).toContain('"doc-02"');
  expect(request.system).toContain('"doc-03"');
  expect(requestBody(request).documentIds).toEqual(["doc-02", "doc-03"]);
  expect(Array.isArray(result)).toBe(true);
  expect(result.warnings).toEqual([]);
  expect(result).toHaveLength(2);
});
