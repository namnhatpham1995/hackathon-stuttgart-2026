import { and, count, desc, eq, or, sql } from "drizzle-orm";
import { z } from "zod";

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
import { getRequirementSet } from "@/lib/assessment/requirement-sets";
import {
  type Finding,
  findingSchema,
  productFieldsSchema,
  type StoredSupplierProfile,
  supplierProfileSchema,
} from "@/lib/assessment/types";
import { createProduct, ProductRequestError } from "@/lib/products/service";

import { deliverConnectionNotices } from "./notify";

const requiredText = z.string().trim().min(1).max(300);
const optionalMessage = z.string().trim().max(1000).optional();

const idSchema = z.string().trim().min(1).max(200);
const initiatedBySchema = z.enum(["buyer", "supplier"]);
const connectionStatusSchema = z.enum(["requested", "in_progress", "shared", "declined"]);
const noticeTypeSchema = z.enum(["assessment_completed", "request_received", "report_shared"]);

const assessedDocumentSchema = z.object({
  id: z.string().min(1),
  filename: z.string().min(1),
  sha256: z.string().min(1),
});

export const createBuyerRequestInput = z.object({
  buyerOrgName: requiredText,
  title: requiredText,
  partNumber: requiredText,
  requirementSetKey: z.string().trim().min(1),
  requirementSetVersion: z.number().int().positive(),
  message: optionalMessage,
});

export const respondToRequestInput = z
  .object({
    requestId: requiredText,
    productId: z.string().trim().min(1).optional(),
    newProductName: z.string().trim().min(1).max(300).optional(),
    message: optionalMessage,
  })
  .refine((input) => Boolean(input.productId) !== Boolean(input.newProductName), {
    message: "Respond with an existing product or a new product name, not both",
  });

export const requestEvidenceInput = z.object({
  productId: requiredText,
  buyerOrgName: requiredText,
  message: optionalMessage,
});

const SELF_CONNECTION = "You cannot connect your own product to your own request";

export class ConnectionRequestError extends Error {
  readonly status: 400 | 404 | 409;

  constructor(status: 400 | 404 | 409, message: string) {
    super(message);
    this.name = "ConnectionRequestError";
    this.status = status;
  }
}

export type BoardRequest = {
  id: string;
  buyerOrgName: string;
  title: string;
  partNumber: string;
  requirementSetKey: string;
  requirementSetVersion: number;
  /** True when the signed-in user posted the request. The buyer's id is not included. */
  own: boolean;
};

export type DirectoryListing = {
  productId: string;
  name: string;
  partNumber: string | null;
  profile: StoredSupplierProfile;
  /** True when the signed-in user owns the product. The owner's id is not included. */
  own: boolean;
};

export type ConnectionRecord = {
  id: string;
  requestId: string;
  productId: string;
  initiatedBy: "buyer" | "supplier";
  status: "requested" | "in_progress" | "shared" | "declined";
  message: string | null;
  sharedResultId: string | null;
};

export type ConnectionView = ConnectionRecord & {
  role: "buyer" | "supplier";
  requestTitle: string;
  buyerOrgName: string;
  partNumber: string;
  requirementSetKey: string;
  requestMessage: string | null;
  productName: string;
  supplierCompany: string;
  listed: boolean;
};

/** The one result stored on the connection. A later assessment is not included. */
export type SharedResult = {
  id: string;
  productId: string;
  requirementSetKey: string;
  requirementSetVersion: number;
  assessmentDate: string;
  complete: boolean;
  findings: Finding[];
  documents: { id: string; filename: string; sha256: string }[];
};

export type InboxNotice = {
  id: string;
  connectionId: string | null;
  type: "assessment_completed" | "request_received" | "report_shared";
  title: string;
  readAt: string | null;
  createdAt: string;
};

export type ProductConnectionSummary = {
  id: string;
  buyerOrgName: string;
  title: string;
  status: ConnectionRecord["status"];
  initiatedBy: ConnectionRecord["initiatedBy"];
};

export type ProductConnectionsView = {
  productName: string;
  listed: boolean;
  connections: ProductConnectionSummary[];
  openRequests: Pick<BoardRequest, "id" | "buyerOrgName" | "title" | "partNumber">[];
};

export type ShareTarget = {
  connectionId: string;
  buyerOrgName: string;
  requestTitle: string;
  status: ConnectionRecord["status"];
  sharedResultId: string | null;
};

export type CompletedResultOption = {
  id: string;
  assessmentDate: string;
};

type ConnectionTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new ConnectionRequestError(400, parsed.error.issues[0]?.message ?? "Invalid connection");
  }
  return parsed.data;
}

function storedProfile(value: unknown): StoredSupplierProfile {
  if (value && typeof value === "object" && Object.keys(value).length === 0) return {};
  const parsed = supplierProfileSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

function partNumberOf(fields: unknown): string | null {
  const parsed = productFieldsSchema.safeParse(fields ?? {});
  const value = parsed.success ? parsed.data.partNumber?.value.trim() : "";
  return value ? value : null;
}

/** A display name that cannot carry an account address. */
function visibleName(name: string, hiddenEmails: readonly string[]): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.includes("@")) return "";
  const lower = trimmed.toLowerCase();
  if (hiddenEmails.some((email) => email && lower.includes(email.toLowerCase()))) return "";
  return trimmed;
}

function supplierLabel(
  profile: unknown,
  productName: string,
  hiddenEmails: readonly string[],
): string {
  const stored = storedProfile(profile);
  const declared = "companyName" in stored ? stored.companyName : "";
  return (
    visibleName(declared, hiddenEmails) || visibleName(productName, hiddenEmails) || "A supplier"
  );
}

function buyerLabel(orgName: string, hiddenEmails: readonly string[]): string {
  return visibleName(orgName, hiddenEmails) || "A buyer";
}

function toRecord(row: typeof requestConnection.$inferSelect): ConnectionRecord {
  return {
    id: row.id,
    requestId: row.requestId,
    productId: row.productId,
    initiatedBy: initiatedBySchema.parse(row.initiatedBy),
    status: connectionStatusSchema.parse(row.status),
    message: row.message,
    sharedResultId: row.sharedResultId,
  };
}

/** Runs only after the transaction that inserted the notices has committed. */
async function publishNotices(noticeIds: readonly string[]): Promise<void> {
  if (noticeIds.length === 0) return;
  await deliverConnectionNotices(noticeIds);
}

async function insertNotice(
  tx: ConnectionTx,
  input: {
    connectionId: string;
    recipientUserId: string;
    recipientEmail: string;
    type: "request_received" | "report_shared";
    title: string;
  },
): Promise<string> {
  const id = crypto.randomUUID();
  await tx.insert(notification).values({
    id,
    connectionId: input.connectionId,
    recipientUserId: input.recipientUserId,
    recipientEmail: input.recipientEmail,
    type: input.type,
    title: input.title,
    status: "pending",
  });
  return id;
}

async function accountEmail(tx: ConnectionTx, userId: string): Promise<string> {
  const [row] = await tx
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!row) throw new ConnectionRequestError(404, "Not found");
  return row.email;
}

export async function createBuyerRequest(
  userId: string,
  input: z.infer<typeof createBuyerRequestInput>,
): Promise<BoardRequest> {
  const buyerUserId = idSchema.parse(userId);
  const parsed = parseInput(createBuyerRequestInput, input);
  if (!getRequirementSet(parsed.requirementSetKey, parsed.requirementSetVersion)) {
    throw new ConnectionRequestError(400, "Unknown requirement set");
  }

  const [row] = await db
    .insert(buyerRequest)
    .values({
      id: crypto.randomUUID(),
      buyerUserId,
      buyerOrgName: parsed.buyerOrgName,
      title: parsed.title,
      partNumber: parsed.partNumber,
      requirementSetKey: parsed.requirementSetKey,
      requirementSetVersion: parsed.requirementSetVersion,
      message: parsed.message || null,
      visibility: "open",
      status: "open",
    })
    .returning();
  if (!row) throw new ConnectionRequestError(400, "The request could not be saved");

  return {
    id: row.id,
    buyerOrgName: row.buyerOrgName,
    title: row.title,
    partNumber: row.partNumber,
    requirementSetKey: row.requirementSetKey,
    requirementSetVersion: row.requirementSetVersion,
    own: true,
  };
}

export async function listOpenBoard(userId: string): Promise<BoardRequest[]> {
  const viewerId = idSchema.parse(userId);
  const rows = await db
    .select({
      id: buyerRequest.id,
      buyerUserId: buyerRequest.buyerUserId,
      buyerOrgName: buyerRequest.buyerOrgName,
      title: buyerRequest.title,
      partNumber: buyerRequest.partNumber,
      requirementSetKey: buyerRequest.requirementSetKey,
      requirementSetVersion: buyerRequest.requirementSetVersion,
    })
    .from(buyerRequest)
    .where(and(eq(buyerRequest.visibility, "open"), eq(buyerRequest.status, "open")))
    .orderBy(desc(buyerRequest.createdAt));

  return rows.map((row) => ({
    id: row.id,
    buyerOrgName: row.buyerOrgName,
    title: row.title,
    partNumber: row.partNumber,
    requirementSetKey: row.requirementSetKey,
    requirementSetVersion: row.requirementSetVersion,
    own: row.buyerUserId === viewerId,
  }));
}

export async function setProductListed(
  userId: string,
  productId: string,
  listed: boolean,
): Promise<void> {
  const ownerId = idSchema.parse(userId);
  const id = idSchema.parse(productId);
  const next = z.boolean().parse(listed);
  const [row] = await db
    .update(product)
    .set({ listed: next })
    .where(and(eq(product.id, id), eq(product.userId, ownerId)))
    .returning({ id: product.id });
  if (!row) throw new ConnectionRequestError(404, "Product not found");
}

export async function listDirectory(userId: string): Promise<DirectoryListing[]> {
  const viewerId = idSchema.parse(userId);
  const rows = await db
    .select({
      id: product.id,
      userId: product.userId,
      name: product.name,
      fields: product.fields,
      profile: product.profile,
    })
    .from(product)
    .where(eq(product.listed, true))
    .orderBy(product.name);

  return rows.map((row) => ({
    productId: row.id,
    name: row.name,
    partNumber: partNumberOf(row.fields),
    profile: storedProfile(row.profile),
    own: row.userId === viewerId,
  }));
}

async function openBoardRequest(requestId: string) {
  const [row] = await db
    .select()
    .from(buyerRequest)
    .where(
      and(
        eq(buyerRequest.id, requestId),
        eq(buyerRequest.visibility, "open"),
        eq(buyerRequest.status, "open"),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function ownedProduct(userId: string, productId: string) {
  const [row] = await db
    .select()
    .from(product)
    .where(and(eq(product.id, productId), eq(product.userId, userId)))
    .limit(1);
  if (!row) throw new ConnectionRequestError(404, "Product not found");
  return row;
}

function rejectDuplicate(error: unknown): never {
  const name = constraintName(error);
  if (name === "request_connection_request_product_unique") {
    throw new ConnectionRequestError(409, "This product is already connected to that request");
  }
  throw error;
}

function constraintName(error: unknown): string | undefined {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const record = current as { constraint_name?: unknown; cause?: unknown };
    if (typeof record.constraint_name === "string") return record.constraint_name;
    current = record.cause;
  }
  return undefined;
}

export async function respondToRequest(
  userId: string,
  input: z.infer<typeof respondToRequestInput>,
): Promise<ConnectionRecord> {
  const supplierId = idSchema.parse(userId);
  const parsed = parseInput(respondToRequestInput, input);
  const request = await openBoardRequest(parsed.requestId);
  if (!request) throw new ConnectionRequestError(404, "Request not found");
  if (request.buyerUserId === supplierId) {
    throw new ConnectionRequestError(400, SELF_CONNECTION);
  }

  const linked = parsed.productId ? await ownedProduct(supplierId, parsed.productId) : null;
  let productId = linked?.id;
  if (!productId) {
    try {
      const created = await createProduct(supplierId, {
        name: parsed.newProductName ?? "",
        requirementSetKey: request.requirementSetKey,
        requirementSetVersion: request.requirementSetVersion,
      });
      productId = created.id;
    } catch (error) {
      if (error instanceof ProductRequestError) {
        throw new ConnectionRequestError(error.status, error.message);
      }
      throw error;
    }
  }

  try {
    const { value, noticeIds } = await db.transaction(async (tx) => {
      const connectionId = crypto.randomUUID();
      const [connection] = await tx
        .insert(requestConnection)
        .values({
          id: connectionId,
          requestId: request.id,
          productId,
          initiatedBy: "supplier",
          status: "in_progress",
          message: parsed.message || null,
        })
        .returning();
      if (!connection) throw new ConnectionRequestError(400, "The connection could not be saved");

      const buyerEmail = await accountEmail(tx, request.buyerUserId);
      const supplierEmail = await accountEmail(tx, supplierId);
      const [productRow] = await tx
        .select({ name: product.name, profile: product.profile })
        .from(product)
        .where(eq(product.id, productId))
        .limit(1);
      const title = `${supplierLabel(productRow?.profile, productRow?.name ?? "", [buyerEmail, supplierEmail])} responded to your request`;
      const noticeId = await insertNotice(tx, {
        connectionId,
        recipientUserId: request.buyerUserId,
        recipientEmail: buyerEmail,
        type: "request_received",
        title,
      });
      return { value: toRecord(connection), noticeIds: [noticeId] };
    });
    await publishNotices(noticeIds);
    return value;
  } catch (error) {
    if (error instanceof ConnectionRequestError) throw error;
    rejectDuplicate(error);
  }
}

export async function requestEvidence(
  userId: string,
  input: z.infer<typeof requestEvidenceInput>,
): Promise<ConnectionRecord> {
  const buyerId = idSchema.parse(userId);
  const parsed = parseInput(requestEvidenceInput, input);
  const [listing] = await db
    .select()
    .from(product)
    .where(eq(product.id, parsed.productId))
    .limit(1);
  if (!listing?.listed) throw new ConnectionRequestError(404, "Product not found");
  if (listing.userId === buyerId) throw new ConnectionRequestError(400, SELF_CONNECTION);

  const partNumber = partNumberOf(listing.fields) ?? "Not declared";
  try {
    const { value, noticeIds } = await db.transaction(async (tx) => {
      const buyerEmail = await accountEmail(tx, buyerId);
      const supplierEmail = await accountEmail(tx, listing.userId);
      const org = buyerLabel(parsed.buyerOrgName, [buyerEmail, supplierEmail]);
      const requestId = crypto.randomUUID();
      await tx.insert(buyerRequest).values({
        id: requestId,
        buyerUserId: buyerId,
        buyerOrgName: parsed.buyerOrgName,
        title: `Evidence for ${visibleName(listing.name, [buyerEmail, supplierEmail]) || "a listed product"}`,
        partNumber,
        requirementSetKey: listing.requirementSetKey,
        requirementSetVersion: listing.requirementSetVersion,
        message: parsed.message || null,
        visibility: "direct",
        status: "open",
      });

      const connectionId = crypto.randomUUID();
      const [connection] = await tx
        .insert(requestConnection)
        .values({
          id: connectionId,
          requestId,
          productId: listing.id,
          initiatedBy: "buyer",
          status: "requested",
          message: parsed.message || null,
        })
        .returning();
      if (!connection) throw new ConnectionRequestError(400, "The connection could not be saved");

      const noticeId = await insertNotice(tx, {
        connectionId,
        recipientUserId: listing.userId,
        recipientEmail: supplierEmail,
        type: "request_received",
        title: `${org} requested evidence`,
      });
      return { value: toRecord(connection), noticeIds: [noticeId] };
    });
    await publishNotices(noticeIds);
    return value;
  } catch (error) {
    if (error instanceof ConnectionRequestError) throw error;
    rejectDuplicate(error);
  }
}

export async function shareResult(
  userId: string,
  connectionId: string,
  resultId: string,
): Promise<ConnectionRecord> {
  const ownerId = idSchema.parse(userId);
  const connectionKey = idSchema.parse(connectionId);
  const resultKey = idSchema.parse(resultId);

  try {
    const { value, noticeIds } = await db.transaction(async (tx) => {
      const [found] = await tx
        .select({
          connection: requestConnection,
          buyerUserId: buyerRequest.buyerUserId,
          productName: product.name,
          profile: product.profile,
          ownerId: product.userId,
        })
        .from(requestConnection)
        .innerJoin(buyerRequest, eq(buyerRequest.id, requestConnection.requestId))
        .innerJoin(product, eq(product.id, requestConnection.productId))
        .where(and(eq(requestConnection.id, connectionKey), eq(product.userId, ownerId)))
        .limit(1);
      if (!found) throw new ConnectionRequestError(404, "Not found");
      if (found.buyerUserId === ownerId) throw new ConnectionRequestError(400, SELF_CONNECTION);

      const [result] = await tx
        .select({
          id: assessmentResult.id,
          productId: assessmentResult.productId,
          jobStatus: assessmentJob.status,
          jobResultId: assessmentJob.resultId,
        })
        .from(assessmentResult)
        .innerJoin(assessmentJob, eq(assessmentJob.id, assessmentResult.jobId))
        .where(eq(assessmentResult.id, resultKey))
        .limit(1);
      if (!result || result.productId !== found.connection.productId) {
        throw new ConnectionRequestError(404, "Not found");
      }
      if (result.jobStatus !== "COMPLETED" || result.jobResultId !== result.id) {
        throw new ConnectionRequestError(400, "Only a completed assessment can be shared");
      }

      const [updated] = await tx
        .update(requestConnection)
        .set({
          status: "shared",
          sharedResultId: result.id,
          updatedAt: new Date(),
        })
        .where(eq(requestConnection.id, found.connection.id))
        .returning();
      if (!updated) throw new ConnectionRequestError(404, "Not found");

      const buyerEmail = await accountEmail(tx, found.buyerUserId);
      const supplierEmail = await accountEmail(tx, ownerId);
      const title = `${supplierLabel(found.profile, found.productName, [buyerEmail, supplierEmail])} shared an evidence report`;
      const noticeId = await insertNotice(tx, {
        connectionId: updated.id,
        recipientUserId: found.buyerUserId,
        recipientEmail: buyerEmail,
        type: "report_shared",
        title,
      });
      return { value: toRecord(updated), noticeIds: [noticeId] };
    });
    await publishNotices(noticeIds);
    return value;
  } catch (error) {
    if (error instanceof ConnectionRequestError) throw error;
    throw error;
  }
}

export async function getConnectionView(
  userId: string,
  connectionId: string,
): Promise<ConnectionView | null> {
  const viewerId = idSchema.parse(userId);
  const id = idSchema.parse(connectionId);
  const [row] = await db
    .select({
      connection: requestConnection,
      buyerUserId: buyerRequest.buyerUserId,
      buyerOrgName: buyerRequest.buyerOrgName,
      requestTitle: buyerRequest.title,
      partNumber: buyerRequest.partNumber,
      requirementSetKey: buyerRequest.requirementSetKey,
      requestMessage: buyerRequest.message,
      productName: product.name,
      profile: product.profile,
      listed: product.listed,
      ownerId: product.userId,
      buyerEmail: user.email,
    })
    .from(requestConnection)
    .innerJoin(buyerRequest, eq(buyerRequest.id, requestConnection.requestId))
    .innerJoin(product, eq(product.id, requestConnection.productId))
    .innerJoin(user, eq(user.id, buyerRequest.buyerUserId))
    .where(
      and(
        eq(requestConnection.id, id),
        or(eq(buyerRequest.buyerUserId, viewerId), eq(product.userId, viewerId)),
      ),
    )
    .limit(1);
  if (!row) return null;

  const [supplier] = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, row.ownerId))
    .limit(1);

  return {
    ...toRecord(row.connection),
    role: row.buyerUserId === viewerId ? "buyer" : "supplier",
    requestTitle: row.requestTitle,
    buyerOrgName: row.buyerOrgName,
    partNumber: row.partNumber,
    requirementSetKey: row.requirementSetKey,
    requestMessage: row.requestMessage,
    productName: row.productName,
    listed: row.listed,
    supplierCompany: supplierLabel(row.profile, row.productName, [
      row.buyerEmail,
      supplier?.email ?? "",
    ]),
  };
}

export async function getConnection(
  userId: string,
  connectionId: string,
): Promise<ConnectionRecord | null> {
  const view = await getConnectionView(userId, connectionId);
  if (!view) return null;
  return {
    id: view.id,
    requestId: view.requestId,
    productId: view.productId,
    initiatedBy: view.initiatedBy,
    status: view.status,
    message: view.message,
    sharedResultId: view.sharedResultId,
  };
}

/** The page maps a 404 from this function to `notFound()`. */
export async function requireConnection(
  userId: string,
  connectionId: string,
): Promise<ConnectionView> {
  const view = await getConnectionView(userId, connectionId);
  if (!view) throw new ConnectionRequestError(404, "Not found");
  return view;
}

export async function getSharedResult(
  userId: string,
  connectionId: string,
): Promise<SharedResult | null> {
  const viewerId = idSchema.parse(userId);
  const id = idSchema.parse(connectionId);
  const [row] = await db
    .select({
      id: assessmentResult.id,
      productId: assessmentResult.productId,
      requirementSetKey: product.requirementSetKey,
      requirementSetVersion: product.requirementSetVersion,
      assessmentDate: assessmentResult.assessmentDate,
      complete: assessmentResult.complete,
      findings: assessmentResult.findings,
      documents: assessmentResult.documents,
    })
    .from(requestConnection)
    .innerJoin(buyerRequest, eq(buyerRequest.id, requestConnection.requestId))
    .innerJoin(product, eq(product.id, requestConnection.productId))
    .innerJoin(assessmentResult, eq(assessmentResult.id, requestConnection.sharedResultId))
    .where(
      and(
        eq(requestConnection.id, id),
        or(eq(buyerRequest.buyerUserId, viewerId), eq(product.userId, viewerId)),
      ),
    )
    .limit(1);
  if (!row) return null;

  return {
    id: row.id,
    productId: row.productId,
    requirementSetKey: row.requirementSetKey,
    requirementSetVersion: row.requirementSetVersion,
    assessmentDate: row.assessmentDate,
    complete: row.complete,
    findings: z.array(findingSchema).parse(row.findings),
    documents: z.array(assessedDocumentSchema).parse(row.documents),
  };
}

export async function listInbox(userId: string): Promise<InboxNotice[]> {
  const recipientId = idSchema.parse(userId);
  const rows = await db
    .select({
      id: notification.id,
      connectionId: notification.connectionId,
      type: notification.type,
      title: notification.title,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    })
    .from(notification)
    .where(eq(notification.recipientUserId, recipientId))
    .orderBy(desc(notification.createdAt));

  return rows.map((row) => ({
    id: row.id,
    connectionId: row.connectionId,
    type: noticeTypeSchema.parse(row.type),
    title: row.title,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function unreadCount(userId: string): Promise<number> {
  const recipientId = idSchema.parse(userId);
  const [row] = await db
    .select({ value: count() })
    .from(notification)
    .where(and(eq(notification.recipientUserId, recipientId), sql`${notification.readAt} is null`));
  return Number(row?.value ?? 0);
}

export async function markNoticeRead(userId: string, notificationId: string): Promise<void> {
  const recipientId = idSchema.parse(userId);
  const id = idSchema.parse(notificationId);
  const [existing] = await db
    .select({ id: notification.id, readAt: notification.readAt })
    .from(notification)
    .where(and(eq(notification.id, id), eq(notification.recipientUserId, recipientId)))
    .limit(1);
  if (!existing) throw new ConnectionRequestError(404, "Not found");
  if (existing.readAt) return;
  await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(and(eq(notification.id, id), eq(notification.recipientUserId, recipientId)));
}

export async function getProductConnections(
  userId: string,
  productId: string,
): Promise<ProductConnectionsView> {
  const ownerId = idSchema.parse(userId);
  const id = idSchema.parse(productId);
  const owned = await ownedProduct(ownerId, id);
  const connections = await db
    .select({
      id: requestConnection.id,
      buyerOrgName: buyerRequest.buyerOrgName,
      title: buyerRequest.title,
      status: requestConnection.status,
      initiatedBy: requestConnection.initiatedBy,
    })
    .from(requestConnection)
    .innerJoin(buyerRequest, eq(buyerRequest.id, requestConnection.requestId))
    .where(eq(requestConnection.productId, id))
    .orderBy(desc(requestConnection.createdAt));

  const openRequests = await db
    .select({
      id: buyerRequest.id,
      buyerOrgName: buyerRequest.buyerOrgName,
      title: buyerRequest.title,
      partNumber: buyerRequest.partNumber,
    })
    .from(buyerRequest)
    .where(
      and(
        eq(buyerRequest.visibility, "open"),
        eq(buyerRequest.status, "open"),
        sql`${buyerRequest.buyerUserId} <> ${ownerId}`,
      ),
    )
    .orderBy(desc(buyerRequest.createdAt));

  return {
    productName: owned.name,
    listed: owned.listed,
    connections: connections.map((row) => ({
      id: row.id,
      buyerOrgName: row.buyerOrgName,
      title: row.title,
      status: connectionStatusSchema.parse(row.status),
      initiatedBy: initiatedBySchema.parse(row.initiatedBy),
    })),
    openRequests,
  };
}

export async function listShareTargets(userId: string, resultId: string): Promise<ShareTarget[]> {
  const ownerId = idSchema.parse(userId);
  const id = idSchema.parse(resultId);
  const [result] = await db
    .select({
      productId: assessmentResult.productId,
      ownerId: product.userId,
      jobStatus: assessmentJob.status,
      jobResultId: assessmentJob.resultId,
    })
    .from(assessmentResult)
    .innerJoin(product, eq(product.id, assessmentResult.productId))
    .innerJoin(assessmentJob, eq(assessmentJob.id, assessmentResult.jobId))
    .where(eq(assessmentResult.id, id))
    .limit(1);
  if (!result || result.ownerId !== ownerId) throw new ConnectionRequestError(404, "Not found");
  if (result.jobStatus !== "COMPLETED" || result.jobResultId !== id) {
    throw new ConnectionRequestError(400, "Only a completed assessment can be shared");
  }

  const rows = await db
    .select({
      connectionId: requestConnection.id,
      buyerOrgName: buyerRequest.buyerOrgName,
      requestTitle: buyerRequest.title,
      status: requestConnection.status,
      sharedResultId: requestConnection.sharedResultId,
    })
    .from(requestConnection)
    .innerJoin(buyerRequest, eq(buyerRequest.id, requestConnection.requestId))
    .where(eq(requestConnection.productId, result.productId))
    .orderBy(desc(requestConnection.createdAt));

  return rows.map((row) => ({
    connectionId: row.connectionId,
    buyerOrgName: row.buyerOrgName,
    requestTitle: row.requestTitle,
    status: connectionStatusSchema.parse(row.status),
    sharedResultId: row.sharedResultId,
  }));
}

export async function listCompletedResults(
  userId: string,
  connectionId: string,
): Promise<CompletedResultOption[]> {
  const view = await requireConnection(userId, connectionId);
  if (view.role !== "supplier") throw new ConnectionRequestError(404, "Not found");
  return db
    .select({
      id: assessmentResult.id,
      assessmentDate: assessmentResult.assessmentDate,
    })
    .from(assessmentResult)
    .innerJoin(assessmentJob, eq(assessmentJob.id, assessmentResult.jobId))
    .where(
      and(eq(assessmentResult.productId, view.productId), eq(assessmentJob.status, "COMPLETED")),
    )
    .orderBy(desc(assessmentResult.createdAt));
}
