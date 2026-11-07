"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { WorkspaceProduct } from "./contract";
import { ReportShare } from "@/components/connections/report-share";
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
    if (readOnly) {
      setProduct(initial);
      setReady(true);
      return;
    }
    const saved = readProduct(productId);
    setProduct(saved?.result ? saved : (initial ?? saved));
    setReady(true);
  }, [initial, productId, readOnly]);

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
        <h1 className="page-title">Evidence report</h1>
        <p className="text-muted">
          {readOnly
            ? "There is no shared report to display for this product."
            : "No report is stored for this product. Return to your products and add the requested documents."}
        </p>
        {readOnly ? null : (
          <Button href="/workspace" variant="secondary">
            Back to products
          </Button>
        )}
      </section>
    );
  }

  return (
    <div className="workspace-content space-y-8">
      <ReportView product={product} readOnly={readOnly} />
      {readOnly || !product.result ? null : <ReportShare resultId={product.result.id} />}
    </div>
  );
}
