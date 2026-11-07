import { eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";

import { db } from "@/db/client";
import { assessmentJob, product, user } from "@/db/schema";

describe("assessment job completion", () => {
  test("updating a job to completed without a stored result is rejected", async () => {
    const userId = crypto.randomUUID();
    await db.insert(user).values({
      id: userId,
      name: "Ada",
      email: `ada-${userId}@example.com`,
    });
    const productId = crypto.randomUUID();
    await db.insert(product).values({
      id: productId,
      userId,
      requirementSetKey: "neckar-cap-104",
      requirementSetVersion: 1,
      name: "Cover cap",
    });
    const jobId = crypto.randomUUID();
    await db.insert(assessmentJob).values({
      id: jobId,
      productId,
      requirementSetKey: "neckar-cap-104",
      requirementSetVersion: 1,
      documentSetHash: "snapshot-hash",
      documentIds: ["doc-1"],
      status: "QUEUED",
    });

    await expect(
      db.update(assessmentJob).set({ status: "COMPLETED" }).where(eq(assessmentJob.id, jobId)),
    ).rejects.toMatchObject({
      cause: { constraint_name: "assessment_job_completed_requires_result" },
    });
  });
});
