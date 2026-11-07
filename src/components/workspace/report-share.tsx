/**
 * Report slot for group 17 (`src/components/connections/report-share.tsx`).
 * Swap the import on the report page when that file exists.
 */
export function ReportShare({ resultId }: { resultId: string }) {
  return (
    <section className="space-y-2 rounded-md border border-line bg-card p-4">
      <h2 className="section-title">Share with a buyer</h2>
      <p className="text-sm text-muted" data-result-id={resultId}>
        Sharing this result with one signed-in buyer is not connected yet. Copy the document request
        if you need to send the open items yourself.
      </p>
    </section>
  );
}
