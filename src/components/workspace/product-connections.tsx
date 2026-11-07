/**
 * Product-page slot for group 17 (`src/components/connections/product-connections.tsx`).
 * Swap the import on the product page when that file exists.
 */
export function ProductConnections({ productId }: { productId: string }) {
  return (
    <section className="space-y-2 border-t border-line pt-3">
      <h2 className="text-sm font-semibold">Buyer requests</h2>
      <p className="text-sm text-muted" data-product-id={productId}>
        When a buyer asks for this product, the request is listed here. You upload evidence for that
        request and replace a file instead of deleting it.
      </p>
    </section>
  );
}
