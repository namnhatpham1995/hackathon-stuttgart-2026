import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { and, eq } from "drizzle-orm";
import { expect, test } from "vitest";
import { z } from "zod";

import { db } from "@/db/client";
import {
  assessmentJob,
  assessmentResult,
  document,
  notification,
  product,
  user,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { startAssessment } from "@/lib/jobs/service";

import { runAssessment } from "./pipeline";
import type { Finding } from "./types";

/**
 * Live assessment. From a checkout whose `.env` points DATABASE_URL at local
 * Postgres (port 5434, created by `pnpm dev:setup`):
 *
 *   GEMINI_API_KEY="<key>" GEMINI_MODEL="gemini-3.6-flash" pnpm test:golden
 *
 * Run that command twice. No Brevo or other API key is read. The stored
 * assessment date is the Europe/Berlin calendar date; the answer key fixes
 * it at 2026-11-07.
 */

const fixturesDir = path.resolve(import.meta.dirname, "../../../fixtures/exportready");
const password = "correct-horse-1";
const liveTimeoutMs = 240_000;

const findingStatusSchema = z.enum([
  "DOCUMENTED",
  "MISSING",
  "MISMATCH",
  "EXPIRED",
  "NEEDS_REVIEW",
]);

const findingsSchema = z.record(z.string(), findingStatusSchema);

const answerKeySchema = z.object({
  assessmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  baseline: z.object({
    documents: z.array(z.string().min(1)).min(1),
    documentedCount: z.number().int(),
    issueCount: z.number().int(),
    findings: findingsSchema,
  }),
  correction: z.object({
    replace: z.record(z.string().min(1), z.string().min(1)),
    documents: z.array(z.string().min(1)).min(1),
    documentedCount: z.number().int(),
    issueCount: z.number().int(),
    changedRequirements: z.array(z.string().min(1)).min(1),
    findings: findingsSchema,
  }),
  trap: z.object({
    file: z.string().min(1),
    findings: findingsSchema,
  }),
  empty: z.object({
    file: z.string().min(1),
    result: z.literal("incomplete"),
  }),
});

const answerKey = answerKeySchema.parse(
  JSON.parse(readFileSync(path.join(fixturesDir, "answer-key.json"), "utf8")),
);

const replaceEntries = Object.entries(answerKey.correction.replace);
const replacedName = replaceEntries[0]?.[0];
const replacementName = replaceEntries[0]?.[1];
if (!replacedName || !replacementName || replaceEntries.length !== 1) {
  throw new Error("answer-key.json correction.replace must name one file");
}

type StoredResult = {
  id: string;
  complete: boolean;
  assessmentDate: string;
  findings: Finding[];
  documents: { id: string; filename: string; sha256: string }[];
};

function requireLiveGemini(): void {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    throw new Error(
      "GEMINI_API_KEY is not set. Run: GEMINI_API_KEY=<key> GEMINI_MODEL=gemini-3.6-flash pnpm test:golden",
    );
  }
  if (!process.env.GEMINI_MODEL?.trim()) {
    throw new Error(
      "GEMINI_MODEL is not set. Run: GEMINI_API_KEY=<key> GEMINI_MODEL=gemini-3.6-flash pnpm test:golden",
    );
  }
}

function statuses(findings: Finding[]): Record<string, string> {
  return Object.fromEntries(findings.map((item) => [item.requirementId, item.status]));
}

function readFixture(filename: string): Buffer {
  return readFileSync(path.join(fixturesDir, filename));
}

async function withOwner(label: string, run: (ownerId: string) => Promise<void>) {
  const email = `${label.toLowerCase()}-${crypto.randomUUID()}@example.com`;
  const signedUp = await auth.api.signUpEmail({
    body: { name: label, email, password },
  });
  const ownerId = signedUp.user.id;
  try {
    await run(ownerId);
  } finally {
    await db.delete(user).where(eq(user.id, ownerId));
  }
}

async function insertDocuments(
  productId: string,
  files: readonly { filename: string; content: Buffer }[],
) {
  await db.insert(document).values(
    files.map((file) => ({
      id: crypto.randomUUID(),
      productId,
      filename: file.filename,
      mimeType: "application/pdf",
      kind: "evidence" as const,
      sizeBytes: file.content.length,
      sha256: createHash("sha256").update(file.content).digest("hex"),
      content: file.content,
      state: "active" as const,
    })),
  );
}

async function assess(
  ownerId: string,
  files: readonly { filename: string; content: Buffer }[],
): Promise<StoredResult> {
  const productId = crypto.randomUUID();
  await db.insert(product).values({
    id: productId,
    userId: ownerId,
    requirementSetKey: "neckar-cap-104",
    requirementSetVersion: 1,
    name: "Cover cap",
  });
  await insertDocuments(productId, files);
  const job = await startAssessment(ownerId, productId);
  await runAssessment(job.id);
  return readResult(job.id);
}

async function readResult(jobId: string): Promise<StoredResult> {
  const [storedJob] = await db.select().from(assessmentJob).where(eq(assessmentJob.id, jobId));
  expect(storedJob?.status, storedJob?.error ?? "assessment job missing").toBe("COMPLETED");
  const [result] = await db
    .select()
    .from(assessmentResult)
    .where(eq(assessmentResult.jobId, jobId));
  if (!result) throw new Error(`no result for job ${jobId}`);
  const [notice] = await db.select().from(notification).where(eq(notification.jobId, jobId));
  expect(notice?.type).toBe("assessment_completed");
  expect(notice?.attempts).toBe(1);
  return result;
}

function expectPackage(
  result: StoredResult,
  expected: {
    documents: readonly string[];
    findings: Record<string, string>;
    documentedCount: number;
    issueCount: number;
    complete: boolean;
  },
) {
  expect(result.assessmentDate).toBe(answerKey.assessmentDate);
  expect(result.complete).toBe(expected.complete);
  expect(result.documents.map((item) => item.filename).sort()).toEqual(
    [...expected.documents].sort(),
  );
  expect(statuses(result.findings)).toEqual(expected.findings);
  const documented = result.findings.filter((item) => item.status === "DOCUMENTED").length;
  expect(documented).toBe(expected.documentedCount);
  expect(result.findings.length - documented).toBe(expected.issueCount);
  expect(result.findings.map((item) => item.requirementId).sort()).toEqual(
    Object.keys(expected.findings).sort(),
  );
  for (const item of result.findings) {
    if (item.status === "MISSING" || item.status === "NEEDS_REVIEW") {
      if (item.status === "MISSING") expect(item.citations).toEqual([]);
      continue;
    }
    expect(item.citations.length).toBeGreaterThan(0);
  }
}

function filesNamed(filenames: readonly string[]) {
  return filenames.map((filename) => ({ filename, content: readFixture(filename) }));
}

test(
  "documents 01-04 match the answer key",
  async () => {
    requireLiveGemini();
    await withOwner("Baseline", async (ownerId) => {
      const result = await assess(ownerId, filesNamed(answerKey.baseline.documents));
      expectPackage(result, { ...answerKey.baseline, complete: true });
    });
  },
  liveTimeoutMs,
);

test(
  "replacing the revision-A report with revision B flips only R3",
  async () => {
    requireLiveGemini();
    await withOwner("Correction", async (ownerId) => {
      const productId = crypto.randomUUID();
      await db.insert(product).values({
        id: productId,
        userId: ownerId,
        requirementSetKey: "neckar-cap-104",
        requirementSetVersion: 1,
        name: "Cover cap",
      });
      await insertDocuments(productId, filesNamed(answerKey.baseline.documents));

      const firstJob = await startAssessment(ownerId, productId);
      await runAssessment(firstJob.id);
      const first = await readResult(firstJob.id);
      expectPackage(first, { ...answerKey.baseline, complete: true });

      await db
        .update(document)
        .set({ state: "inactive" })
        .where(and(eq(document.productId, productId), eq(document.filename, replacedName)));
      await insertDocuments(productId, filesNamed([replacementName]));

      const secondJob = await startAssessment(ownerId, productId);
      expect(secondJob.id).not.toBe(firstJob.id);
      await runAssessment(secondJob.id);
      const second = await readResult(secondJob.id);
      expectPackage(second, { ...answerKey.correction, complete: true });

      const changed = Object.keys(answerKey.correction.findings)
        .filter((id) => statuses(second.findings)[id] !== statuses(first.findings)[id])
        .sort();
      expect(changed).toEqual([...answerKey.correction.changedRequirements].sort());

      const [previous] = await db
        .select()
        .from(assessmentResult)
        .where(eq(assessmentResult.id, first.id));
      if (!previous) throw new Error("the first result was replaced");
      expect(statuses(previous.findings)).toEqual(answerKey.baseline.findings);
      expect(previous.documents.map((item) => item.filename).sort()).toEqual(
        [...answerKey.baseline.documents].sort(),
      );
    });
  },
  liveTimeoutMs * 2,
);

test(
  "the RevB trap file still gives R3 MISMATCH",
  async () => {
    requireLiveGemini();
    await withOwner("Trap", async (ownerId) => {
      const filenames = answerKey.baseline.documents.map((filename) =>
        filename === replacedName ? answerKey.trap.file : filename,
      );
      const result = await assess(ownerId, filesNamed(filenames));
      expect(result.complete).toBe(true);
      expect(result.assessmentDate).toBe(answerKey.assessmentDate);
      expect(result.documents.map((item) => item.filename).sort()).toEqual([...filenames].sort());
      const revision = result.findings.find((item) => item.requirementId === "R3");
      expect(revision).toMatchObject({
        status: answerKey.trap.findings.R3,
      });
      expect(revision?.citations?.length ?? 0).toBeGreaterThan(0);
      expect(result.findings).toHaveLength(Object.keys(answerKey.baseline.findings).length);
    });
  },
  liveTimeoutMs,
);

test("empty.pdf marks the result incomplete", async () => {
  await withOwner("Empty", async (ownerId) => {
    const named = await assess(ownerId, filesNamed([answerKey.empty.file]));
    expect(named.complete).toBe(false);
    expect(named.documents.map((item) => item.filename)).toEqual([answerKey.empty.file]);
    expect(named.findings.map((item) => item.requirementId).sort()).toEqual(
      Object.keys(answerKey.baseline.findings).sort(),
    );
    expect(named.findings.some((item) => item.status === "MISSING")).toBe(false);

    const alias = await assess(ownerId, [
      { filename: "blank-scan.pdf", content: readFixture(answerKey.empty.file) },
    ]);
    expect(alias.complete).toBe(false);
    expect(alias.documents.map((item) => item.filename)).toEqual(["blank-scan.pdf"]);
    expect(alias.findings.some((item) => item.status === "MISSING")).toBe(false);
  });
});
