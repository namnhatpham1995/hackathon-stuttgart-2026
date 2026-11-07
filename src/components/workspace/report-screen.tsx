"use client";

import { useEffect, useState } from "react";

import type { WorkspaceProduct } from "./contract";
import { ReportShare } from "./report-share";
import { ReportView } from "./report-view";
import { readProduct } from "./store";

export function ReportScreen({
  productId,
  initial,
  readOnly = false,
}: {
  productId: string;
  initial: WorkspaceProduct | null;
  readOnly?: boolean;
}) {
  const [product, setProduct] = useState<WorkspaceProduct | null>(initial);
  const [ready, setReady] = useState(Boolean(initial));

  useEffect(() => {
    const saved = readProduct(productId);
    if (saved?.result) setProduct(saved);
    else if (!initial) setProduct(saved);
    setReady(true);
  }, [initial, productId]);

  if (!ready) {
    return (
      <p className="text-sm text-muted" role="status">
        Loading the report…
      </p>
    );
  }

  if (!product) {
    return (
      <section className="max-w-xl space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Evidence report</h1>
        <p className="text-muted">
          No report is stored for this product. Open the product, add documents, and choose Upload
          and assess.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <ReportView product={product} readOnly={readOnly} />
      {readOnly || !product.result ? null : <ReportShare resultId={product.result.id} />}
    </div>
  );
}
