import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { loadCatalogProduct } from "@/components/buyer/load";
import { ProductDetail } from "@/components/buyer/product-detail";
import { requireSession } from "@/lib/session";

const productIdSchema = z.string().trim().min(1).max(200);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ productId: string }>;
}): Promise<Metadata> {
  const { productId } = await params;
  return { title: productIdSchema.safeParse(productId).success ? "Product" : "Product not found" };
}

export default async function CatalogProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const session = await requireSession();
  const { productId } = await params;
  const parsed = productIdSchema.safeParse(productId);
  if (!parsed.success) notFound();

  const { product, example } = await loadCatalogProduct(session.user.id, parsed.data);
  if (!product) notFound();

  return <ProductDetail product={product} example={example} />;
}
