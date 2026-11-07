"use client";

import { type RefObject, useState } from "react";

import { Button } from "@/components/ui/button";

import { FILE_LIMITS, type ProductDocument } from "./contract";
import { evidenceSlots, formatBytes, photoSlots } from "./documents";

export function UploadCard({
  documents,
  replacing,
  highlighted,
  pending,
  error,
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
  onAdd: (files: File[]) => void;
  onStartReplace: (id: string) => void;
  onCancelReplace: () => void;
  onRemovePending: (id: string) => void;
  onAssess: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const [dragOver, setDragOver] = useState(false);
  const fileInput = inputRef;
  const pdfs = evidenceSlots(documents);
  const photos = photoSlots(documents);
  const pendingDocs = documents.filter((document) => document.state === "pending");
  const activeDocs = documents.filter((document) => document.state === "active");
  const pdfsFull = pdfs >= FILE_LIMITS.maxEvidence;
  const photosFull = photos >= FILE_LIMITS.maxPhotos;

  function take(files: FileList | File[] | null) {
    if (!files || files.length === 0) return;
    onAdd(Array.from(files));
  }

  return (
    <section
      id="upload-card"
      className={`space-y-4 rounded-lg border bg-card p-4 shadow-card ${
        highlighted ? "border-accent" : "border-line"
      }`}
    >
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Documents</h2>
        <p className="text-sm text-muted">
          Up to 5 PDFs and 2 photos, 4 MB each. Photos stay with the product and are not used as
          evidence. Nothing is assessed until you choose Upload and assess.
        </p>
      </div>

      <p className="text-sm text-muted">
        {pdfs} of 5 PDFs · {photos} of 2 photos
      </p>
      {pdfsFull ? (
        <p className="text-sm">PDF limit reached. Replace a PDF to add another.</p>
      ) : null}
      {photosFull ? (
        <p className="text-sm">Photo limit reached. Replace a photo to add another.</p>
      ) : null}

      {replacing ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 text-sm">
            Replacing <span className="font-mono break-all">{replacing.filename}</span>. The current
            file stays stored and becomes inactive. Choose the new file.
          </p>
          <Button type="button" variant="ghost" onClick={onCancelReplace}>
            Cancel replace
          </Button>
        </div>
      ) : null}

      <fieldset
        aria-label="Add documents"
        className={`min-w-0 rounded-md border border-dashed px-4 py-6 ${dragOver ? "border-accent bg-paper" : "border-line"}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          take(event.dataTransfer.files);
        }}
      >
        <p className="text-sm">Drop PDFs or photos here, or choose files.</p>
        <div className="mt-3">
          <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()}>
            Choose files
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
      </fieldset>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      {activeDocs.length === 0 && pendingDocs.length === 0 ? (
        <p className="text-sm text-muted">
          No documents yet. Add the buyer’s PDFs, then choose Upload and assess once.
        </p>
      ) : null}

      {pendingDocs.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Waiting to upload</h3>
          <ul className="divide-y divide-line border-y border-line">
            {pendingDocs.map((document) => (
              <li
                key={document.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2"
              >
                <span className="min-w-0 font-mono text-sm break-all">
                  {document.filename}
                  <span className="mt-0.5 block font-sans text-muted">
                    {document.kind === "photo" ? "Photo · not evidence · " : "PDF · "}
                    {formatBytes(document.sizeBytes)}
                    {document.replacesDocumentId ? " · replacement" : ""}
                  </span>
                </span>
                <Button type="button" variant="ghost" onClick={() => onRemovePending(document.id)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted">
            These files are not saved if you leave this page before Upload and assess.
          </p>
        </div>
      ) : null}

      {activeDocs.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Active</h3>
          <ul className="divide-y divide-line border-y border-line">
            {activeDocs.map((document) => (
              <li
                key={document.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2"
              >
                <span className="min-w-0 font-mono text-sm break-all">
                  {document.filename}
                  <span className="mt-0.5 block font-sans text-muted">
                    {document.kind === "photo" ? "Photo · not evidence" : "PDF"}
                  </span>
                </span>
                <Button type="button" variant="ghost" onClick={() => onStartReplace(document.id)}>
                  Replace
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Button
        type="button"
        pending={pending}
        disabled={pendingDocs.length === 0}
        onClick={onAssess}
      >
        Upload and assess
      </Button>
    </section>
  );
}
