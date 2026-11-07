import { createHash } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { after } from "next/server";
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
import { runAssessment } from "@/lib/assessment/pipeline";
import {
  type Finding,
  findingSchema,
  type JobStage,
  type JobStatus,
  jobStages,
  jobStatuses,
} from "@/lib/assessment/types";

export type JobRecord = {
  id: string;
  productId: string;
  status: JobStatus;
  stage: JobStage | null;
  error: string | null;
  attempts: number;
  resultId: string | null;
};

export type CompletedAssessment = {
  assessmentDate: string;
  complete: boolean;
  findings: Finding[];
  documents: { id: string; filename: string; sha256: string }[];
};

/** The product is missing or belongs to someone else. Callers map this to 404. */
export class NotFoundError extends Error {
  constructor() {
    super("Not found");
    this.name = "NotFoundError";
  }
}

const idSchema = z.string().trim().min(1).max(200);
const jobStatusSchema = z.enum(jobStatuses);
const jobStageSchema = z.enum(jobStages).nullable();

const completedAssessmentSchema = z.object({
  assessmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  complete: z.boolean(),
  findings: z.array(findingSchema),
  documents: z.array(
    z.object({
      id: z.string().min(1),
      filename: z.string().min(1),
      sha256: z.string().min(1),
    }),
  ),
});

/** A crashed run is retried once. The third observation is a failure the user can act on. */
const MAX_ATTEMPTS = 2;

const STUCK_ERROR =
  "The assessment stopped while it was running and was not saved. Upload or replace a document, then start a new assessment.";

type JobRow = typeof assessmentJob.$inferSelect;

/**
 * Schedules the runner after the response, on the Node server that handled
 * this request. In production that server is Railway: `next.config.ts`
 * rewrites `/api/*` there before Vercel serves its own functions, and
 * Railway has no function timeout. Do not set `maxDuration`. `after()` on
 * a Vercel function ends with that function, so this refuses to schedule
 * when `VERCEL` is set.
 */
function scheduleAssessmentRun(jobId: string): void {
  if (process.env.VERCEL === "1") {
    throw new Error(
      "Assessment jobs run on the API server. POST /api/jobs so Railway starts the run.",
    );
  }
  try {
    after(() => runAssessment(jobId));
  } catch (error) {
    // Persistence tests and scripts call the service outside a request.
    // The row is already stored. POST and GET run inside a request, so
    // after() is scheduled there.
    if (error instanceof Error && error.message.includes("outside a request scope")) return;
    throw error;
  }
}

function toRecord(row: JobRow): JobRecord {
  return {
    id: row.id,
    productId: row.productId,
    status: jobStatusSchema.parse(row.status),
    stage: jobStageSchema.parse(row.stage),
    error: row.error,
    attempts: row.attempts,
    resultId: row.resultId,
  };
}

/** sha256 of the sorted sha256s of the active documents (Decision 6). */
function hashDocumentSet(sha256s: readonly string[]): string {
  return createHash("sha256")
    .update([...sha256s].sort().join("\n"))
    .digest("hex");
}

export async function startAssessment(userId: string, productId: string): Promise<JobRecord> {
  if (process.env.VERCEL === "1") {
    throw new Error(
      "Assessment jobs run on the API server. POST /api/jobs so Railway starts the run.",
    );
  }
  const ownerId = idSchema.parse(userId);
  const ownedProductId = idSchema.parse(productId);

  const [owned] = await db
    .select()
    .from(product)
    .where(and(eq(product.id, ownedProductId), eq(product.userId, ownerId)));
  if (!owned) throw new NotFoundError();

  const active = await db
    .select({ id: document.id, sha256: document.sha256 })
    .from(document)
    .where(and(eq(document.productId, owned.id), eq(document.state, "active")));
  const snapshot = [...active].sort((left, right) => {
    if (left.sha256 < right.sha256) return -1;
    if (left.sha256 > right.sha256) return 1;
    if (left.id < right.id) return -1;
    if (left.id > right.id) return 1;
    return 0;
  });
  const documentSetHash = hashDocumentSet(snapshot.map((item) => item.sha256));

  const inserted = await db
    .insert(assessmentJob)
    .values({
      id: crypto.randomUUID(),
      productId: owned.id,
      requirementSetKey: owned.requirementSetKey,
      requirementSetVersion: owned.requirementSetVersion,
      documentSetHash,
      documentIds: snapshot.map((item) => item.id),
      status: "QUEUED",
    })
    .onConflictDoNothing({
      target: [
        assessmentJob.productId,
        assessmentJob.requirementSetKey,
        assessmentJob.requirementSetVersion,
        assessmentJob.documentSetHash,
      ],
    })
    .returning();

  const row =
    inserted[0] ??
    (
      await db
        .select()
        .from(assessmentJob)
        .where(
          and(
            eq(assessmentJob.productId, owned.id),
            eq(assessmentJob.requirementSetKey, owned.requirementSetKey),
            eq(assessmentJob.requirementSetVersion, owned.requirementSetVersion),
            eq(assessmentJob.documentSetHash, documentSetHash),
          ),
        )
    )[0];
  if (!row) throw new Error("The assessment job could not be stored.");

  // A finished or failed snapshot stays as it is. A queued one (new, or
  // still waiting) is the only row a runner may claim.
  if (row.status === "QUEUED") scheduleAssessmentRun(row.id);
  return toRecord(row);
}

/** Claims QUEUED → PROCESSING. Null means another runner already has the job. */
export async function claimJob(jobId: string): Promise<JobRecord | null> {
  const id = idSchema.parse(jobId);
  const [row] = await db
    .update(assessmentJob)
    .set({
      status: "PROCESSING",
      startedAt: sql`now()`,
      attempts: sql`${assessmentJob.attempts} + 1`,
      error: null,
    })
    .where(and(eq(assessmentJob.id, id), eq(assessmentJob.status, "QUEUED")))
    .returning();
  return row ? toRecord(row) : null;
}

export async function setStage(jobId: string, stage: JobStage): Promise<void> {
  const id = idSchema.parse(jobId);
  const next = z.enum(jobStages).parse(stage);
  const [row] = await db
    .update(assessmentJob)
    .set({ stage: next })
    .where(and(eq(assessmentJob.id, id), eq(assessmentJob.status, "PROCESSING")))
    .returning({ id: assessmentJob.id });
  if (!row) throw new Error("The job is not processing, so its stage was not updated.");
}

export async function failJob(jobId: string, error: string): Promise<void> {
  const id = idSchema.parse(jobId);
  const message = z.string().trim().min(1).max(4000).parse(error);
  const [row] = await db
    .update(assessmentJob)
    .set({
      status: "NEEDS_ATTENTION",
      error: message,
      finishedAt: sql`now()`,
    })
    .where(and(eq(assessmentJob.id, id), eq(assessmentJob.status, "PROCESSING")))
    .returning({ id: assessmentJob.id });
  if (!row)
    throw new Error("The job is not processing, so it was not marked as needing attention.");
}

export async function completeJob(
  jobId: string,
  result: CompletedAssessment,
): Promise<{ resultId: string; notificationId: string }> {
  const id = idSchema.parse(jobId);
  const assessment = completedAssessmentSchema.parse(result);

  // Group 10 sends this notification after the transaction commits. The report
  // is already stored if that send fails.
  return db.transaction(async (tx) => {
    const [job] = await tx.select().from(assessmentJob).where(eq(assessmentJob.id, id));
    if (job?.status !== "PROCESSING") {
      throw new Error("The job is not processing, so it was not completed.");
    }

    const [owner] = await tx
      .select({ userId: user.id, email: user.email })
      .from(product)
      .innerJoin(user, eq(user.id, product.userId))
      .where(eq(product.id, job.productId));
    if (!owner) throw new NotFoundError();

    const resultId = crypto.randomUUID();
    await tx.insert(assessmentResult).values({
      id: resultId,
      jobId: job.id,
      productId: job.productId,
      assessmentDate: assessment.assessmentDate,
      complete: assessment.complete,
      findings: assessment.findings,
      documents: assessment.documents,
    });

    const [completed] = await tx
      .update(assessmentJob)
      .set({
        status: "COMPLETED",
        resultId,
        finishedAt: sql`now()`,
        error: null,
      })
      .where(and(eq(assessmentJob.id, job.id), eq(assessmentJob.status, "PROCESSING")))
      .returning({ id: assessmentJob.id });
    if (!completed) throw new Error("The job was no longer processing, so it was not completed.");

    const notificationId = crypto.randomUUID();
    await tx.insert(notification).values({
      id: notificationId,
      jobId: job.id,
      recipientUserId: owner.userId,
      recipientEmail: owner.email,
      type: "assessment_completed",
      title: "Your ExportReady assessment is ready",
      status: "pending",
    });

    return { resultId, notificationId };
  });
}

/**
 * The owner's job, or null when the id is unknown or belongs to someone else.
 * A job stuck in PROCESSING for more than five minutes is re-queued, up to two
 * attempts. The re-queue schedules the runner on this request, which in
 * production is the Railway `/api/jobs` route.
 */
export async function getJob(userId: string, jobId: string): Promise<JobRecord | null> {
  const ownerId = idSchema.parse(userId);
  const id = idSchema.parse(jobId);
  const [found] = await db
    .select({ job: assessmentJob })
    .from(assessmentJob)
    .innerJoin(product, eq(product.id, assessmentJob.productId))
    .where(and(eq(assessmentJob.id, id), eq(product.userId, ownerId)));
  if (!found) return null;

  const [requeued] = await db
    .update(assessmentJob)
    .set({ status: "QUEUED", startedAt: null, stage: null })
    .where(
      and(
        eq(assessmentJob.id, id),
        eq(assessmentJob.status, "PROCESSING"),
        sql`${assessmentJob.startedAt} < now() - interval '5 minutes'`,
        sql`${assessmentJob.attempts} < ${MAX_ATTEMPTS}`,
      ),
    )
    .returning();
  if (requeued) {
    scheduleAssessmentRun(requeued.id);
    return toRecord(requeued);
  }

  const [exhausted] = await db
    .update(assessmentJob)
    .set({
      status: "NEEDS_ATTENTION",
      error: STUCK_ERROR,
      finishedAt: sql`now()`,
    })
    .where(
      and(
        eq(assessmentJob.id, id),
        eq(assessmentJob.status, "PROCESSING"),
        sql`${assessmentJob.startedAt} < now() - interval '5 minutes'`,
        sql`${assessmentJob.attempts} >= ${MAX_ATTEMPTS}`,
      ),
    )
    .returning();
  if (exhausted) return toRecord(exhausted);

  return toRecord(found.job);
}
