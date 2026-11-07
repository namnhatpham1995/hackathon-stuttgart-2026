"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { AttentionBanner } from "./attention-banner";
import type { AssessmentResult, SupplierProfile, WorkspaceProduct } from "./contract";
import { requirementSet } from "./fixtures";
import { askAssistant, MetaItem, OverflowMenu, PageHeader } from "./page-chrome";
import {
  actionPlan,
  coveragePhrase,
  dimensionSummary,
  documentRequestDraft,
} from "./report-summary";
import { StatusChip } from "./status-chip";

const evidenceLabels: Record<string, string> = {
  "supplier declaration": "Supplier declaration",
  "material datasheet": "Material datasheet",
  "inspection report": "Inspection report",
  "submitted certificate": "Submitted certificate",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

export function ReportView({
  product,
  readOnly = false,
}: {
  product: WorkspaceProduct;
  readOnly?: boolean;
}) {
  const result = product.result;
  if (!result) {
    return (
      <section className="max-w-3xl">
        <h1 className="page-title">Evidence report</h1>
        <p className="mt-3 max-w-prose text-muted">
          No report is stored for this product yet. Add the buyer’s documents and choose Upload and
          assess. One assessment starts for the whole batch.
        </p>
        {readOnly ? null : (
          <div className="mt-6">
            <Button href={`/workspace/${product.id}#upload-card`} variant="secondary">
              Go to documents
            </Button>
          </div>
        )}
      </section>
    );
  }

  return <ReportBody product={product} result={result} readOnly={readOnly} />;
}

function ReportBody({
  product,
  result,
  readOnly,
}: {
  product: WorkspaceProduct;
  result: AssessmentResult;
  readOnly: boolean;
}) {
  const summary = dimensionSummary(result.findings, requirementSet.requirements);
  const actions = actionPlan(result.findings);
  const expired = result.findings.some((finding) => finding.status === "EXPIRED");
  const draft = documentRequestDraft({
    productName: product.name,
    supplierName: product.fields.supplierName?.value ?? product.profile.companyName,
    partNumber: product.fields.partNumber?.value ?? "",
    findings: result.findings,
  });

  const open = summary.reduce((sum, count) => sum + count.open, 0);
  const [tab, setTab] = useState<"findings" | "plan" | "request">("findings");

  return (
    <article className="space-y-4">
      <PageHeader
        crumbs={[
          { href: "/workspace", label: "Products" },
          { href: readOnly ? undefined : `/workspace/${product.id}`, label: product.name },
          { label: "Evidence report" },
        ]}
        title="Evidence report"
        meta={
          <>
            <MetaItem>
              <span className="rounded-full bg-paper px-2 py-0.5 text-[13px] font-medium">
                {result.complete ? "Processing complete" : "Processing incomplete"}
              </span>
            </MetaItem>
            <MetaItem>{formatDate(result.assessmentDate)}</MetaItem>
            <MetaItem>{open === 1 ? "1 open" : `${open} open`}</MetaItem>
          </>
        }
        actions={
          readOnly ? null : (
            <>
              <OverflowMenu
                items={[
                  { label: "Back to product", href: `/workspace/${product.id}` },
                  { label: "Documents", href: `/workspace/${product.id}#upload-card` },
                ]}
              />
              <Button type="button" variant="secondary" size="sm" onClick={askAssistant}>
                Ask assistant
              </Button>
            </>
          )
        }
      />
      <p className="meta max-w-3xl text-muted">
        {product.name}. This is an evidence review of the documents on file. It is not a
        certification, a supplier rating, or a compliance decision. Reading a certificate does not
        authenticate it.
      </p>

      {result.complete ? null : (
        <AttentionBanner title="Processing incomplete">
          {result.incompleteFiles.length > 0
            ? `${result.incompleteFiles.join(", ")} could not be read. Requirements that file might have supported are marked Needs review, not Missing. Replace the file and assess again.`
            : "At least one file could not be read. Requirements it might have supported are marked Needs review, not Missing. Replace the file and assess again."}
        </AttentionBanner>
      )}

      {expired ? (
        <AttentionBanner title="Submitted certificate expired">
          A submitted certificate’s validity ended before {formatDate(result.assessmentDate)}. It
          stays on this report as Expired. Provide a current certificate.
        </AttentionBanner>
      ) : null}

      <div className="mx-auto max-w-3xl">
        <div
          role="tablist"
          aria-label="Report sections"
          className="flex gap-1 border-b border-line"
        >
          {(
            [
              ["findings", "Findings"],
              ["plan", "Action plan"],
              ["request", "Request draft"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`min-h-10 border-b-2 px-3 text-sm font-medium ${
                tab === id
                  ? "border-accent text-ink"
                  : "border-transparent text-muted hover:text-ink"
              }`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "findings" ? (
          <div className="mt-2">
            {summary.map((count) => {
              const requirements = requirementSet.requirements.filter(
                (requirement) => requirement.dimension === count.dimension,
              );
              return (
                <section key={count.dimension}>
                  <h2 className="meta flex items-baseline justify-between gap-4 px-3 pt-4 pb-1 font-medium text-muted">
                    <span>{count.label}</span>
                    <span>{coveragePhrase(count.documented, count.open)}</span>
                  </h2>
                  <div className="divide-y divide-line border-y border-line">
                    {requirements.map((requirement) => {
                      const finding = result.findings.find(
                        (item) => item.requirementId === requirement.id,
                      );
                      if (!finding) return null;
                      return (
                        <FindingRow
                          key={requirement.id}
                          productId={product.id}
                          title={requirement.title}
                          finding={finding}
                          readOnly={readOnly}
                        />
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        ) : null}

        {tab === "plan" ? (
          <div className="px-3 py-4">
            {actions.length === 0 ? (
              <p className="text-sm text-muted">Every requirement in this report is documented.</p>
            ) : (
              <ol className="list-decimal space-y-4 pl-5">
                {actions.map((action) => (
                  <li key={action.requirementId}>
                    <p className="text-sm">{action.nextAction}</p>
                    <p className="meta mt-1 font-mono text-muted">{action.requirementId}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : null}

        {tab === "request" ? (
          <div className="px-3 py-4">
            <RequestDraft draft={draft} />
          </div>
        ) : null}

        <details className="mt-6 border-t border-line pt-3">
          <summary className="cursor-pointer text-sm font-medium">
            Supplier profile, declared by supplier
          </summary>
          <div className="pt-3">
            <ProfileBlock profile={product.profile} />
          </div>
        </details>
      </div>
    </article>
  );
}

function FindingRow({
  productId,
  title,
  finding,
  readOnly,
}: {
  productId: string;
  title: string;
  finding: AssessmentResult["findings"][number];
  readOnly: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const unresolved = finding.status !== "DOCUMENTED";
  const citation = finding.evidence[0];
  return (
    <div>
      <div className="flex min-h-12 items-center gap-3 px-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 py-2 text-left hover:bg-paper"
          aria-expanded={expanded}
          data-expand={finding.requirementId}
          onClick={() => setExpanded((value) => !value)}
        >
          <StatusChip status={finding.status} />
          <span className="shrink-0 font-mono text-sm">{finding.requirementId}</span>
          <span className="min-w-0 truncate text-sm">{title}</span>
        </button>
        {readOnly || !unresolved ? null : (
          <Button
            href={
              citation
                ? `/workspace/${productId}?replace=${citation.documentId}#upload-card`
                : `/workspace/${productId}#upload-card`
            }
            variant="secondary"
            size="sm"
          >
            {citation ? "Replace" : "Add file"}
          </Button>
        )}
      </div>
      {expanded ? (
        <div className="space-y-2 border-t border-line bg-paper px-3 py-3 text-sm">
          <p className="meta text-muted">
            {finding.evidenceType ? evidenceLabels[finding.evidenceType] : "No evidence submitted"}
          </p>
          <p>{finding.reason}</p>
          {unresolved && finding.nextAction ? <p>{finding.nextAction}</p> : null}
          {citation ? (
            <p className="font-mono text-[13px] break-all">
              {citation.filename}, page {citation.page}. “{citation.quote}”
            </p>
          ) : (
            <p className="text-muted">No citation. Nothing was invented for a missing record.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function RequestDraft({ draft }: { draft: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    setError(null);
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
    } catch {
      setCopied(false);
      setError("Copy failed. Select the draft and copy it yourself. ExportReady does not send it.");
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="section-title">Document request</h2>
        <Button type="button" variant="secondary" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy request"}
        </Button>
      </div>
      <p className="text-sm text-muted">
        The same open items as the action plan, ready to paste. ExportReady does not send this.
      </p>
      <textarea
        readOnly
        value={draft}
        aria-label="Document request draft"
        className="field min-h-48 w-full py-3 font-sans text-sm"
      />
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <p role="status" className="sr-only">
        {copied ? "Document request copied" : ""}
      </p>
    </section>
  );
}

function ProfileBlock({ profile }: { profile: SupplierProfile }) {
  const rows = [
    ["Company", profile.companyName],
    ["Country", profile.country],
    ["Product category", profile.productCategory],
    ["Capabilities", profile.capabilities.join(", ")],
    ["Target market", profile.targetMarket],
  ];
  return (
    <section className="space-y-3">
      <h2 className="section-title">Supplier profile</h2>
      <p className="text-sm text-muted">
        Declared by supplier. These values are not evidence for any requirement.
      </p>
      <dl className="divide-y divide-line border-y border-line">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 py-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="min-w-0 break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
