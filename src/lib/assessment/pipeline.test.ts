import { eq } from "drizzle-orm";
import { beforeEach, expect, test, vi } from "vitest";

import { db } from "@/db/client";
import { assessmentJob, assessmentResult, document, product, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { startAssessment } from "@/lib/jobs/service";

import type { FactExtraction } from "./extract-facts";
import type { PageExtraction, PdfDocument } from "./pdf-text";
import { runAssessment } from "./pipeline";
import type { Finding, Observation, PageText } from "./types";

const { extractFacts, extractPages } = vi.hoisted(() => ({
  extractFacts: vi.fn(),
  extractPages: vi.fn(),
}));

vi.mock("./extract-facts", () => ({
  extractFacts,
}));

vi.mock("./pdf-text", () => ({
  extractPages,
}));

const password = "correct-horse-1";
const pageText = "Part number: CAP-104.\nRevision: B.";

function withWarnings(
  observations: Observation[],
  warnings: FactExtraction["warnings"],
): FactExtraction {
  const result = [...observations] as FactExtraction;
  result.warnings = warnings;
  return result;
}

function pagesFor(documents: PdfDocument[]): PageExtraction {
  return {
    pages: documents.map((item) => ({
      documentId: item.documentId,
      filename: item.filename,
      page: 1,
      text: pageText,
    })),
    emptyDocuments: [],
  };
}

function inspectionObservations(page: PageText): Observation[] {
  return [
    {
      requirementId: "R3",
      field: "partNumber",
      value: "CAP-104",
      documentId: page.documentId,
      page: 1,
      quote: "Part number: CAP-104.",
    },
    {
      requirementId: "R3",
      field: "revision",
      value: "B",
      documentId: page.documentId,
      page: 1,
      quote: "Revision: B.",
    },
  ];
}

beforeEach(() => {
  extractPages.mockReset();
  extractFacts.mockReset();
  extractPages.mockImplementation(async (documents: PdfDocument[]) => pagesFor(documents));
});

async function createOwner(name: string) {
  const email = `${name.toLowerCase()}-${crypto.randomUUID()}@example.com`;
  const result = await auth.api.signUpEmail({ body: { name, email, password } });
  return result.user.id;
}

async function createProduct(userId: string, filenames: string[]) {
  const productId = crypto.randomUUID();
  await db.insert(product).values({
    id: productId,
    userId,
    requirementSetKey: "neckar-cap-104",
    requirementSetVersion: 1,
    name: "Cover cap",
  });
  await db.insert(document).values(
    filenames.map((filename, index) => ({
      id: crypto.randomUUID(),
      productId,
      filename,
      mimeType: "application/pdf",
      kind: "evidence",
      sizeBytes: 12,
      sha256: `hash-${filename}-${index}`,
      content: Buffer.from(`pdf-${index}`),
      state: "active",
    })),
  );
  return productId;
}

function finding(findings: Finding[], id: string): Finding {
  const match = findings.find((item) => item.requirementId === id);
  if (!match) throw new Error(`missing finding ${id}`);
  return match;
}

test("a fact-extraction warning marks the result incomplete and leaves the gap unconfirmed", async () => {
  const ownerId = await createOwner("Ada");
  try {
    const productId = await createProduct(ownerId, [
      "03_CAP104_Inspection_RevA.pdf",
      "02_Lotus_ISO_Certificate_Demo.pdf",
    ]);
    extractFacts.mockImplementation(async (input: { pages: PageText[] }) => {
      const inspection = input.pages.find((page) => page.filename.startsWith("03_"));
      const skipped = input.pages.find((page) => page.filename.startsWith("02_"));
      if (!inspection || !skipped) throw new Error("the pipeline did not pass both documents");
      return withWarnings(inspectionObservations(inspection), [
        {
          documentId: skipped.documentId,
          filename: skipped.filename,
          message: `No observations were extracted for document ${skipped.documentId} (${skipped.filename}) after one retry. Mark processing incomplete.`,
        },
      ]);
    });

    const job = await startAssessment(ownerId, productId);
    await runAssessment(job.id);
    await runAssessment(job.id);

    const [stored] = await db.select().from(assessmentJob).where(eq(assessmentJob.id, job.id));
    expect(stored?.status).toBe("COMPLETED");
    expect(stored?.stage).toBe("saving");
    const results = await db
      .select()
      .from(assessmentResult)
      .where(eq(assessmentResult.jobId, job.id));
    expect(results).toHaveLength(1);
    const result = results[0];
    if (!result) throw new Error("missing result");
    expect(result.complete).toBe(false);
    expect(result.findings).toHaveLength(5);
    expect(finding(result.findings, "R3").status).toBe("DOCUMENTED");
    expect(finding(result.findings, "R3").citations.length).toBeGreaterThan(0);
    expect(finding(result.findings, "R4").status).toBe("NEEDS_REVIEW");
    expect(finding(result.findings, "R4").citations).toEqual([]);
    expect(result.findings.some((item) => item.status === "MISSING")).toBe(false);
    expect(result.documents.map((item) => item.filename).sort()).toEqual([
      "02_Lotus_ISO_Certificate_Demo.pdf",
      "03_CAP104_Inspection_RevA.pdf",
    ]);
  } finally {
    await db.delete(user).where(eq(user.id, ownerId));
  }
});

test("readable pages with no coverage warning can report a requirement missing", async () => {
  const ownerId = await createOwner("Bea");
  try {
    const productId = await createProduct(ownerId, ["01_Lotus_Material_Datasheet.pdf"]);
    extractFacts.mockImplementation(async () => withWarnings([], []));

    const job = await startAssessment(ownerId, productId);
    await runAssessment(job.id);

    const [result] = await db
      .select()
      .from(assessmentResult)
      .where(eq(assessmentResult.jobId, job.id));
    if (!result) throw new Error("missing result");
    expect(result.complete).toBe(true);
    expect(finding(result.findings, "R4").status).toBe("MISSING");
    expect(finding(result.findings, "R4").citations).toEqual([]);
  } finally {
    await db.delete(user).where(eq(user.id, ownerId));
  }
});

test("a failed fact extraction marks the job as needing attention and stores no result", async () => {
  const ownerId = await createOwner("Cara");
  try {
    const productId = await createProduct(ownerId, ["01_Lotus_Material_Datasheet.pdf"]);
    extractFacts.mockRejectedValue(
      new Error(
        "GEMINI_API_KEY is not set. Add it to .env before using this feature (see .env.example).",
      ),
    );

    const job = await startAssessment(ownerId, productId);
    await runAssessment(job.id);

    const [stored] = await db.select().from(assessmentJob).where(eq(assessmentJob.id, job.id));
    expect(stored?.status).toBe("NEEDS_ATTENTION");
    expect(stored?.error).toContain("GEMINI_API_KEY is not set");
    expect(stored?.resultId).toBeNull();
    const results = await db
      .select()
      .from(assessmentResult)
      .where(eq(assessmentResult.jobId, job.id));
    expect(results).toHaveLength(0);
  } finally {
    await db.delete(user).where(eq(user.id, ownerId));
  }
});
