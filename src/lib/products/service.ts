import { z } from "zod";

import {
  type ProductFields,
  productFieldsSchema,
  type StoredSupplierProfile,
  supplierProfileSchema,
} from "@/lib/assessment/types";

export const createProductInput = z.object({
  name: z.string().min(1),
  requirementSetKey: z.string().min(1),
  requirementSetVersion: z.number().int().positive(),
});

export const updateProductInput = z.object({
  name: z.string().min(1).optional(),
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

export async function createProduct(
  userId: string,
  input: z.infer<typeof createProductInput>,
): Promise<ProductRecord> {
  void userId;
  void input;
  throw new Error("not implemented: createProduct");
}

export async function getProduct(userId: string, productId: string): Promise<ProductRecord | null> {
  void userId;
  void productId;
  throw new Error("not implemented: getProduct");
}

export async function listProducts(userId: string): Promise<ProductRecord[]> {
  void userId;
  throw new Error("not implemented: listProducts");
}

export async function updateProduct(
  userId: string,
  productId: string,
  input: z.infer<typeof updateProductInput>,
): Promise<ProductRecord> {
  void userId;
  void productId;
  void input;
  throw new Error("not implemented: updateProduct");
}
