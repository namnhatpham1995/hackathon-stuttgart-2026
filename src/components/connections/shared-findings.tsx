import { evidenceTypeLabels } from "@/lib/assessment/types";
import { findingStatusLabel } from "@/lib/connections/labels";
import type { SharedResult } from "@/lib/connections/service";

/** Read-only findings from the stored result. Filenames are text, never download links. */
export function SharedFindings({ result }: { result: SharedResult }) {
  return (
    <section className="min-w-0 space-y-4" aria-label="Shared evidence report">
      {result.complete ? null : (
        <p className="rounded-md border border-line p-3 text-sm" role="status">
          Processing was incomplete, so some findings may be missing.
        </p>
      )}
      <p className="text-sm text-muted">
        This is shared evidence for one buyer, not a certification. There is no score.
      </p>
      {result.findings.length === 0 ? (
        <p>This result has no findings.</p>
      ) : (
        <ol className="space-y-4">
          {result.findings.map((finding) => (
            <li key={finding.requirementId} className="min-w-0 rounded-xl border border-line p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-medium">{finding.requirementId}</h3>
                <p className="text-sm">{findingStatusLabel[finding.status]}</p>
              </div>
              <p className="text-sm text-muted">{evidenceTypeLabels[finding.evidenceType]}</p>
              <p className="mt-2 [overflow-wrap:anywhere]">{finding.reason}</p>
              <p className="mt-2 text-sm [overflow-wrap:anywhere]">
                <span className="text-muted">Next action: </span>
                {finding.nextAction}
              </p>
              {finding.citations.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {finding.citations.map((citation) => (
                    <li key={`${citation.documentId}-${citation.page}-${citation.quote}`}>
                      <blockquote className="border-l-2 border-line pl-3 text-sm [overflow-wrap:anywhere]">
                        <p>{citation.quote}</p>
                        <p className="text-muted">
                          {citation.filename}, page {citation.page}
                        </p>
                      </blockquote>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
