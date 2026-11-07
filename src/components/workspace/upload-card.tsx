"use client";

import { type RefObject, useState } from "react";

import { Button } from "@/components/ui/button";

import { FILE_LIMITS, type Finding, type FindingStatus, type ProductDocument } from "./contract";
import { evidenceSlots, formatBytes, photoSlots } from "./documents";
import { requirementSet } from "./fixtures";
import { StatusChip } from "./status-chip";

const shortNames: Record<string, string> = {
  R1: "Part documentation",
  R2: "ISO 9001 certificate",
  R3: "Inspection report",
  R4: "Traceability record",
  R5: "Packaging acceptance",
};

export function UploadCard({
  documents,
  replacing,
  highlighted,
  pending,
  error,
  findings,
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
  onAdd: (files: File[]) => void;
  onStartReplace: (id: string) => void;
  onCancelReplace: () => void;
  onRemovePending: (id: string) => void;
  onAssess: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<Record<string, boolean>>({});
  const fileInput = inputRef;
  const pdfs = evidenceSlots(documents);
  const photos = photoSlots(documents);
  const pendingDocs = documents.filter((document) => document.state === "pending");
  const pdfsFull = pdfs >= FILE_LIMITS.maxEvidence;
  const photosFull = photos >= FILE_LIMITS.maxPhotos;
  const documented = findings?.filter((finding) => finding.status === "DOCUMENTED").length ?? 0;

  function take(files: FileList | File[] | null) {
    if (!files || files.length === 0) return;
    onAdd(Array.from(files));
  }

  function pick(replacingId: string | null) {
    if (replacingId) onStartReplace(replacingId);
    else onCancelReplace();
    requestAnimationFrame(() => fileInput.current?.click());
  }

  return (
    <fieldset
      id="upload-card"
      aria-label="Upload documents"
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
        take(event.dataTransfer.files);
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="grid size-8 place-items-center rounded border border-line text-accent"
            aria-hidden="true"
          >
            <UploadIcon />
          </span>
          <div>
            <h2 className="section-title">Upload documents</h2>
            <p className="meta mt-0.5 text-muted">
              You don’t have to submit every file in one session. Up to 5 PDFs and 2 photos, 4 MB
              each. Photos are not evidence.
            </p>
          </div>
        </div>
        <p className="meta text-muted">
          {findings ? `${documented} of 5 documented` : `${pdfs} of 5 PDFs`}
        </p>
      </div>

      <ul className="divide-y divide-line">
        {requirementSet.requirements.map((requirement) => {
          const finding = findings?.find((item) => item.requirementId === requirement.id);
          const linked = linkedDocument(requirement.id, documents);
          return (
            <li key={requirement.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <RowMark status={finding?.status} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {shortNames[requirement.id] ?? requirement.id}
                </p>
                {linked ? (
                  <p className="meta truncate font-mono text-muted">{linked.filename}</p>
                ) : (
                  <p className="meta text-muted">{requirement.id}</p>
                )}
                {skipped[requirement.id] ? (
                  <p className="meta mt-1 text-muted">
                    {finding?.nextAction ||
                      "No file will be attached for this row. The batch is unchanged."}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {finding ? <StatusChip status={finding.status} /> : null}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setSkipped((current) => ({
                      ...current,
                      [requirement.id]: !current[requirement.id],
                    }))
                  }
                >
                  I don’t have this
                </Button>
                <div className="relative">
                  <div className="inline-flex">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="rounded-r-none"
                      onClick={() => pick(linked?.id ?? null)}
                    >
                      {linked ? "Replace" : "Upload file"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="rounded-l-none border-l-0 px-2"
                      aria-label={`More upload actions for ${requirement.id}`}
                      aria-expanded={menuFor === requirement.id}
                      onClick={() =>
                        setMenuFor((current) =>
                          current === requirement.id ? null : requirement.id,
                        )
                      }
                    >
                      ▾
                    </Button>
                  </div>
                  {menuFor === requirement.id ? (
                    <div className="absolute right-0 z-10 mt-1 min-w-40 rounded-md border border-line bg-card py-1">
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-paper"
                        onClick={() => {
                          setMenuFor(null);
                          pick(linked?.id ?? null);
                        }}
                      >
                        {linked ? "Replace current file" : "Choose a file"}
                      </button>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-paper"
                        onClick={() => {
                          setMenuFor(null);
                          pick(null);
                        }}
                      >
                        Add another file
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex justify-end border-t border-line px-4 py-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => pick(null)}>
          Add additional
        </Button>
      </div>

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
            Replacing <span className="font-mono">{replacing.filename}</span>. The current file
            stays stored.
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
      {pendingDocs.length > 0 ? (
        <ul className="divide-y divide-line border-t border-line">
          {pendingDocs.map((document) => (
            <li
              key={document.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-2"
            >
              <span className="min-w-0 font-mono text-[13px] break-all">
                {document.filename}
                <span className="meta ml-2 font-sans text-muted">
                  {formatBytes(document.sizeBytes)} · waiting
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemovePending(document.id)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2">
        <p className="meta text-muted">
          {pdfs} of 5 PDFs · {photos} of 2 photos
        </p>
        <Button
          type="button"
          size="sm"
          pending={pending}
          disabled={pendingDocs.length === 0}
          onClick={onAssess}
        >
          Upload and assess
        </Button>
      </div>
    </fieldset>
  );
}

function linkedDocument(requirementId: string, documents: readonly ProductDocument[]) {
  const usable = documents.filter(
    (document) => document.state !== "inactive" && document.kind === "evidence",
  );
  return usable.find((document) => matchesRequirement(requirementId, document)) ?? null;
}

function matchesRequirement(requirementId: string, document: ProductDocument) {
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

function RowMark({ status }: { status?: FindingStatus }) {
  const tone =
    status === "DOCUMENTED"
      ? "border-documented-ink bg-documented"
      : status === "MISSING"
        ? "border-missing-ink bg-missing"
        : status === "MISMATCH"
          ? "border-mismatch-ink bg-mismatch"
          : status === "EXPIRED"
            ? "border-expired-ink bg-expired"
            : status === "NEEDS_REVIEW"
              ? "border-review-ink bg-review"
              : "border-line bg-card";
  return (
    <span
      aria-hidden="true"
      className={`size-4 shrink-0 rounded-full border border-dashed ${tone}`}
    />
  );
}

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M8 11V4M5.5 6.5 8 4l2.5 2.5" />
      <path d="M3.5 12.5h9" />
    </svg>
  );
}
