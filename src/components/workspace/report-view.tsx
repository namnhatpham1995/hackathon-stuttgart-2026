"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { AttentionBanner } from "./attention-banner";
import type { AssessmentResult, SupplierProfile, WorkspaceProduct } from "./contract";
import { requirementSet } from "./fixtures";
import { askAssistant, MetaItem, OverflowMenu, PageHeader, WorkFrame } from "./page-chrome";
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

  const documented = summary.reduce((sum, count) => sum + count.documented, 0);
  const open = summary.reduce((sum, count) => sum + count.open, 0);

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

      <WorkFrame
        main={
          <>
            <div className="grid items-start gap-4 lg:grid-cols-2">
              <section className="rounded-md bg-paper p-4">
                <h2 className="section-title">Summary</h2>
                <div className="mt-2 divide-y divide-line">
                  {summary.map((count) => (
                    <div
                      key={count.dimension}
                      className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2"
                    >
                      <h3 className="text-sm font-medium">{count.label}</h3>
                      <p className="meta text-muted">
                        {coveragePhrase(count.documented, count.open)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-md border border-line bg-card">
                <h2 className="section-title border-b border-line px-4 py-3">Evidence</h2>
                <ul className="divide-y divide-line">
                  {result.documents.map((document) => (
                    <li key={document.id} className="px-4 py-2 font-mono text-[13px] break-all">
                      {document.filename}
                    </li>
                  ))}
                </ul>
                <p className="meta border-t border-line px-4 py-2 text-muted">
                  {documented} of 5 documented
                </p>
              </section>
            </div>

            <section className="space-y-4 rounded-md border border-line bg-card p-4">
              <h2 className="section-title">Findings</h2>
              {summary.map((count) => {
                const requirements = requirementSet.requirements.filter(
                  (requirement) => requirement.dimension === count.dimension,
                );
                return (
                  <section key={count.dimension} className="space-y-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <h3 className="text-sm font-medium">{count.label}</h3>
                      <p className="meta text-muted">
                        {coveragePhrase(count.documented, count.open)}
                      </p>
                    </div>
                    <div className="divide-y divide-line border-t border-line">
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
            </section>

            <section className="space-y-3 rounded-md border border-line bg-card p-4">
              <h2 className="section-title">What to provide next</h2>
              {actions.length === 0 ? (
                <p className="text-muted">Every requirement in this report is documented.</p>
              ) : (
                <ol className="list-decimal space-y-4 pl-5">
                  {actions.map((action) => (
                    <li key={action.requirementId} className="ps-1">
                      <p>{action.nextAction}</p>
                      <p className="mt-1 font-mono text-sm text-muted">{action.requirementId}</p>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <RequestDraft draft={draft} />

            <ProfileBlock profile={product.profile} />
          </>
        }
        side={
          <>
            <div>
              <p className="meta text-muted">Documented</p>
              <p className="text-sm">{documented} of 5</p>
            </div>
            <div>
              <p className="meta text-muted">Open</p>
              <p className="text-sm">{open === 1 ? "1 open" : `${open} open`}</p>
            </div>
            <div>
              <p className="meta text-muted">Assessment date</p>
              <p className="text-sm">{formatDate(result.assessmentDate)}</p>
            </div>
            <div>
              <p className="meta text-muted">Requested by</p>
              <p className="text-sm">Neckar Maschinenbau GmbH</p>
            </div>
          </>
        }
      />
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
  const open = finding.status !== "DOCUMENTED";
  const citation = finding.evidence[0];
  return (
    <div className="space-y-3 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h4 className="min-w-0 text-base font-medium text-balance">
          <span className="font-mono">{finding.requirementId}</span>
          <span className="text-muted"> · </span>
          {title}
        </h4>
        <StatusChip status={finding.status} />
      </div>
      <p className="text-sm text-muted">
        {finding.evidenceType ? evidenceLabels[finding.evidenceType] : "No evidence submitted"}
      </p>
      <p className="max-w-prose text-sm">{finding.reason}</p>
      {open && finding.nextAction ? (
        <p className="max-w-prose text-sm">
          <span className="font-medium">Next: </span>
          {finding.nextAction}
        </p>
      ) : null}
      {citation ? (
        <figure className="space-y-1 rounded-md bg-paper px-3 py-3">
          <figcaption className="font-mono text-sm break-all">
            {citation.filename} · page {citation.page}
          </figcaption>
          <blockquote className="font-mono text-sm text-pretty">“{citation.quote}”</blockquote>
        </figure>
      ) : (
        <p className="text-sm text-muted">
          No citation. Nothing was invented for a missing record.
        </p>
      )}
      {readOnly || !open ? null : (
        <Button
          href={
            citation
              ? `/workspace/${productId}?replace=${citation.documentId}#upload-card`
              : `/workspace/${productId}#upload-card`
          }
          variant="secondary"
        >
          {citation ? "Replace this document" : "Add the missing document"}
        </Button>
      )}
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
