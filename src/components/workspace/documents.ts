import { FILE_LIMITS, type ProductDocument } from "./contract";

export function formatBytes(bytes: number) {
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

export function evidenceSlots(documents: readonly ProductDocument[]) {
  const active = documents.filter(
    (document) => document.kind === "evidence" && document.state === "active",
  ).length;
  const pendingNew = documents.filter(
    (document) =>
      document.kind === "evidence" && document.state === "pending" && !document.replacesDocumentId,
  ).length;
  return active + pendingNew;
}

export function photoSlots(documents: readonly ProductDocument[]) {
  const active = documents.filter(
    (document) => document.kind === "photo" && document.state === "active",
  ).length;
  const pendingNew = documents.filter(
    (document) =>
      document.kind === "photo" && document.state === "pending" && !document.replacesDocumentId,
  ).length;
  return active + pendingNew;
}

export function rejectionForFile(
  file: File,
  documents: readonly ProductDocument[],
  replacingId: string | null,
): string | null {
  const classified = classifyFile(file);
  if (!classified.ok) return classified.message;
  if (file.size > FILE_LIMITS.maxBytes) {
    return `${file.name} is ${formatBytes(file.size)}. The limit is 4 MB per file, so it was not added and the batch is unchanged.`;
  }
  if (replacingId) return null;
  if (classified.kind === "evidence" && evidenceSlots(documents) >= FILE_LIMITS.maxEvidence) {
    return "This product already has 5 PDFs. Replace one before adding another. The file was not added.";
  }
  if (classified.kind === "photo" && photoSlots(documents) >= FILE_LIMITS.maxPhotos) {
    return "You can attach 2 photos. They are kept with the product and are not used as evidence. The file was not added.";
  }
  return null;
}

/** Active evidence filenames decide which demo finding set a local assessment shows. */
export function packFromFilenames(filenames: readonly string[]) {
  const names = filenames.map((name) => name.toLowerCase());
  const hasRevA = names.some(
    (name) => name.includes("reva") || name.includes("rev-a") || name.includes("revision-a"),
  );
  const hasRevB = names.some(
    (name) => name.includes("revb") || name.includes("rev-b") || name.includes("05_"),
  );
  if (hasRevB && !hasRevA) return "corrected" as const;
  return "baseline" as const;
}
