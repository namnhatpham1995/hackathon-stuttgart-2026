"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isServiceStub } from "@/components/buyer/load";
import { fieldErrors } from "@/components/workspace/schemas";
import { closeMyRequest } from "@/lib/buyer/service";
import { requestEvidence } from "@/lib/connections/service";
import { requireSession } from "@/lib/session";

const evidenceSchema = z.object({
  productId: z.string().trim().min(1).max(200),
  buyerOrgName: z
    .string()
    .trim()
    .min(1, "Enter the organisation.")
    .max(300, "Use 300 characters or fewer."),
  message: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(1000, "Use 1000 characters or fewer.").optional(),
  ),
});

export type EvidenceResult =
  | { ok: true; connectionId: string }
  | { ok: false; errors: Record<string, string>; error?: string };

export async function requestProductEvidence(input: unknown): Promise<EvidenceResult> {
  const session = await requireSession();
  const parsed = evidenceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  try {
    const connection = await requestEvidence(session.user.id, {
      productId: parsed.data.productId,
      buyerOrgName: parsed.data.buyerOrgName,
      message: parsed.data.message,
    });
    revalidatePath("/buyer");
    revalidatePath(`/buyer/products/${parsed.data.productId}`);
    return { ok: true, connectionId: connection.id };
  } catch (error) {
    if (isServiceStub(error)) {
      return {
        ok: false,
        errors: {},
        error: "Evidence requests open once buyer-supplier connections are connected.",
      };
    }
    if (error instanceof Error && error.name === "ConnectionRequestError") {
      return { ok: false, errors: {}, error: error.message };
    }
    throw error;
  }
}

const requestIdSchema = z.string().trim().min(1).max(200);

export async function closeRequest(
  requestId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireSession();
  const parsed = requestIdSchema.safeParse(requestId);
  if (!parsed.success) return { ok: false, error: "That request reference is not valid." };

  try {
    const closed = await closeMyRequest(session.user.id, parsed.data);
    if (!closed) {
      return { ok: false, error: "This request is already closed, or it is not yours." };
    }
    revalidatePath("/buyer");
    return { ok: true };
  } catch (error) {
    if (isServiceStub(error)) {
      return {
        ok: false,
        error: "Closing a request needs the buyer service, which is not connected yet.",
      };
    }
    throw error;
  }
}
