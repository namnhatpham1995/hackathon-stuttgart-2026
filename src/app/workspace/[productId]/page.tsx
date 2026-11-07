import { fixtureById } from "@/components/workspace/fixtures";
import { ProductWorkspace } from "@/components/workspace/product-workspace";
import { requireSession } from "@/lib/session";

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ replace?: string }>;
}) {
  await requireSession();
  const { productId } = await params;
  const { replace } = await searchParams;

  return (
    <ProductWorkspace
      productId={productId}
      initial={fixtureById(productId)}
      replaceDocumentId={replace}
    />
  );
}
