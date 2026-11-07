"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import {
  DEMO_REQUIREMENT_SET_KEY,
  DEMO_REQUIREMENT_SET_VERSION,
  type WorkspaceProduct,
} from "@/components/workspace/contract";
import {
  createProductSchema,
  draftSchema,
  type FieldErrors,
  fieldErrors,
} from "@/components/workspace/schemas";
import { discardPendingDocument, finaliseDocuments } from "@/lib/documents/service";
import { createProduct as persistProduct } from "@/lib/products/service";
import { applyProductDraft, loadWorkspaceProduct } from "@/lib/products/workspace";
import { requireSession } from "@/lib/session";

export async function setTheme(theme: "light" | "dark") {
  await requireSession();
  const jar = await cookies();
  jar.set("theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

export async function createProduct(
  input: unknown,
): Promise<{ ok: true; product: WorkspaceProduct } | { ok: false; errors: FieldErrors }> {
  const session = await requireSession();
  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const capabilities = parsed.data.capabilities
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const product: WorkspaceProduct = {
    id: crypto.randomUUID(),
    name: parsed.data.name,
    requirementSetKey: DEMO_REQUIREMENT_SET_KEY,
    requirementSetVersion: DEMO_REQUIREMENT_SET_VERSION,
    fields: {
      supplierName: { value: parsed.data.supplierName, origin: "user" },
      partNumber: { value: parsed.data.partNumber, origin: "user" },
      revision: { value: parsed.data.revision, origin: "user" },
      material: { value: parsed.data.material, origin: "user" },
      packaging: { value: parsed.data.packaging, origin: "user" },
    },
    profile: {
      companyName: parsed.data.companyName,
      country: parsed.data.country,
      productCategory: parsed.data.productCategory,
      capabilities,
      targetMarket: parsed.data.targetMarket,
    },
    documents: [],
    result: null,
  };

  const stored = await persistProduct(session.user.id, product);
  return { ok: true, product: { ...product, id: stored.id, stored: true } };
}

export async function validateDraft(
  input: unknown,
): Promise<
  { ok: true; values: ReturnType<typeof draftSchema.parse> } | { ok: false; errors: FieldErrors }
> {
  await requireSession();
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  return { ok: true, values: parsed.data };
}

export async function readWorkspace(productId: string) {
  const session = await requireSession();
  return loadWorkspaceProduct(session.user.id, z.string().min(1).max(200).parse(productId));
}

export async function saveWorkspaceDraft(productId: string, input: unknown) {
  const session = await requireSession();
  return applyProductDraft(session.user.id, productId, input);
}

export async function finaliseWorkspaceDocuments(productId: string) {
  const session = await requireSession();
  return finaliseDocuments(session.user.id, z.string().min(1).max(200).parse(productId));
}

export async function undoWorkspaceUpload(productId: string, documentId: string) {
  const session = await requireSession();
  await discardPendingDocument(
    session.user.id,
    z.string().min(1).max(200).parse(productId),
    z.string().min(1).max(200).parse(documentId),
  );
}
