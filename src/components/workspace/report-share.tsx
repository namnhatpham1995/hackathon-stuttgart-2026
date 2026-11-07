/**
 * Report slot for group 17 (`src/components/connections/report-share.tsx`).
 * Swap the import on the report page when that file exists.
 */
export function ReportShare({ resultId }: { resultId: string }) {
  return (
    <section className="max-w-3xl space-y-2 rounded-lg border border-line bg-card p-4 shadow-card">
      <h2 className="text-lg font-semibold tracking-tight">Share with a buyer</h2>
      <p className="text-sm text-muted" data-result-id={resultId}>
        Sharing this result with one signed-in buyer is not connected yet. Copy the document request
        if you need to send the open items yourself.
      </p>
    </section>
  );
}
