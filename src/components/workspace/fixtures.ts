import type {
  AssessmentResult,
  Finding,
  ProductDocument,
  RequirementSet,
  WorkspaceProduct,
} from "./contract";

export const requirementNames: Record<string, string> = {
  R1: "Part documentation",
  R2: "ISO 9001 certificate",
  R3: "Inspection report",
  R4: "Traceability record",
  R5: "Packaging acceptance",
};

/** Next actions for the unresolved demo findings. The report-summary test repeats these literals. */
export const NEXT_ACTION = {
  R2: "Provide a current ISO 9001 certificate for Lotus Mould Co., Ltd. covering injection moulding, because the submitted certificate expired on 2026-08-01.",
  R3: "Provide the inspection report for CAP-104 revision B, because the submitted report identifies revision A.",
  R4: "Provide a traceability record that links a resin batch to the production lot and the shipment for CAP-104, because no traceability record was found in the processed documents.",
} as const;

export const requirementSet: RequirementSet = {
  key: "neckar-cap-104",
  version: 1,
  title: "Neckar Maschinenbau GmbH · CAP-104",
  requirements: [
    {
      id: "R1",
      title: "Part-specific documentation identifies CAP-104 revision B as ABS grade LM-ABS-01",
      dimension: "product_material",
      kind: "material_documentation",
    },
    {
      id: "R2",
      title:
        "Submitted ISO 9001 certificate names the supplier, covers injection moulding, and is unexpired on the assessment date",
      dimension: "quality",
      kind: "certificate",
    },
    {
      id: "R3",
      title: "Inspection report identifies CAP-104 revision B",
      dimension: "quality",
      kind: "inspection_revision",
    },
    {
      id: "R4",
      title: "Sample record links a resin batch to production lot and shipment for CAP-104",
      dimension: "traceability",
      kind: "traceability",
    },
    {
      id: "R5",
      title: "Supplier explicitly accepts PKG-07 revision 2 for CAP-104 revision B",
      dimension: "packaging_logistics",
      kind: "packaging_acceptance",
    },
  ],
};

const documentedMaterial: Finding = {
  requirementId: "R1",
  status: "DOCUMENTED",
  evidenceType: "material datasheet",
  observed: { partNumber: "CAP-104", revision: "B", material: "ABS", grade: "LM-ABS-01" },
  evidence: [
    {
      documentId: "doc-datasheet",
      filename: "01_Lotus_Material_Datasheet.pdf",
      page: 1,
      quote: "Part number: CAP-104. Revision: B. Material: ABS. Grade: LM-ABS-01.",
    },
  ],
  reason: "The material datasheet identifies CAP-104 revision B as ABS grade LM-ABS-01.",
  nextAction: "",
  authenticityChecked: false,
};

const expiredCertificate: Finding = {
  requirementId: "R2",
  status: "EXPIRED",
  evidenceType: "submitted certificate",
  observed: { validUntil: "2026-08-01", scope: "injection moulding" },
  evidence: [
    {
      documentId: "doc-iso",
      filename: "02_Lotus_ISO_Certificate_Demo.pdf",
      page: 1,
      quote:
        "ISO 9001:2015. Supplier: Lotus Mould Co., Ltd. Scope: injection moulding. Valid until: 2026-08-01.",
    },
  ],
  reason:
    "The submitted certificate is valid until 2026-08-01, which is before the assessment date of 2026-11-07.",
  nextAction: NEXT_ACTION.R2,
  authenticityChecked: false,
};

const mismatchRevision: Finding = {
  requirementId: "R3",
  status: "MISMATCH",
  evidenceType: "inspection report",
  observed: { partNumber: "CAP-104", revision: "A" },
  evidence: [
    {
      documentId: "doc-inspection-reva",
      filename: "03_CAP104_Inspection_RevA.pdf",
      page: 1,
      quote: "Part number: CAP-104. Drawing revision: A.",
    },
  ],
  reason: "Buyer requires revision B; report identifies A.",
  nextAction: NEXT_ACTION.R3,
  authenticityChecked: false,
};

const documentedRevision: Finding = {
  requirementId: "R3",
  status: "DOCUMENTED",
  evidenceType: "inspection report",
  observed: { partNumber: "CAP-104", revision: "B" },
  evidence: [
    {
      documentId: "doc-inspection-revb",
      filename: "05_CAP104_Inspection_RevB.pdf",
      page: 1,
      quote: "Part number: CAP-104. Drawing revision: B.",
    },
  ],
  reason: "The inspection report identifies CAP-104 revision B.",
  nextAction: "",
  authenticityChecked: false,
};

const missingTraceability: Finding = {
  requirementId: "R4",
  status: "MISSING",
  evidenceType: null,
  observed: null,
  evidence: [],
  reason: "No traceability record found in the processed documents.",
  nextAction: NEXT_ACTION.R4,
  authenticityChecked: false,
};

const needsReviewTraceability: Finding = {
  ...missingTraceability,
  status: "NEEDS_REVIEW",
  reason:
    "Processing was incomplete, so absence of a traceability record is not treated as a finding of missing evidence.",
  nextAction:
    "Replace the unreadable file and assess again before treating traceability as missing.",
};

const documentedPackaging: Finding = {
  requirementId: "R5",
  status: "DOCUMENTED",
  evidenceType: "supplier declaration",
  observed: { packaging: "PKG-07", packagingRevision: "2", partNumber: "CAP-104", revision: "B" },
  evidence: [
    {
      documentId: "doc-packaging",
      filename: "04_Lotus_Packaging_Acceptance.pdf",
      page: 1,
      quote: "Lotus Mould Co., Ltd. accepts PKG-07 revision 2 for CAP-104 revision B.",
    },
  ],
  reason: "The supplier accepts PKG-07 revision 2 for CAP-104 revision B.",
  nextAction: "",
  authenticityChecked: false,
};

export const baselineFindings: Finding[] = [
  documentedMaterial,
  expiredCertificate,
  mismatchRevision,
  missingTraceability,
  documentedPackaging,
];

export const correctedFindings: Finding[] = [
  documentedMaterial,
  expiredCertificate,
  documentedRevision,
  missingTraceability,
  documentedPackaging,
];

export const incompleteFindings: Finding[] = [
  documentedMaterial,
  expiredCertificate,
  mismatchRevision,
  needsReviewTraceability,
  documentedPackaging,
];

export type EvidencePack = "baseline" | "corrected" | "incomplete";

const baselineDocuments: Assessed[] = [
  ["doc-datasheet", "01_Lotus_Material_Datasheet.pdf"],
  ["doc-iso", "02_Lotus_ISO_Certificate_Demo.pdf"],
  ["doc-inspection-reva", "03_CAP104_Inspection_RevA.pdf"],
  ["doc-packaging", "04_Lotus_Packaging_Acceptance.pdf"],
];

const correctedDocuments: Assessed[] = [
  ["doc-datasheet", "01_Lotus_Material_Datasheet.pdf"],
  ["doc-iso", "02_Lotus_ISO_Certificate_Demo.pdf"],
  ["doc-inspection-revb", "05_CAP104_Inspection_RevB.pdf"],
  ["doc-packaging", "04_Lotus_Packaging_Acceptance.pdf"],
];

type Assessed = [string, string];

function assessed(rows: Assessed[]) {
  return rows.map(([id, filename]) => ({ id, filename, sha256: `demo-${id}` }));
}

export function buildResult(productId: string, pack: EvidencePack): AssessmentResult {
  const findings =
    pack === "corrected"
      ? correctedFindings
      : pack === "incomplete"
        ? incompleteFindings
        : baselineFindings;
  return {
    id: `result-${productId}-${pack}`,
    jobId: `job-${productId}-${pack}`,
    productId,
    assessmentDate: "2026-11-07",
    complete: pack !== "incomplete",
    incompleteFiles: pack === "incomplete" ? ["03_CAP104_Inspection_RevA.pdf"] : [],
    findings,
    documents: assessed(pack === "corrected" ? correctedDocuments : baselineDocuments),
  };
}

function pdf(
  id: string,
  filename: string,
  state: ProductDocument["state"],
  replaces: string | null = null,
): ProductDocument {
  return {
    id,
    filename,
    mimeType: "application/pdf",
    kind: "evidence",
    sizeBytes: 180_000,
    state,
    replacesDocumentId: replaces,
  };
}

export const lotusProfile = {
  companyName: "Lotus Mould Co., Ltd.",
  country: "Vietnam",
  productCategory: "Plastic enclosure cover cap",
  capabilities: ["Injection moulding", "Traceability by resin batch"],
  targetMarket: "Germany",
};

const lotusFields = {
  supplierName: { value: "Lotus Mould Co., Ltd.", origin: "user" as const },
  partNumber: { value: "CAP-104", origin: "assistant" as const },
  revision: { value: "B", origin: "user" as const },
  material: { value: "ABS, grade LM-ABS-01", origin: "document" as const },
  packaging: { value: "PKG-07 revision 2", origin: "user" as const },
};

function lotusProduct(
  id: string,
  name: string,
  documents: ProductDocument[],
  pack: EvidencePack,
): WorkspaceProduct {
  return {
    id,
    name,
    requirementSetKey: requirementSet.key,
    requirementSetVersion: requirementSet.version,
    fields: lotusFields,
    profile: lotusProfile,
    documents,
    result: buildResult(id, pack),
  };
}

export const baselineProduct: WorkspaceProduct = lotusProduct(
  "lotus-cap-104",
  "Cover cap CAP-104",
  [
    pdf("doc-datasheet", "01_Lotus_Material_Datasheet.pdf", "active"),
    pdf("doc-iso", "02_Lotus_ISO_Certificate_Demo.pdf", "active"),
    pdf("doc-inspection-reva", "03_CAP104_Inspection_RevA.pdf", "active"),
    pdf("doc-packaging", "04_Lotus_Packaging_Acceptance.pdf", "active"),
    {
      id: "doc-photo",
      filename: "cap-enclosure.jpg",
      mimeType: "image/jpeg",
      kind: "photo",
      sizeBytes: 240_000,
      state: "active",
      replacesDocumentId: null,
    },
  ],
  "baseline",
);

export const correctedProduct: WorkspaceProduct = lotusProduct(
  "lotus-cap-104-corrected",
  "Cover cap CAP-104, revision B report",
  [
    pdf("doc-datasheet", "01_Lotus_Material_Datasheet.pdf", "active"),
    pdf("doc-iso", "02_Lotus_ISO_Certificate_Demo.pdf", "active"),
    pdf("doc-inspection-reva", "03_CAP104_Inspection_RevA.pdf", "inactive"),
    pdf("doc-inspection-revb", "05_CAP104_Inspection_RevB.pdf", "active", "doc-inspection-reva"),
    pdf("doc-packaging", "04_Lotus_Packaging_Acceptance.pdf", "active"),
  ],
  "corrected",
);

const longName = "Nordsee Praezisionskunststoffteile Vertriebsgesellschaft mbH";

export const longValueProduct: WorkspaceProduct = {
  id: "long-values",
  name: longName,
  requirementSetKey: requirementSet.key,
  requirementSetVersion: requirementSet.version,
  fields: {
    supplierName: { value: longName, origin: "user" },
    partNumber: {
      value: "CAP-104-LIEFERANTENDOKUMENTATIONSNACHWEIS",
      origin: "assistant",
    },
    revision: { value: "B-ZEICHNUNGSSTAND-AUSGABE", origin: "user" },
    material: {
      value: "ABS-Copolymerisat-Lieferantendokumentationsnachweis LM-ABS-01",
      origin: "document",
    },
    packaging: { value: "PKG-07 revision 2", origin: "user" },
  },
  profile: {
    companyName: longName,
    country: "Germany",
    productCategory: "Spritzgussteile-Dokumentationsnachweis",
    capabilities: ["Traceability by resin batch"],
    targetMarket: "https://buyer.example/requests/neckar-maschinenbau/cap-104/evidence-pack",
  },
  documents: [
    pdf(
      "doc-long",
      "03_CAP104_Inspection_RevA_Lieferantendokumentationsnachweis_Zeichnungsstand.pdf",
      "active",
    ),
  ],
  result: buildResult("long-values", "baseline"),
};

const byId = new Map<string, WorkspaceProduct>(
  [baselineProduct, correctedProduct, longValueProduct].map((product) => [product.id, product]),
);

export function listedFixtures(): WorkspaceProduct[] {
  return [baselineProduct, correctedProduct];
}

export function fixtureById(id: string): WorkspaceProduct | null {
  return byId.get(id) ?? null;
}

export function applyPack(product: WorkspaceProduct, pack: EvidencePack): WorkspaceProduct {
  if (pack === "baseline") return { ...product, result: buildResult(product.id, "baseline") };
  if (pack === "incomplete") return { ...product, result: buildResult(product.id, "incomplete") };
  return {
    ...product,
    documents: correctedProduct.documents,
    result: buildResult(product.id, "corrected"),
  };
}

export function isEvidencePack(value: string | undefined): value is EvidencePack {
  return value === "baseline" || value === "corrected" || value === "incomplete";
}
