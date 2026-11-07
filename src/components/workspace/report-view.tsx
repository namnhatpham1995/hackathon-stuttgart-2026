"use client";

import Tabs, { Tab, TabList, TabPanel } from "@atlaskit/tabs";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";

import { AttentionBanner } from "./attention-banner";
import type { AssessmentResult, SupplierProfile, WorkspaceProduct } from "./contract";
import { ChevronIcon, DocumentIcon } from "./icons";
import { MetaItem, PageHeader, ProductNav } from "./page-chrome";
import {
  actionPlan,
  coveragePhrase,
  dimensionSummary,
  documentRequestDraft,
} from "./report-summary";
import { requirementNames, requirementSet } from "./requirements";
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
  if (!product.result) {
    return (
      <section className="max-w-xl space-y-4 py-8">
        <DocumentIcon />
        <h1 className="page-title">No evidence report yet</h1>
        <p className="text-muted">
          {readOnly
            ? "There is no evidence report to display for this product."
            : "Add documents to the product, then choose Upload and assess to create an evidence report."}
        </p>
        {readOnly ? null : (
          <Button href={`/workspace/${product.id}#upload-card`}>Add documents</Button>
        )}
      </section>
    );
  }
  return <ReportBody product={product} result={product.result} readOnly={readOnly} />;
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
  const draft = documentRequestDraft({
    productName: product.name,
    supplierName: product.fields.supplierName?.value ?? product.profile.companyName,
    partNumber: product.fields.partNumber?.value ?? "",
    findings: result.findings,
  });
  const open = summary.reduce((sum, count) => sum + count.open, 0);
  const tabId = useId();

  return (
    <article>
      <PageHeader
        crumbs={[
          { href: "/workspace", label: "Products" },
          { href: readOnly ? undefined : `/workspace/${product.id}`, label: product.name },
          { label: "Evidence report" },
        ]}
        title="Evidence report"
        meta={
          <>
            <MetaItem>{product.profile.companyName}</MetaItem>
            <MetaItem>
              <span className="font-mono">
                {product.fields.partNumber?.value ?? "—"} · Rev{" "}
                {product.fields.revision?.value ?? "—"}
              </span>
            </MetaItem>
            <MetaItem>Assessed {formatDate(result.assessmentDate)}</MetaItem>
          </>
        }
        actions={
          readOnly ? null : (
            <Button href={`/workspace/${product.id}#upload-card`} variant="secondary">
              Update documents
            </Button>
          )
        }
      />
      {readOnly ? (
        <div className="mt-6 border-b border-line pb-3 text-[13px] text-muted">
          Shared evidence report · Read only
        </div>
      ) : (
        <ProductNav productId={product.id} current="report" />
      )}
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="section-title">Buyer requirement review</h2>
          <p className="meta mt-1.5 text-muted">
            Neckar Maschinenbau GmbH · {requirementSet.requirements.length} requirements
          </p>
        </div>
        <p className="text-[13px] text-muted">
          <span className="font-medium text-ink">
            {result.findings.filter((finding) => finding.status === "DOCUMENTED").length} documented
          </span>
          <span className="mx-2">·</span>
          {open} open {open === 1 ? "action" : "actions"}
        </p>
      </div>
      {!result.complete ? (
        <div className="mt-5">
          <AttentionBanner title="Processing incomplete">
            {result.incompleteFiles.length > 0
              ? `${result.incompleteFiles.join(", ")} could not be read. Replace the file and assess again. Affected requirements need review.`
              : "At least one file could not be read. Replace it and assess again. Affected requirements need review."}
          </AttentionBanner>
        </div>
      ) : null}
      <div className="report-tabs mt-6">
        <Tabs id={tabId}>
          <TabList>
            <Tab>
              Findings <span className="ml-2 text-xs text-muted">{result.findings.length}</span>
            </Tab>
            <Tab>
              Action plan <span className="ml-2 text-xs text-muted">{actions.length}</span>
            </Tab>
            <Tab>Request draft</Tab>
          </TabList>
          <TabPanel>
            <div className="mt-5 w-full overflow-hidden rounded-md border border-line">
              <div className="evidence-heading" aria-hidden="true">
                <span>Requirement</span>
                <span>Status</span>
                <span className="file-heading">Source document</span>
                <span className="text-right">Action</span>
              </div>
              {summary.map((count) => (
                <section key={count.dimension}>
                  <h3 className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper px-5 py-2.5 text-xs font-medium">
                    <span>{count.label}</span>
                    <span className="font-normal text-muted">
                      {coveragePhrase(count.documented, count.open)}
                    </span>
                  </h3>
                  <div className="divide-y divide-line">
                    {requirementSet.requirements
                      .filter((requirement) => requirement.dimension === count.dimension)
                      .map((requirement) => {
                        const finding = result.findings.find(
                          (item) => item.requirementId === requirement.id,
                        );
                        return finding ? (
                          <FindingRow
                            key={requirement.id}
                            productId={product.id}
                            title={requirementNames[requirement.id] ?? requirement.title}
                            requirement={requirement.title}
                            finding={finding}
                            readOnly={readOnly}
                          />
                        ) : null;
                      })}
                  </div>
                </section>
              ))}
            </div>
          </TabPanel>
          <TabPanel>
            <div className="w-full py-5">
              {actions.length === 0 ? (
                <div className="py-6">
                  <h3 className="section-title">No open actions</h3>
                  <p className="mt-2 text-muted">Every requirement in this report is documented.</p>
                </div>
              ) : (
                <ol className="divide-y divide-line rounded-md border border-line">
                  {actions.map((action, index) => (
                    <li key={action.requirementId} className="flex items-start gap-4 px-5 py-5">
                      <span className="mt-0.5 text-[13px] text-muted">{index + 1}.</span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium">
                          {requirementNames[action.requirementId]}
                        </h3>
                        <p className="mt-2 max-w-[75ch] text-[13px] leading-relaxed text-muted">
                          {action.nextAction}
                        </p>
                        {readOnly ? null : (
                          <div className="mt-3">
                            <Button
                              href={`/workspace/${product.id}#upload-card`}
                              variant="secondary"
                              size="sm"
                            >
                              Update document
                            </Button>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted">{action.requirementId}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </TabPanel>
          <TabPanel>
            <div className="w-full py-6">
              <RequestDraft draft={draft} />
            </div>
          </TabPanel>
        </Tabs>
      </div>
      <details className="mt-6 border-t border-line py-4">
        <summary className="cursor-pointer text-[13px] font-medium">
          Supplier profile <span className="ml-2 font-normal text-muted">Declared by supplier</span>
        </summary>
        <div className="pt-4">
          <ProfileBlock profile={product.profile} />
        </div>
      </details>
      <p className="meta max-w-[85ch] border-t border-line pt-4 leading-relaxed text-muted">
        This report reviews the documents provided against buyer requirements. It is not a
        certification, a supplier rating, or a compliance decision. Certificate authenticity has not
        been checked.
      </p>
    </article>
  );
}

function FindingRow({
  productId,
  title,
  requirement,
  finding,
  readOnly,
}: {
  productId: string;
  title: string;
  requirement: string;
  finding: AssessmentResult["findings"][number];
  readOnly: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const unresolved = finding.status !== "DOCUMENTED";
  const citation = finding.evidence[0];
  return (
    <div>
      <div className="evidence-row">
        <button
          type="button"
          className="evidence-row-title min-h-8 rounded-sm"
          aria-expanded={expanded}
          aria-controls={detailsId}
          data-expand={finding.requirementId}
          onClick={() => setExpanded((value) => !value)}
        >
          <span className="disclosure">
            <ChevronIcon />
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-medium">{title}</span>
            <span className="mt-1 block text-xs text-muted">{finding.requirementId}</span>
          </span>
        </button>
        <div className="row-status">
          <StatusChip status={finding.status} />
        </div>
        <div className="evidence-file" title={citation?.filename}>
          {citation ? <DocumentIcon /> : null}
          <span className="truncate">{citation?.filename ?? "No evidence submitted"}</span>
        </div>
        <div className="row-action justify-self-end">
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
      </div>
      <div id={detailsId} hidden={!expanded} className="evidence-detail">
        <p className="evidence-detail-label">Buyer requirement</p>
        <p className="mt-1.5">{requirement}</p>
        <p className="evidence-detail-label mt-4">Finding</p>
        <p className="mt-1.5">{finding.reason}</p>
        {finding.evidence.map((evidence) => (
          <figure
            key={`${evidence.documentId}-${evidence.page}-${evidence.quote}`}
            className="mt-4"
          >
            <figcaption className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
              <DocumentIcon />
              <span className="break-all">{evidence.filename}</span>
              <span>· Page {evidence.page}</span>
              {finding.evidenceType ? (
                <span>· {evidenceLabels[finding.evidenceType] ?? finding.evidenceType}</span>
              ) : null}
            </figcaption>
            <blockquote className="evidence-quote font-mono">“{evidence.quote}”</blockquote>
          </figure>
        ))}
        {unresolved && finding.nextAction ? (
          <div className="mt-5">
            <p className="evidence-detail-label">Next action</p>
            <p className="mt-1.5">{finding.nextAction}</p>
          </div>
        ) : null}
      </div>
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
      setError("Copy failed. Select the text below and copy it manually.");
    }
  }
  return (
    <section className="max-w-3xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="section-title">Document request</h3>
          <p className="meta mt-1.5 text-muted">
            Copy this draft to request the outstanding documents.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy request"}
        </Button>
      </div>
      <textarea
        readOnly
        value={draft}
        aria-label="Document request draft"
        className="field min-h-80 w-full resize-y py-4 font-sans text-[13px] leading-relaxed"
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
    <dl className="max-w-3xl divide-y divide-line">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid gap-1 py-3 text-[13px] sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4"
        >
          <dt className="text-muted">{label}</dt>
          <dd className="min-w-0 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
