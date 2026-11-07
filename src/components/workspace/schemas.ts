import { z } from "zod";

function requiredText(label: string, max: number) {
  return z
    .string()
    .trim()
    .min(1, `Enter the ${label}.`)
    .max(max, `Use ${max} characters or fewer.`);
}

export const profileSchema = z.object({
  companyName: requiredText("company name", 120),
  country: requiredText("country", 80),
  productCategory: requiredText("product category", 120),
  capabilities: requiredText("capabilities", 400),
  targetMarket: requiredText("target market", 200),
});

export const draftSchema = z.object({
  name: requiredText("product name", 160),
  supplierName: requiredText("supplier name", 160),
  partNumber: requiredText("part number", 80),
  revision: requiredText("revision", 40),
  material: requiredText("material", 120),
  packaging: requiredText("packaging", 80),
});

export const createProductSchema = profileSchema.extend(draftSchema.shape);

export type FieldErrors = Record<string, string>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const flat = z.flattenError(error);
  const errors: FieldErrors = {};
  for (const [key, messages] of Object.entries(flat.fieldErrors)) {
    const message = Array.isArray(messages) ? messages[0] : undefined;
    if (typeof message === "string") errors[key] = message;
  }
  return errors;
}

export function focusFirstInvalid(errors: FieldErrors, order: readonly string[]) {
  const name = order.find((key) => errors[key]);
  if (!name) return;
  document.querySelector<HTMLElement>(`[name="${name}"]`)?.focus();
}
