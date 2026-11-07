import { z } from "zod";

import type { StoredSupplierProfile } from "@/lib/assessment/types";

const optionalMessage = z.string().max(1000).optional();

export const createBuyerRequestInput = z.object({
  buyerOrgName: z.string().min(1),
  title: z.string().min(1),
  partNumber: z.string().min(1),
  requirementSetKey: z.string().min(1),
  requirementSetVersion: z.number().int().positive(),
  message: optionalMessage,
});

export const respondToRequestInput = z
  .object({
    requestId: z.string().min(1),
    productId: z.string().min(1).optional(),
    newProductName: z.string().min(1).optional(),
    message: optionalMessage,
  })
  .refine((input) => Boolean(input.productId) !== Boolean(input.newProductName), {
    message: "Respond with an existing product or a new product name, not both",
  });

export const requestEvidenceInput = z.object({
  productId: z.string().min(1),
  buyerOrgName: z.string().min(1),
  message: optionalMessage,
});

export type BoardRequest = {
  id: string;
  buyerOrgName: string;
  title: string;
  partNumber: string;
  requirementSetKey: string;
  requirementSetVersion: number;
};

export type DirectoryListing = {
  productId: string;
  name: string;
  partNumber: string | null;
  profile: StoredSupplierProfile;
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

export type InboxNotice = {
  id: string;
  type: "assessment_completed" | "request_received" | "report_shared";
  title: string;
  readAt: string | null;
  createdAt: string;
};

export async function createBuyerRequest(
  userId: string,
  input: z.infer<typeof createBuyerRequestInput>,
): Promise<BoardRequest> {
  void userId;
  void input;
  throw new Error("not implemented: createBuyerRequest");
}

export async function listOpenBoard(userId: string): Promise<BoardRequest[]> {
  void userId;
  throw new Error("not implemented: listOpenBoard");
}

export async function setProductListed(
  userId: string,
  productId: string,
  listed: boolean,
): Promise<void> {
  void userId;
  void productId;
  void listed;
  throw new Error("not implemented: setProductListed");
}

export async function listDirectory(userId: string): Promise<DirectoryListing[]> {
  void userId;
  throw new Error("not implemented: listDirectory");
}

export async function respondToRequest(
  userId: string,
  input: z.infer<typeof respondToRequestInput>,
): Promise<ConnectionRecord> {
  void userId;
  void input;
  throw new Error("not implemented: respondToRequest");
}

export async function requestEvidence(
  userId: string,
  input: z.infer<typeof requestEvidenceInput>,
): Promise<ConnectionRecord> {
  void userId;
  void input;
  throw new Error("not implemented: requestEvidence");
}

export async function shareResult(
  userId: string,
  connectionId: string,
  resultId: string,
): Promise<ConnectionRecord> {
  void userId;
  void connectionId;
  void resultId;
  throw new Error("not implemented: shareResult");
}

export async function getConnection(
  userId: string,
  connectionId: string,
): Promise<ConnectionRecord | null> {
  void userId;
  void connectionId;
  throw new Error("not implemented: getConnection");
}

export async function listInbox(userId: string): Promise<InboxNotice[]> {
  void userId;
  throw new Error("not implemented: listInbox");
}

export async function markNoticeRead(userId: string, notificationId: string): Promise<void> {
  void userId;
  void notificationId;
  throw new Error("not implemented: markNoticeRead");
}
