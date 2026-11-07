"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  ConnectionRequestError,
  createBuyerRequest,
  createBuyerRequestInput,
  getProductConnections,
  listCompletedResults,
  listShareTargets,
  markNoticeRead,
  requestEvidence,
  requestEvidenceInput,
  respondToRequest,
  respondToRequestInput,
  setProductListed,
  shareResult,
  unreadCount,
} from "@/lib/connections/service";
import { requireSession } from "@/lib/session";

export type ActionState = { error: string } | null;

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function optionalField(formData: FormData, name: string): string | undefined {
  const value = field(formData, name).trim();
  return value ? value : undefined;
}

function rejected(error: unknown): ActionState {
  if (error instanceof ConnectionRequestError) return { error: error.message };
  throw error;
}

function zodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

export async function createRequestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const parsed = createBuyerRequestInput.safeParse({
    buyerOrgName: field(formData, "buyerOrgName"),
    title: field(formData, "title"),
    partNumber: field(formData, "partNumber"),
    requirementSetKey: field(formData, "requirementSetKey"),
    requirementSetVersion: Number(field(formData, "requirementSetVersion")),
    message: optionalField(formData, "message"),
  });
  if (!parsed.success) return { error: zodMessage(parsed.error) };

  try {
    await createBuyerRequest(session.user.id, parsed.data);
  } catch (error) {
    return rejected(error);
  }
  revalidatePath("/connections", "layout");
  redirect("/connections/requests");
}

export async function respondAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const parsed = respondToRequestInput.safeParse({
    requestId: field(formData, "requestId"),
    productId: optionalField(formData, "productId"),
    newProductName: optionalField(formData, "newProductName"),
    message: optionalField(formData, "message"),
  });
  if (!parsed.success) return { error: zodMessage(parsed.error) };

  let connectionId = "";
  try {
    const connection = await respondToRequest(session.user.id, parsed.data);
    connectionId = connection.id;
  } catch (error) {
    return rejected(error);
  }
  revalidatePath("/connections", "layout");
  redirect(`/connections/${connectionId}`);
}

export async function requestEvidenceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const parsed = requestEvidenceInput.safeParse({
    productId: field(formData, "productId"),
    buyerOrgName: field(formData, "buyerOrgName"),
    message: optionalField(formData, "message"),
  });
  if (!parsed.success) return { error: zodMessage(parsed.error) };

  let connectionId = "";
  try {
    const connection = await requestEvidence(session.user.id, parsed.data);
    connectionId = connection.id;
  } catch (error) {
    return rejected(error);
  }
  revalidatePath("/connections", "layout");
  redirect(`/connections/${connectionId}`);
}

export async function setListedAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const parsed = z
    .object({
      productId: z.string().trim().min(1),
      listed: z.enum(["true", "false"]),
    })
    .safeParse({
      productId: field(formData, "productId"),
      listed: field(formData, "listed"),
    });
  if (!parsed.success) return { error: zodMessage(parsed.error) };

  try {
    await setProductListed(session.user.id, parsed.data.productId, parsed.data.listed === "true");
  } catch (error) {
    return rejected(error);
  }
  revalidatePath("/connections", "layout");
  revalidatePath("/workspace", "layout");
  return null;
}

export async function shareAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const parsed = z
    .object({
      connectionId: z.string().trim().min(1),
      resultId: z.string().trim().min(1),
    })
    .safeParse({
      connectionId: field(formData, "connectionId"),
      resultId: field(formData, "resultId"),
    });
  if (!parsed.success) return { error: zodMessage(parsed.error) };

  try {
    await shareResult(session.user.id, parsed.data.connectionId, parsed.data.resultId);
  } catch (error) {
    return rejected(error);
  }
  revalidatePath("/connections", "layout");
  redirect(`/connections/${parsed.data.connectionId}`);
}

export async function markReadAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const parsed = z.string().trim().min(1).safeParse(field(formData, "notificationId"));
  if (!parsed.success) return { error: "That notice could not be found." };
  try {
    await markNoticeRead(session.user.id, parsed.data);
  } catch (error) {
    return rejected(error);
  }
  revalidatePath("/connections", "layout");
  return null;
}

export async function loadUnreadCount(): Promise<number> {
  const session = await requireSession();
  return unreadCount(session.user.id);
}

export async function loadProductConnections(productId: string) {
  const session = await requireSession();
  const parsed = z.string().trim().min(1).safeParse(productId);
  if (!parsed.success) return { error: "Product not found" } as const;
  try {
    return { data: await getProductConnections(session.user.id, parsed.data) } as const;
  } catch (error) {
    if (error instanceof ConnectionRequestError) return { error: error.message } as const;
    throw error;
  }
}

export async function loadShareTargets(resultId: string) {
  const session = await requireSession();
  const parsed = z.string().trim().min(1).safeParse(resultId);
  if (!parsed.success) return { error: "Result not found" } as const;
  try {
    return { data: await listShareTargets(session.user.id, parsed.data) } as const;
  } catch (error) {
    if (error instanceof ConnectionRequestError) return { error: error.message } as const;
    throw error;
  }
}

export async function loadCompletedResults(connectionId: string) {
  const session = await requireSession();
  const parsed = z.string().trim().min(1).safeParse(connectionId);
  if (!parsed.success) return { error: "Not found" } as const;
  try {
    return { data: await listCompletedResults(session.user.id, parsed.data) } as const;
  } catch (error) {
    if (error instanceof ConnectionRequestError) return { error: error.message } as const;
    throw error;
  }
}
