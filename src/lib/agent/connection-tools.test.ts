import { eq } from "drizzle-orm";
import { expect, test } from "vitest";

import { db } from "@/db/client";
import {
  assessmentJob,
  assessmentResult,
  buyerRequest,
  notification,
  product,
  requestConnection,
  user,
} from "@/db/schema";
import type { ProductFields } from "@/lib/assessment/types";

import { executeAgentTool } from "./tools";

async function createUser(name: string) {
  const id = crypto.randomUUID();
  await db
    .insert(user)
    .values({ id, name, email: `${name}-${id}@tools.example`, emailVerified: false });
  return id;
}

async function createProduct(ownerId: string, name: string, listed: boolean) {
  const id = crypto.randomUUID();
  const fields: ProductFields = { partNumber: { value: `PN-${name}`, origin: "user" } };
  await db.insert(product).values({
    id,
    userId: ownerId,
    requirementSetKey: "neckar-cap-104",
    requirementSetVersion: 1,
    name,
    fields,
    profile: {},
    listed,
  });
  return id;
}

async function createRequest(buyerId: string, title: string) {
  const id = crypto.randomUUID();
  await db.insert(buyerRequest).values({
    id,
    buyerUserId: buyerId,
    buyerOrgName: "Neckar GmbH",
    title,
    partNumber: "CAP-104",
    requirementSetKey: "neckar-cap-104",
    requirementSetVersion: 1,
    visibility: "open",
    status: "open",
  });
  return id;
}

async function connect(requestId: string, productId: string) {
  const id = crypto.randomUUID();
  await db.insert(requestConnection).values({
    id,
    requestId,
    productId,
    initiatedBy: "buyer",
    status: "requested",
  });
  return id;
}

async function completedResult(productId: string) {
  const jobId = crypto.randomUUID();
  const resultId = crypto.randomUUID();
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
    findings: [],
    documents: [],
  });
  await db
    .update(assessmentJob)
    .set({ status: "COMPLETED", resultId })
    .where(eq(assessmentJob.id, jobId));
  return resultId;
}

async function rowCounts() {
  const [connections, notices] = await Promise.all([
    db.select({ id: requestConnection.id }).from(requestConnection),
    db.select({ id: notification.id }).from(notification),
  ]);
  return { connections: connections.length, notices: notices.length };
}

test("confirm tools return one card and write no connection or notification", async () => {
  const buyer = await createUser("buyer");
  const supplier = await createUser("supplier");
  const listed = await createProduct(supplier, "Listed Cap", true);
  const request = await createRequest(buyer, "Need caps");
  const connectionId = await connect(request, listed);
  const resultId = await completedResult(listed);
  const before = await rowCounts();

  const evidence = await executeAgentTool(buyer, null, {
    name: "request_evidence",
    args: { productId: listed, buyerOrgName: "Neckar GmbH" },
  });
  const share = await executeAgentTool(supplier, null, {
    name: "share_result",
    args: { connectionId, resultId },
  });

  expect(evidence.directive).toMatchObject({
    type: "confirm_action",
    send: { action: "request_evidence", productId: listed, buyerOrgName: "Neckar GmbH" },
  });
  expect(share.directive).toMatchObject({
    type: "confirm_action",
    send: { action: "share_result", connectionId, resultId },
  });
  expect(JSON.stringify(evidence.directive)).toContain("Listed Cap");
  expect(await rowCounts()).toEqual(before);
  const [stored] = await db
    .select({ status: requestConnection.status, shared: requestConnection.sharedResultId })
    .from(requestConnection)
    .where(eq(requestConnection.id, connectionId));
  expect(stored).toEqual({ status: "requested", shared: null });
});

test("a confirm card for another user's result or an unlisted product is not found", async () => {
  const buyer = await createUser("buyer");
  const supplier = await createUser("supplier");
  const unlisted = await createProduct(supplier, "Hidden Cap", false);
  const request = await createRequest(buyer, "Need caps");
  const connectionId = await connect(request, unlisted);
  const resultId = await completedResult(unlisted);

  const hidden = await executeAgentTool(buyer, null, {
    name: "request_evidence",
    args: { productId: unlisted, buyerOrgName: "Neckar GmbH" },
  });
  const foreignShare = await executeAgentTool(buyer, null, {
    name: "share_result",
    args: { connectionId, resultId },
  });

  for (const result of [hidden, foreignShare]) {
    expect(result.directive).toBeUndefined();
    expect(result.output).toMatchObject({ ok: false, error: "not found" });
  }
});

test("close_request on another user's request is not found and leaves it open", async () => {
  const owner = await createUser("owner");
  const stranger = await createUser("stranger");
  const request = await createRequest(owner, "Owner request");

  const refused = await executeAgentTool(stranger, null, {
    name: "close_request",
    args: { requestId: request },
  });

  expect(refused.output).toMatchObject({ ok: false, error: "not found" });
  const [row] = await db
    .select({ status: buyerRequest.status })
    .from(buyerRequest)
    .where(eq(buyerRequest.id, request));
  expect(row?.status).toBe("open");

  const closed = await executeAgentTool(owner, null, {
    name: "close_request",
    args: { requestId: request },
  });
  expect(closed.output).toMatchObject({ ok: true, closed: true });
  const [after] = await db
    .select({ status: buyerRequest.status })
    .from(buyerRequest)
    .where(eq(buyerRequest.id, request));
  expect(after?.status).toBe("closed");
});

test("search_catalog never returns the caller's own or unlisted products", async () => {
  const buyer = await createUser("buyer");
  const supplier = await createUser("supplier");
  const marker = `Zq${crypto.randomUUID().slice(0, 8)}`;
  const other = await createProduct(supplier, `${marker}-other`, true);
  await createProduct(supplier, `${marker}-hidden`, false);
  await createProduct(buyer, `${marker}-own`, true);

  const result = await executeAgentTool(buyer, null, {
    name: "search_catalog",
    args: { q: marker },
  });

  const products = (result.output.products as { productId: string }[]).map((p) => p.productId);
  expect(products).toEqual([other]);
});
