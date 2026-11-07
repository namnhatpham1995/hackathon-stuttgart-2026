"use server";

import { cookies } from "next/headers";
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
import { requireSession } from "@/lib/session";

export async function setTheme(theme: "light" | "dark") {
  await requireSession();
  const jar = await cookies();
  jar.set("theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

export async function createProduct(
  input: unknown,
): Promise<{ ok: true; product: WorkspaceProduct } | { ok: false; errors: FieldErrors }> {
  await requireSession();
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

  return { ok: true, product };
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
