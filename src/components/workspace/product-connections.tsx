/**
 * Product-page slot for group 17 (`src/components/connections/product-connections.tsx`).
 * Swap the import on the product page when that file exists.
 */
export function ProductConnections({ productId }: { productId: string }) {
  return (
    <section className="space-y-2 rounded-lg border border-line bg-card p-4 shadow-card">
      <h2 className="text-lg font-semibold tracking-tight">Buyer requests</h2>
      <p className="text-sm text-muted" data-product-id={productId}>
        When a buyer asks for this product, the request is listed here. You upload evidence for that
        request and replace a file instead of deleting it.
      </p>
    </section>
  );
}
