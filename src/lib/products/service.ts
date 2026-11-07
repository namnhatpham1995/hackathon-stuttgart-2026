import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { product } from "@/db/schema";
import { getRequirementSet } from "@/lib/assessment/requirement-sets";
import {
  type ProductFields,
  productFieldsSchema,
  type StoredSupplierProfile,
  supplierProfileSchema,
} from "@/lib/assessment/types";

export const createProductInput = z.object({
  name: z.string().trim().min(1),
  requirementSetKey: z.string().min(1),
  requirementSetVersion: z.number().int().positive(),
  fields: productFieldsSchema.optional(),
  profile: supplierProfileSchema.optional(),
});

export const updateProductInput = z.object({
  name: z.string().trim().min(1).optional(),
  fields: productFieldsSchema.optional(),
  profile: supplierProfileSchema.optional(),
});

export type ProductRecord = {
  id: string;
  userId: string;
  requirementSetKey: string;
  requirementSetVersion: number;
  name: string;
  fields: ProductFields;
  profile: StoredSupplierProfile;
  listed: boolean;
};

/** A rejected product write. Routes map `status` and return `message` as `{ error }`. */
export class ProductRequestError extends Error {
  readonly status: 400 | 404;

  constructor(status: 400 | 404, message: string) {
    super(message);
    this.name = "ProductRequestError";
    this.status = status;
  }
}

function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new ProductRequestError(400, parsed.error.issues[0]?.message ?? "Invalid product");
  }
  return parsed.data;
}

function storedProfile(value: unknown): StoredSupplierProfile {
  if (value && typeof value === "object" && Object.keys(value).length === 0) return {};
  return supplierProfileSchema.parse(value);
}

function toProduct(row: typeof product.$inferSelect): ProductRecord {
  return {
    id: row.id,
    userId: row.userId,
    requirementSetKey: row.requirementSetKey,
    requirementSetVersion: row.requirementSetVersion,
    name: row.name,
    fields: productFieldsSchema.parse(row.fields ?? {}),
    profile: storedProfile(row.profile ?? {}),
    listed: row.listed,
  };
}

export async function createProduct(userId: string, input: unknown): Promise<ProductRecord> {
  const parsed = parseInput(createProductInput, input);
  if (!getRequirementSet(parsed.requirementSetKey, parsed.requirementSetVersion)) {
    throw new ProductRequestError(400, "Unknown requirement set");
  }
  const [row] = await db
    .insert(product)
    .values({
      id: crypto.randomUUID(),
      userId,
      requirementSetKey: parsed.requirementSetKey,
      requirementSetVersion: parsed.requirementSetVersion,
      name: parsed.name,
      fields: parsed.fields,
      profile: parsed.profile,
    })
    .returning();
  if (!row) throw new ProductRequestError(400, "The product could not be saved");
  return toProduct(row);
}

export async function getProduct(userId: string, productId: string): Promise<ProductRecord | null> {
  const [row] = await db
    .select()
    .from(product)
    .where(and(eq(product.id, productId), eq(product.userId, userId)))
    .limit(1);
  return row ? toProduct(row) : null;
}

export async function listProducts(userId: string): Promise<ProductRecord[]> {
  const rows = await db
    .select()
    .from(product)
    .where(eq(product.userId, userId))
    .orderBy(desc(product.createdAt));
  return rows.map(toProduct);
}

export async function updateProduct(
  userId: string,
  productId: string,
  input: unknown,
): Promise<ProductRecord> {
  const parsed = parseInput(updateProductInput, input);
  const existing = await getProduct(userId, productId);
  if (!existing) throw new ProductRequestError(404, "Product not found");

  const [row] = await db
    .update(product)
    .set({
      name: parsed.name ?? existing.name,
      fields: parsed.fields ? { ...existing.fields, ...parsed.fields } : existing.fields,
      profile: parsed.profile ?? existing.profile,
    })
    .where(and(eq(product.id, productId), eq(product.userId, userId)))
    .returning();
  if (!row) throw new ProductRequestError(404, "Product not found");
  return toProduct(row);
}
