import { actionPlan, dimensionSummary } from "@/components/workspace/report-summary";
import { getRequirementSet } from "@/lib/assessment/requirement-sets";
import { evidenceTypeLabels } from "@/lib/assessment/types";
import { findingStatusLabel } from "@/lib/connections/labels";
import type { SharedResult } from "@/lib/connections/service";

/** Read-only findings from the stored result. Filenames are text, never download links. */
export function SharedFindings({ result }: { result: SharedResult }) {
  const requirements = (
    getRequirementSet(result.requirementSetKey, result.requirementSetVersion)?.requirements ?? []
  ).map((requirement) => ({
    id: requirement.id,
    title: requirement.name ?? requirement.id,
    dimension: requirement.dimension,
    kind: requirement.kind,
  }));
  // The summary helpers read only the id, status and next action of each finding.
  const summaryFindings = result.findings.map((finding) => ({
    requirementId: finding.requirementId,
    status: finding.status,
    evidenceType: null,
    observed: null,
    evidence: [],
    reason: finding.reason,
    nextAction: finding.nextAction,
    authenticityChecked: false as const,
  }));
  const dimensions = dimensionSummary(summaryFindings, requirements);
  const plan = actionPlan(summaryFindings);
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
      {requirements.length > 0 ? (
        <section className="min-w-0 space-y-2" aria-label="Readiness by dimension">
          <h2 className="text-sm font-semibold">Readiness by dimension</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {dimensions.map((item) => (
              <li key={item.dimension} className="rounded-md border border-line p-3 text-sm">
                <p className="font-medium">{item.label}</p>
                <p className="text-muted">
                  {item.documented} documented · {item.open} open
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="min-w-0 space-y-2" aria-label="Action plan">
        <h2 className="text-sm font-semibold">Action plan</h2>
        {plan.length === 0 ? (
          <p className="text-sm">Every requirement is documented.</p>
        ) : (
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {plan.map((action) => (
              <li key={action.requirementId} className="[overflow-wrap:anywhere]">
                <span className="font-medium">{action.requirementId}:</span> {action.nextAction}
              </li>
            ))}
          </ol>
        )}
      </section>
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
