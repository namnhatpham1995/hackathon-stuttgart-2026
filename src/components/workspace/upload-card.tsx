"use client";

import { type RefObject, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import { DIMENSION_LABELS, FILE_LIMITS, type Finding, type ProductDocument } from "./contract";
import { currentDocuments, evidenceSlots, formatBytes, photoSlots } from "./documents";
import { ChevronIcon, DocumentIcon, UploadIcon } from "./icons";
import { requirementNames, requirementSet } from "./requirements";
import { StatusChip } from "./status-chip";

export function UploadCard({
  documents,
  replacing,
  highlighted,
  pending,
  error,
  findings,
  canAssess = false,
  onAdd,
  onStartReplace,
  onCancelReplace,
  onRemovePending,
  onAssess,
  inputRef,
}: {
  documents: readonly ProductDocument[];
  replacing: ProductDocument | null;
  highlighted: boolean;
  pending: boolean;
  error: string | null;
  findings?: readonly Finding[];
  canAssess?: boolean;
  onAdd: (files: File[], requirementId?: string) => void;
  onStartReplace: (id: string) => void;
  onCancelReplace: () => void;
  onRemovePending: (id: string) => void;
  onAssess: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<Record<string, boolean>>({});
  const fileInput = inputRef;
  const targetRequirement = useRef<string | undefined>(undefined);
  const pdfs = evidenceSlots(documents);
  const photos = photoSlots(documents);
  const pendingDocs = documents.filter((document) => document.state === "pending");
  const assignedIds = new Set(
    requirementSet.requirements.map(
      (requirement) => linkedDocument(requirement.id, documents, findings)?.id,
    ),
  );
  const additionalDocuments = currentDocuments(documents).filter(
    (document) => !assignedIds.has(document.id),
  );
  const pdfsFull = pdfs >= FILE_LIMITS.maxEvidence;
  const photosFull = photos >= FILE_LIMITS.maxPhotos;

  function take(files: FileList | File[] | null) {
    if (pending || !files || files.length === 0) return;
    onAdd(Array.from(files), targetRequirement.current);
    targetRequirement.current = undefined;
  }

  function pick(replacingId: string | null, requirementId?: string) {
    targetRequirement.current = requirementId;
    if (replacingId) onStartReplace(replacingId);
    else onCancelReplace();
    requestAnimationFrame(() => fileInput.current?.click());
  }

  return (
    <fieldset
      id="upload-card"
      aria-label="Upload documents"
      disabled={pending}
      className={`min-w-0 rounded-md border bg-card ${highlighted || dragOver ? "border-accent" : "border-line"}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        onCancelReplace();
        targetRequirement.current = undefined;
        take(event.dataTransfer.files);
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-5">
        <div>
          <h2 className="section-title">Buyer requirements</h2>
          <p className="meta mt-1.5 text-muted">
            Add evidence for each requirement. You can return to this later.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => pick(null)}>
          <UploadIcon /> Add files
        </Button>
      </div>
      <div className="evidence-heading" aria-hidden="true">
        <span>Requirement</span>
        <span>Status</span>
        <span className="file-heading">Attached document</span>
        <span className="text-right">Action</span>
      </div>
      <ul className="divide-y divide-line">
        {requirementSet.requirements.map((requirement) => {
          const linked = linkedDocument(requirement.id, documents, findings);
          const finding = findings?.find(
            (item) =>
              item.requirementId === requirement.id &&
              (!linked ||
                item.evidence.some(
                  (citation) =>
                    citation.documentId === linked.id || citation.filename === linked.filename,
                )),
          );
          const expanded = openRow === requirement.id;
          const waiting = linked?.state === "pending";
          return (
            <li key={requirement.id}>
              <div className="evidence-row">
                <button
                  type="button"
                  className="evidence-row-title min-h-8 rounded-sm"
                  aria-expanded={expanded}
                  aria-controls={`requirement-${requirement.id}`}
                  data-expand={requirement.id}
                  onClick={() => setOpenRow(expanded ? null : requirement.id)}
                >
                  <span className="disclosure">
                    <ChevronIcon />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium">
                      {requirementNames[requirement.id] ?? requirement.id}
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      {requirement.id} · {DIMENSION_LABELS[requirement.dimension]}
                    </span>
                  </span>
                </button>
                <div className="row-status">
                  {waiting ? (
                    <span className="text-xs font-medium text-accent">Ready to assess</span>
                  ) : finding ? (
                    <StatusChip status={finding.status} />
                  ) : (
                    <span className="text-xs text-muted">
                      {linked
                        ? "Not assessed"
                        : skipped[requirement.id]
                          ? "Unavailable"
                          : "No file"}
                    </span>
                  )}
                </div>
                <div className="evidence-file" title={linked?.filename}>
                  {linked ? <DocumentIcon /> : null}
                  <span className="truncate">
                    {linked?.filename ??
                      (skipped[requirement.id] ? "Marked as unavailable" : "No document added")}
                  </span>
                </div>
                <div className="row-action justify-self-end">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      waiting && linked
                        ? onRemovePending(linked.id)
                        : pick(linked?.id ?? null, requirement.id)
                    }
                  >
                    {waiting ? "Undo" : linked ? "Replace" : "Upload file"}
                  </Button>
                </div>
              </div>
              <div
                id={`requirement-${requirement.id}`}
                hidden={!expanded}
                className="evidence-detail"
              >
                <p className="evidence-detail-label">Buyer requirement</p>
                <p className="mt-1.5">{requirement.title}</p>
                <p className="mt-4">
                  {waiting
                    ? "This document is ready. Choose Upload and assess to check the updated batch."
                    : (finding?.reason ??
                      "Add a document, then choose Upload and assess to check it against this requirement.")}
                </p>
                {!waiting && finding?.nextAction ? (
                  <p className="mt-3 font-medium">{finding.nextAction}</p>
                ) : null}
                {!linked ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-3"
                    onClick={() =>
                      setSkipped((current) => ({
                        ...current,
                        [requirement.id]: !current[requirement.id],
                      }))
                    }
                  >
                    {skipped[requirement.id] ? "I have this document" : "I don’t have this"}
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <input
        ref={fileInput}
        type="file"
        className="sr-only"
        aria-label="Choose PDF or photo files"
        multiple
        accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
        onChange={(event) => {
          take(event.target.files);
          event.target.value = "";
        }}
      />

      {pdfsFull ? (
        <p className="meta border-t border-line px-4 py-2">
          PDF limit reached. Replace a PDF to add another.
        </p>
      ) : null}
      {photosFull ? (
        <p className="meta border-t border-line px-4 py-2">
          Photo limit reached. Replace a photo to add another.
        </p>
      ) : null}
      {replacing ? (
        <p className="meta flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2">
          <span>
            Replacing <span>{replacing.filename}</span>. The current file stays stored.
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={onCancelReplace}>
            Cancel replace
          </Button>
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="meta border-t border-line px-4 py-2 text-danger">
          {error}
        </p>
      ) : null}
      {additionalDocuments.length > 0 ? (
        <details
          className="border-t border-line"
          open={additionalDocuments.some((document) => document.state === "pending")}
        >
          <summary className="cursor-pointer px-5 py-3 text-[13px] font-medium">
            Additional files{" "}
            <span className="ml-2 font-normal text-muted">{additionalDocuments.length}</span>
          </summary>
          <p className="meta px-5 pb-3 text-muted">
            Photos are reference only. PDF documents are included in the assessment.
          </p>
          <ul className="divide-y divide-line">
            {additionalDocuments.map((document) => (
              <li
                key={document.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-all text-[13px]">{document.filename}</p>
                  <p className="mt-1 text-xs text-muted">
                    {document.kind === "photo" ? "Reference photo" : "PDF document"} ·{" "}
                    {formatBytes(document.sizeBytes)}
                    {document.state === "pending" ? " · Ready to assess" : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    document.state === "pending" ? onRemovePending(document.id) : pick(document.id)
                  }
                >
                  {document.state === "pending" ? "Undo" : "Replace"}
                </Button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line px-5 py-4">
        <p className="meta text-muted">
          {pdfs} / 5 PDFs · {photos} / 2 photos · 4 MB per file
        </p>
        <Button
          type="button"
          pending={pending}
          disabled={!canAssess && pendingDocs.length === 0}
          onClick={onAssess}
        >
          {pending ? "Uploading…" : "Upload and assess"}
        </Button>
      </div>
    </fieldset>
  );
}

function linkedDocument(
  requirementId: string,
  documents: readonly ProductDocument[],
  findings?: readonly Finding[],
) {
  const usable = currentDocuments(documents).filter((document) => document.kind === "evidence");
  const matches = (document: ProductDocument) =>
    document.requirementId === requirementId ||
    Boolean(
      findings
        ?.find((finding) => finding.requirementId === requirementId)
        ?.evidence.some((citation) => citation.documentId === document.id),
    ) ||
    matchesRequirement(requirementId, document) ||
    Boolean(
      document.replacesDocumentId &&
        documents.some(
          (previous) =>
            previous.id === document.replacesDocumentId &&
            matchesRequirement(requirementId, previous),
        ),
    );
  return (
    usable.find((document) => document.state === "pending" && matches(document)) ??
    usable.find(matches) ??
    null
  );
}

function matchesRequirement(requirementId: string, document: ProductDocument) {
  if (document.requirementId) return document.requirementId === requirementId;
  const name = document.filename.toLowerCase();
  if (requirementId === "R1")
    return document.id === "doc-datasheet" || name.includes("datasheet") || name.startsWith("01_");
  if (requirementId === "R2")
    return document.id === "doc-iso" || name.includes("iso") || name.startsWith("02_");
  if (requirementId === "R3") {
    return (
      document.id.startsWith("doc-inspection") ||
      name.includes("inspection") ||
      name.startsWith("03_") ||
      name.startsWith("05_")
    );
  }
  if (requirementId === "R5")
    return document.id === "doc-packaging" || name.includes("packaging") || name.startsWith("04_");
  return false;
}
