import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/client";
import { buyerRequest, product, requestConnection } from "@/db/schema";

import type { SupplierProfile } from "@/lib/assessment/types";

/** Buyer workspace queries. Every function takes the session's `userId` and returns only that
 * buyer's own requests and connections, plus listed products. Results never contain an email
 * address, a document or an unshared assessment result. */

export const catalogSearchInput = z.object({
  q: z.string().trim().max(100).optional(),
  productCategory: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
});
export type CatalogSearchInput = z.infer<typeof catalogSearchInput>;

export type BuyerConnectionStatus = "requested" | "in_progress" | "shared" | "declined";

export type BuyerOverview = {
  openRequests: number;
  connectedSuppliers: number;
  sharedReports: number;
};

export type BuyerRequestConnection = {
  connectionId: string;
  productId: string;
  productName: string;
  partNumber: string | null;
  /** From the supplier's declared profile; null before onboarding. */
  supplierCompany: string | null;
  initiatedBy: "buyer" | "supplier";
  status: BuyerConnectionStatus;
  /** Set only while the connection is `shared`; links to `/connections/[connectionId]`. */
  sharedResultId: string | null;
  updatedAt: Date;
};

export type BuyerRequestSummary = {
  requestId: string;
  buyerOrgName: string;
  title: string;
  partNumber: string;
  requirementSetKey: string;
  visibility: "open" | "direct";
  status: "open" | "closed";
  createdAt: Date;
  connections: BuyerRequestConnection[];
};

export type CatalogProduct = {
  productId: string;
  productName: string;
  partNumber: string | null;
  /** Declared by the supplier, never evidence. */
  profile: SupplierProfile | null;
  /** This buyer's existing connection to the product, if any. */
  myConnection: { connectionId: string; status: BuyerConnectionStatus } | null;
};

const requestVisibilitySchema = z.enum(["open", "direct"]);
const requestStatusSchema = z.enum(["open", "closed"]);
const initiatedBySchema = z.enum(["buyer", "supplier"]);
const connectionStatusSchema = z.enum(["requested", "in_progress", "shared", "declined"]);

function blankToNull(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function getBuyerOverview(userId: string): Promise<BuyerOverview> {
  const requests = await listMyRequests(userId);
  const products = new Set<string>();
  let sharedReports = 0;
  for (const request of requests) {
    for (const connection of request.connections) {
      products.add(connection.productId);
      if (connection.status === "shared") sharedReports += 1;
    }
  }
  return {
    openRequests: requests.filter((request) => request.status === "open").length,
    connectedSuppliers: products.size,
    sharedReports,
  };
}

/** The buyer's own requests, newest first, each with its connections. */
export async function listMyRequests(userId: string): Promise<BuyerRequestSummary[]> {
  const rows = await db
    .select({
      requestId: buyerRequest.id,
      buyerOrgName: buyerRequest.buyerOrgName,
      title: buyerRequest.title,
      partNumber: buyerRequest.partNumber,
      requirementSetKey: buyerRequest.requirementSetKey,
      visibility: buyerRequest.visibility,
      status: buyerRequest.status,
      createdAt: buyerRequest.createdAt,
      connectionId: requestConnection.id,
      productId: requestConnection.productId,
      productName: product.name,
      productPartNumber: sql<string | null>`${product.fields}->'partNumber'->>'value'`,
      supplierCompany: sql<string | null>`${product.profile}->>'companyName'`,
      initiatedBy: requestConnection.initiatedBy,
      connectionStatus: requestConnection.status,
      sharedResultId: requestConnection.sharedResultId,
      updatedAt: requestConnection.updatedAt,
    })
    .from(buyerRequest)
    .leftJoin(requestConnection, eq(requestConnection.requestId, buyerRequest.id))
    .leftJoin(product, eq(product.id, requestConnection.productId))
    .where(eq(buyerRequest.buyerUserId, userId))
    .orderBy(
      desc(buyerRequest.createdAt),
      desc(buyerRequest.id),
      desc(requestConnection.updatedAt),
      desc(requestConnection.id),
    );

  const summaries = new Map<string, BuyerRequestSummary>();
  for (const row of rows) {
    let summary = summaries.get(row.requestId);
    if (!summary) {
      summary = {
        requestId: row.requestId,
        buyerOrgName: row.buyerOrgName,
        title: row.title,
        partNumber: row.partNumber,
        requirementSetKey: row.requirementSetKey,
        visibility: requestVisibilitySchema.parse(row.visibility),
        status: requestStatusSchema.parse(row.status),
        createdAt: row.createdAt,
        connections: [],
      };
      summaries.set(row.requestId, summary);
    }
    if (
      row.connectionId === null ||
      row.productId === null ||
      row.productName === null ||
      row.initiatedBy === null ||
      row.connectionStatus === null ||
      row.updatedAt === null
    ) {
      continue;
    }
    const status = connectionStatusSchema.parse(row.connectionStatus);
    summary.connections.push({
      connectionId: row.connectionId,
      productId: row.productId,
      productName: row.productName,
      partNumber: blankToNull(row.productPartNumber),
      supplierCompany: blankToNull(row.supplierCompany),
      initiatedBy: initiatedBySchema.parse(row.initiatedBy),
      status,
      sharedResultId: status === "shared" ? row.sharedResultId : null,
      updatedAt: row.updatedAt,
    });
  }
  return [...summaries.values()];
}

/** Listed products of other users, filtered by text (name, part number, company), category and country. */
export async function searchCatalog(
  userId: string,
  input: CatalogSearchInput,
): Promise<CatalogProduct[]> {
  void userId;
  void input;
  throw new Error("not implemented: searchCatalog");
}

/** One listed product; null when it is unlisted, unknown or the caller's own. */
export async function getCatalogProduct(
  userId: string,
  productId: string,
): Promise<CatalogProduct | null> {
  void userId;
  void productId;
  throw new Error("not implemented: getCatalogProduct");
}

/** Closes the caller's own open request; false when it is not theirs or already closed. */
export async function closeMyRequest(userId: string, requestId: string): Promise<boolean> {
  void userId;
  void requestId;
  throw new Error("not implemented: closeMyRequest");
}
