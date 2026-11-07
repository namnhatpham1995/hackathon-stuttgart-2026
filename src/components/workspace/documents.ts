import { FILE_LIMITS, type ProductDocument } from "./contract";

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function classifyFile(
  file: File,
):
  | { ok: true; mimeType: ProductDocument["mimeType"]; kind: ProductDocument["kind"] }
  | { ok: false; message: string } {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    return { ok: true, mimeType: "application/pdf", kind: "evidence" };
  }
  if (file.type === "image/jpeg" || name.endsWith(".jpg") || name.endsWith(".jpeg")) {
    return { ok: true, mimeType: "image/jpeg", kind: "photo" };
  }
  if (file.type === "image/png" || name.endsWith(".png")) {
    return { ok: true, mimeType: "image/png", kind: "photo" };
  }
  return {
    ok: false,
    message: `${file.name} is not a PDF, JPEG, or PNG. It was not added, and the batch is unchanged.`,
  };
}

export function currentDocuments(documents: readonly ProductDocument[]) {
  const replaced = new Set(
    documents
      .filter((document) => document.state === "pending")
      .map((document) => document.replacesDocumentId),
  );
  return documents.filter(
    (document) =>
      document.state === "pending" || (document.state === "active" && !replaced.has(document.id)),
  );
}

export function evidenceSlots(documents: readonly ProductDocument[]) {
  return currentDocuments(documents).filter((document) => document.kind === "evidence").length;
}

export function photoSlots(documents: readonly ProductDocument[]) {
  return currentDocuments(documents).filter((document) => document.kind === "photo").length;
}

export function rejectionForFile(
  file: File,
  documents: readonly ProductDocument[],
  replacingId: string | null,
): string | null {
  const classified = classifyFile(file);
  if (!classified.ok) return classified.message;
  if (file.size > FILE_LIMITS.maxBytes) {
    return `${file.name} exceeds the 4 MB limit. Choose a smaller file.`;
  }
  const replacing = replacingId
    ? documents.find((document) => document.id === replacingId && document.state === "active")
    : null;
  if (replacingId && !replacing)
    return "This document is no longer active. Refresh the page and choose the current file.";
  if (
    replacingId &&
    documents.some(
      (document) => document.state === "pending" && document.replacesDocumentId === replacingId,
    )
  )
    return "A replacement is already waiting. Undo it or assess the current batch first.";
  const remaining = replacing
    ? documents.filter((document) => document.id !== replacing.id)
    : documents;
  if (classified.kind === "evidence" && evidenceSlots(remaining) >= FILE_LIMITS.maxEvidence) {
    return "This product already has 5 PDFs. Replace one before adding another. The file was not added.";
  }
  if (classified.kind === "photo" && photoSlots(remaining) >= FILE_LIMITS.maxPhotos) {
    return "You can attach 2 photos. They are kept with the product and are not used as evidence. The file was not added.";
  }
  return null;
}
