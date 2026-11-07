import { eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";

import { GET } from "@/app/api/jobs/[jobId]/route";
import { db } from "@/db/client";
import { assessmentJob, document, product } from "@/db/schema";
import { auth } from "@/lib/auth";
import { startAssessment } from "@/lib/jobs/service";

const password = "correct-horse-1";

async function createUser(name: string) {
  const email = `${name.toLowerCase()}-${crypto.randomUUID()}@example.com`;
  const result = await auth.api.signUpEmail({ body: { name, email, password } });
  return { id: result.user.id, email };
}

async function sessionCookie(email: string) {
  const response = await auth.api.signInEmail({
    body: { email, password },
    asResponse: true,
  });
  const parts = response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]);
  if (parts.length === 0) throw new Error("sign-in did not set a session cookie");
  return parts.join("; ");
}

async function createProduct(userId: string) {
  const productId = crypto.randomUUID();
  await db.insert(product).values({
    id: productId,
    userId,
    requirementSetKey: "neckar-cap-104",
    requirementSetVersion: 1,
    name: "Cover cap",
  });
  await db.insert(document).values([
    {
      id: crypto.randomUUID(),
      productId,
      filename: "certificate.pdf",
      mimeType: "application/pdf",
      kind: "evidence",
      sizeBytes: 12,
      sha256: "hash-certificate",
      content: Buffer.from("certificate"),
      state: "active",
    },
    {
      id: crypto.randomUUID(),
      productId,
      filename: "datasheet.pdf",
      mimeType: "application/pdf",
      kind: "evidence",
      sizeBytes: 9,
      sha256: "hash-datasheet",
      content: Buffer.from("datasheet"),
      state: "active",
    },
  ]);
  return productId;
}

describe("assessment jobs", () => {
  test("the same snapshot started twice returns one job", async () => {
    const owner = await createUser("Ada");
    const productId = await createProduct(owner.id);

    const first = await startAssessment(owner.id, productId);
    const second = await startAssessment(owner.id, productId);

    expect(second.id).toBe(first.id);
    const rows = await db
      .select()
      .from(assessmentJob)
      .where(eq(assessmentJob.productId, productId));
    expect(rows).toHaveLength(1);
  });

  test("a direct duplicate insert is rejected by the unique index", async () => {
    const owner = await createUser("Ada");
    const productId = await createProduct(owner.id);
    const snapshot = {
      productId,
      requirementSetKey: "neckar-cap-104",
      requirementSetVersion: 1,
      documentSetHash: "same-snapshot",
      documentIds: ["doc-1"],
      status: "QUEUED" as const,
    };

    await db.insert(assessmentJob).values({ id: crypto.randomUUID(), ...snapshot });

    await expect(
      db.insert(assessmentJob).values({ id: crypto.randomUUID(), ...snapshot }),
    ).rejects.toMatchObject({
      cause: { constraint_name: "assessment_job_snapshot_unique" },
    });
  });

  test("another user's job returns 404", async () => {
    const owner = await createUser("Ada");
    const other = await createUser("Bea");
    const productId = await createProduct(owner.id);
    const job = await startAssessment(owner.id, productId);

    const foreign = await GET(
      new Request(`http://localhost/api/jobs/${job.id}`, {
        headers: { cookie: await sessionCookie(other.email) },
      }),
      { params: Promise.resolve({ jobId: job.id }) },
    );

    expect(foreign.status).toBe(404);
    const body = await foreign.text();
    expect(body).not.toContain("QUEUED");
    expect(body).not.toContain(productId);
    expect(body).not.toContain("hash-certificate");

    const owned = await GET(
      new Request(`http://localhost/api/jobs/${job.id}`, {
        headers: { cookie: await sessionCookie(owner.email) },
      }),
      { params: Promise.resolve({ jobId: job.id }) },
    );
    expect(owned.status).toBe(200);
    expect(await owned.json()).toMatchObject({
      id: job.id,
      status: "QUEUED",
      stage: null,
      error: null,
      resultId: null,
    });
  });
});
