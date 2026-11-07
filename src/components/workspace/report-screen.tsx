import { ReportShare } from "@/components/connections/report-share";
import { Button } from "@/components/ui/button";

import type { WorkspaceProduct } from "./contract";
import { ReportView } from "./report-view";

export function ReportScreen({
  initial,
  readOnly = false,
}: {
  productId: string;
  initial: WorkspaceProduct | null;
  readOnly?: boolean;
}) {
  if (!initial) {
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
      <ReportView product={initial} readOnly={readOnly} />
      {readOnly || !initial.result ? null : <ReportShare resultId={initial.result.id} />}
    </div>
  );
}
