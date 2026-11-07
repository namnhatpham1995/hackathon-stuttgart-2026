import { ProductWorkspace } from "@/components/workspace/product-workspace";
import { loadWorkspaceProduct } from "@/lib/products/workspace";
import { requireSession } from "@/lib/session";

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ replace?: string }>;
}) {
  const session = await requireSession();
  const { productId } = await params;
  const { replace } = await searchParams;
  const stored = await loadWorkspaceProduct(session.user.id, productId);

  return <ProductWorkspace productId={productId} initial={stored} replaceDocumentId={replace} />;
}
