import { FILE_LIMITS, type Finding, type ProductDocument, type Requirement } from "./contract";

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
    return `This product already has ${FILE_LIMITS.maxEvidence} PDFs. Replace one before adding another. The file was not added.`;
  }
  if (classified.kind === "photo" && photoSlots(remaining) >= FILE_LIMITS.maxPhotos) {
    return "You can attach 2 photos. They are kept with the product and are not used as evidence. The file was not added.";
  }
  return null;
}

const NAME_HINTS: Record<string, RegExp> = {
  product_specification: /product[ _-]?spec|datasheet/,
  material_declaration: /material[ _-]?declaration/,
  material_documentation: /datasheet|^01_/,
  inspection_report: /inspection/,
  inspection_revision: /inspection|^0[35]_/,
  certificate: /certificate|(^|[^a-z])iso/,
  traceability_record: /traceab/,
  traceability: /traceab/,
  packaging_specification: /packaging/,
  packaging_acceptance: /packaging|^04_/,
};

function matchesRequirement(requirement: Requirement, document: ProductDocument) {
  if (document.requirementId) return document.requirementId === requirement.id;
  const hint = NAME_HINTS[requirement.kind];
  return Boolean(hint?.test(document.filename.toLowerCase()));
}

/**
 * The document each requirement row shows. A document belongs to at most one row, so Replace on a
 * row can only ever target that row's own file. A row takes, in order: a document the supplier
 * assigned to it or one a finding cites for it, then one whose file name fits the requirement's
 * evidence kind. A waiting replacement beats the file it replaces.
 */
export function assignDocuments(
  requirements: readonly Requirement[],
  documents: readonly ProductDocument[],
  findings?: readonly Finding[],
): Map<string, ProductDocument | null> {
  const usable = currentDocuments(documents).filter((document) => document.kind === "evidence");
  const claimed = new Set<string>();
  const assigned = new Map<string, ProductDocument | null>();

  function take(requirement: Requirement, fits: (document: ProductDocument) => boolean) {
    const free = usable.filter((document) => !claimed.has(document.id));
    const found =
      free.find((document) => document.state === "pending" && fits(document)) ??
      free.find(fits) ??
      null;
    if (found) claimed.add(found.id);
    return found;
  }

  const direct = (requirement: Requirement) => (document: ProductDocument) =>
    document.requirementId === requirement.id ||
    Boolean(
      findings
        ?.find((finding) => finding.requirementId === requirement.id)
        ?.evidence.some((citation) => citation.documentId === document.id),
    );
  const byName = (requirement: Requirement) => (document: ProductDocument) =>
    matchesRequirement(requirement, document) ||
    Boolean(
      document.replacesDocumentId &&
        documents.some(
          (previous) =>
            previous.id === document.replacesDocumentId &&
            matchesRequirement(requirement, previous),
        ),
    );

  for (const requirement of requirements)
    assigned.set(requirement.id, take(requirement, direct(requirement)));
  for (const requirement of requirements) {
    if (!assigned.get(requirement.id))
      assigned.set(requirement.id, take(requirement, byName(requirement)));
  }
  return assigned;
}
