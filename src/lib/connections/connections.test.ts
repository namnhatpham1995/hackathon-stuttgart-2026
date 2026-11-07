import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, test, vi } from "vitest";

import { db } from "@/db/client";
import {
  assessmentJob,
  assessmentResult,
  buyerRequest,
  document,
  notification,
  requestConnection,
} from "@/db/schema";
import { env } from "@/env";
import { auth } from "@/lib/auth";
import {
  createBuyerRequest,
  getConnection,
  getSharedResult,
  listInbox,
  markNoticeRead,
  requestEvidence,
  requireConnection,
  respondToRequest,
  setProductListed,
  shareResult,
  unreadCount,
} from "@/lib/connections/service";
import { createProduct, updateProduct } from "@/lib/products/service";

const password = "correct-horse-1";

async function createUser(name: string) {
  const email = `${name.toLowerCase()}-${crypto.randomUUID()}@example.com`;
  const result = await auth.api.signUpEmail({ body: { name, email, password } });
  return { id: result.user.id, email };
}

async function supplierProduct(ownerId: string) {
  const created = await createProduct(ownerId, {
    name: "Cover cap",
    requirementSetKey: "neckar-cap-104",
    requirementSetVersion: 1,
  });
  return updateProduct(ownerId, created.id, {
    fields: { partNumber: { value: "CAP-104", origin: "user" } },
    profile: {
      companyName: "Lotus Mould",
      country: "China",
      productCategory: "Caps",
      capabilities: ["injection moulding"],
      targetMarket: "Germany",
    },
  });
}

async function neckarRequest(buyerId: string) {
  return createBuyerRequest(buyerId, {
    buyerOrgName: "Neckar Maschinenbau GmbH",
    title: "Cover cap CAP-104 rev B",
    partNumber: "CAP-104",
    requirementSetKey: "neckar-cap-104",
    requirementSetVersion: 1,
  });
}

async function insertCompletedResult(productId: string, reason: string) {
  const jobId = crypto.randomUUID();
  const resultId = crypto.randomUUID();
  const revision = reason.includes("revision B") ? "B" : "A";
  await db.insert(assessmentJob).values({
    id: jobId,
    productId,
    requirementSetKey: "neckar-cap-104",
    requirementSetVersion: 1,
    documentSetHash: crypto.randomUUID(),
    documentIds: [],
    status: "QUEUED",
  });
  await db.insert(assessmentResult).values({
    id: resultId,
    jobId,
    productId,
    assessmentDate: "2026-11-07",
    complete: true,
    findings: [
      {
        requirementId: "R3",
        status: "MISMATCH",
        evidenceType: "inspection_report",
        observed: { revision },
        citations: [
          {
            documentId: `doc-${resultId}`,
            filename: "03_inspection.pdf",
            page: 1,
            quote: `Drawing revision: ${revision}`,
          },
        ],
        reason,
        nextAction: "Replace the inspection report with revision B",
      },
    ],
    documents: [
      { id: `doc-${resultId}`, filename: "03_inspection.pdf", sha256: `hash-${resultId}` },
    ],
  });
  await db
    .update(assessmentJob)
    .set({ status: "COMPLETED", resultId })
    .where(eq(assessmentJob.id, jobId));
  return resultId;
}

async function connectedPair() {
  const buyer = await createUser("Neckar");
  const supplier = await createUser("Lotus");
  const third = await createUser("Other");
  const listing = await supplierProduct(supplier.id);
  const request = await neckarRequest(buyer.id);
  const connection = await respondToRequest(supplier.id, {
    requestId: request.id,
    productId: listing.id,
  });
  return { buyer, supplier, third, listing, request, connection };
}

describe("buyer and supplier connections", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("one account has separate buyer and supplier inboxes and read states", async () => {
    const { buyer: dual, third: customer, connection } = await connectedPair();
    const ownListing = await supplierProduct(dual.id);
    await setProductListed(dual.id, ownListing.id, true);
    const incoming = await requestEvidence(customer.id, {
      productId: ownListing.id,
      buyerOrgName: "Customer purchasing",
    });
    const resultId = await insertCompletedResult(ownListing.id, "Own assessment");
    const [job] = await db
      .select({ id: assessmentJob.id })
      .from(assessmentJob)
      .where(eq(assessmentJob.resultId, resultId));
    const assessmentNoticeId = crypto.randomUUID();
    assert.ok(job);
    await db.insert(notification).values({
      id: assessmentNoticeId,
      jobId: job.id,
      recipientUserId: dual.id,
      recipientEmail: dual.email,
      type: "assessment_completed",
      title: "Your assessment is ready",
      status: "failed",
    });

    const buyerInbox = await listInbox(dual.id, "buyer");
    const supplierInbox = await listInbox(dual.id, "supplier");
    expect(buyerInbox.map((notice) => notice.connectionId)).toEqual([connection.id]);
    expect(supplierInbox.map((notice) => notice.connectionId)).toEqual(
      expect.arrayContaining([incoming.id, null]),
    );
    expect(supplierInbox).toHaveLength(2);
    expect(await unreadCount(dual.id, "buyer")).toBe(1);
    expect(await unreadCount(dual.id, "supplier")).toBe(2);

    const incomingNotice = supplierInbox.find((notice) => notice.connectionId === incoming.id);
    assert.ok(incomingNotice);
    await expect(markNoticeRead(dual.id, incomingNotice.id, "buyer")).rejects.toMatchObject({
      status: 404,
      message: "Not found",
    });
    await expect(markNoticeRead(customer.id, incomingNotice.id, "supplier")).rejects.toMatchObject({
      status: 404,
      message: "Not found",
    });
    const [buyerNotice] = buyerInbox;
    assert.ok(buyerNotice);
    await markNoticeRead(dual.id, buyerNotice.id, "buyer");
    await markNoticeRead(dual.id, buyerNotice.id, "buyer");
    expect(await unreadCount(dual.id, "buyer")).toBe(0);
    expect(await unreadCount(dual.id, "supplier")).toBe(2);
    expect((await listInbox(dual.id, "buyer")).map((notice) => Boolean(notice.readAt))).toEqual([
      true,
    ]);
    expect((await listInbox(dual.id, "supplier")).map((notice) => notice.readAt)).toEqual([
      null,
      null,
    ]);
  });

  test("the buyer reads the shared result and not a later unshared one", async () => {
    const { buyer, supplier, listing, connection } = await connectedPair();
    const baselineId = await insertCompletedResult(listing.id, "Baseline inspection is revision A");
    const laterId = await insertCompletedResult(listing.id, "Corrected inspection is revision B");
    await db.insert(document).values({
      id: crypto.randomUUID(),
      productId: listing.id,
      filename: "03_inspection.pdf",
      mimeType: "application/pdf",
      kind: "evidence",
      sizeBytes: 16,
      sha256: "hash-secret-pdf",
      content: Buffer.from("SECRET-PDF-BYTES"),
      state: "active",
    });

    await shareResult(supplier.id, connection.id, baselineId);
    const first = await getSharedResult(buyer.id, connection.id);

    expect(first?.id).toBe(baselineId);
    expect(first?.findings.map((finding) => finding.reason)).toEqual([
      "Baseline inspection is revision A",
    ]);
    expect(first?.findings[0]?.citations).toEqual([
      {
        documentId: `doc-${baselineId}`,
        filename: "03_inspection.pdf",
        page: 1,
        quote: "Drawing revision: A",
      },
    ]);
    const firstPayload = JSON.stringify(first);
    expect(firstPayload).not.toContain("Corrected inspection is revision B");
    expect(firstPayload).not.toContain("SECRET-PDF-BYTES");
    expect(firstPayload).not.toContain(buyer.email);
    expect(firstPayload).not.toContain(supplier.email);
    expect(firstPayload).not.toContain("hash-secret-pdf");

    await shareResult(supplier.id, connection.id, laterId);
    const second = await getSharedResult(buyer.id, connection.id);
    expect(second?.id).toBe(laterId);
    expect(second?.findings.map((finding) => finding.reason)).toEqual([
      "Corrected inspection is revision B",
    ]);
    expect(JSON.stringify(second)).not.toContain("Baseline inspection is revision A");
  });

  test("a share with email unconfigured keeps the connection and fails the notice", async () => {
    expect(env.BREVO_API_KEY).toBeUndefined();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { buyer, supplier, listing, connection } = await connectedPair();
    const baselineId = await insertCompletedResult(listing.id, "Baseline inspection is revision A");

    const shared = await shareResult(supplier.id, connection.id, baselineId);

    expect(shared.status).toBe("shared");
    expect(shared.sharedResultId).toBe(baselineId);
    const notices = await db
      .select()
      .from(notification)
      .where(eq(notification.connectionId, connection.id));
    const reportNotice = notices.find((row) => row.type === "report_shared");
    expect(reportNotice).toMatchObject({
      connectionId: connection.id,
      recipientUserId: buyer.id,
      recipientEmail: buyer.email,
      type: "report_shared",
      title: "Lotus Mould shared an evidence report",
      status: "failed",
      error: "email not configured",
    });
    expect(reportNotice?.title).not.toContain(supplier.email);
    expect(reportNotice?.title).not.toContain(buyer.email);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("a third user gets not found", async () => {
    const { supplier, third, listing, connection } = await connectedPair();
    const baselineId = await insertCompletedResult(listing.id, "Shared with Neckar only");
    await shareResult(supplier.id, connection.id, baselineId);

    expect(await getConnection(third.id, connection.id)).toBeNull();
    expect(await getSharedResult(third.id, connection.id)).toBeNull();
    await expect(requireConnection(third.id, connection.id)).rejects.toMatchObject({
      name: "ConnectionRequestError",
      status: 404,
      message: "Not found",
    });
  });

  test("a second connection for the same request and product is rejected by the unique index", async () => {
    const buyer = await createUser("Neckar");
    const supplier = await createUser("Lotus");
    const listing = await supplierProduct(supplier.id);
    const request = await neckarRequest(buyer.id);
    const row = {
      requestId: request.id,
      productId: listing.id,
      initiatedBy: "supplier" as const,
      status: "in_progress" as const,
    };

    await db.insert(requestConnection).values({ id: crypto.randomUUID(), ...row });

    await expect(
      db.insert(requestConnection).values({ id: crypto.randomUUID(), ...row }),
    ).rejects.toMatchObject({
      cause: { constraint_name: "request_connection_request_product_unique" },
    });
  });

  test("a shared connection without a result is rejected by the check", async () => {
    const buyer = await createUser("Neckar");
    const supplier = await createUser("Lotus");
    const listing = await supplierProduct(supplier.id);
    const request = await neckarRequest(buyer.id);

    await expect(
      db.insert(requestConnection).values({
        id: crypto.randomUUID(),
        requestId: request.id,
        productId: listing.id,
        initiatedBy: "supplier",
        status: "shared",
        sharedResultId: null,
      }),
    ).rejects.toMatchObject({
      cause: { constraint_name: "request_connection_shared_requires_result" },
    });
  });

  test("a supplier cannot connect their own product to their own request", async () => {
    const buyer = await createUser("Neckar");
    const listing = await supplierProduct(buyer.id);
    const request = await neckarRequest(buyer.id);

    await expect(
      respondToRequest(buyer.id, { requestId: request.id, productId: listing.id }),
    ).rejects.toMatchObject({
      name: "ConnectionRequestError",
      status: 400,
      message: "You cannot connect your own product to your own request",
    });

    await setProductListed(buyer.id, listing.id, true);
    await expect(
      requestEvidence(buyer.id, {
        productId: listing.id,
        buyerOrgName: "Neckar Maschinenbau GmbH",
      }),
    ).rejects.toMatchObject({
      name: "ConnectionRequestError",
      status: 400,
      message: "You cannot connect your own product to your own request",
    });

    const links = await db
      .select()
      .from(requestConnection)
      .where(eq(requestConnection.productId, listing.id));
    expect(links).toHaveLength(0);
    const directRequests = await db
      .select()
      .from(buyerRequest)
      .where(eq(buyerRequest.visibility, "direct"));
    expect(directRequests.filter((row) => row.buyerUserId === buyer.id)).toHaveLength(0);
  });
});
