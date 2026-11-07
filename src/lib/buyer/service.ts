import { z } from "zod";

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

export async function getBuyerOverview(userId: string): Promise<BuyerOverview> {
  void userId;
  throw new Error("not implemented: getBuyerOverview");
}

/** The buyer's own requests, newest first, each with its connections. */
export async function listMyRequests(userId: string): Promise<BuyerRequestSummary[]> {
  void userId;
  throw new Error("not implemented: listMyRequests");
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
