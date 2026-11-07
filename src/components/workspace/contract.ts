/**
 * Local stand-in for `src/lib/assessment/types.ts` (group 3, design.md Decision 2).
 * Field names match that decision. When the contract file exists, switch these
 * imports over and delete this module.
 */

export const FINDING_STATUSES = [
  "DOCUMENTED",
  "MISSING",
  "MISMATCH",
  "EXPIRED",
  "NEEDS_REVIEW",
] as const;

export type FindingStatus = (typeof FINDING_STATUSES)[number];

export const READINESS_DIMENSIONS = [
  "product_material",
  "quality",
  "traceability",
  "packaging_logistics",
] as const;

export type ReadinessDimension = (typeof READINESS_DIMENSIONS)[number];

export const DIMENSION_LABELS: Record<ReadinessDimension, string> = {
  product_material: "Product and material",
  quality: "Quality",
  traceability: "Traceability",
  packaging_logistics: "Packaging and logistics",
};

export const STATUS_LABELS: Record<FindingStatus, string> = {
  DOCUMENTED: "Documented",
  MISSING: "Missing",
  MISMATCH: "Mismatch",
  EXPIRED: "Expired",
  NEEDS_REVIEW: "Needs review",
};

export type FieldOrigin = "user" | "assistant" | "document";

export type SourcedField = {
  value: string;
  origin: FieldOrigin;
};

export type ProductFields = {
  supplierName?: SourcedField;
  partNumber?: SourcedField;
  revision?: SourcedField;
  material?: SourcedField;
  packaging?: SourcedField;
};

export type SupplierProfile = {
  companyName: string;
  country: string;
  productCategory: string;
  capabilities: string[];
  targetMarket: string;
};

export type EvidenceType =
  | "supplier declaration"
  | "material datasheet"
  | "inspection report"
  | "submitted certificate";

export type Citation = {
  documentId: string;
  filename: string;
  page: number;
  quote: string;
};

export type Finding = {
  requirementId: string;
  status: FindingStatus;
  evidenceType: EvidenceType | null;
  observed: Record<string, string> | null;
  evidence: Citation[];
  reason: string;
  nextAction: string;
  authenticityChecked: false;
};

export type Requirement = {
  id: string;
  title: string;
  dimension: ReadinessDimension;
  kind: string;
};

export type RequirementSet = {
  key: string;
  version: number;
  title: string;
  requirements: Requirement[];
};

export type JobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "NEEDS_ATTENTION";

export type JobStage = "extracting_text" | "extracting_facts" | "checking_rules" | "saving";

export type AssessmentJobView = {
  id: string;
  status: JobStatus;
  stage: JobStage | null;
  error: string | null;
  resultId: string | null;
};

export type AssessedDocument = {
  id: string;
  filename: string;
  sha256: string;
};

export type AssessmentResult = {
  id: string;
  jobId: string;
  productId: string;
  assessmentDate: string;
  complete: boolean;
  /** Names of files that yielded no text. Not a Decision 2 column; the UI reads it when present. */
  incompleteFiles: string[];
  findings: Finding[];
  documents: AssessedDocument[];
};

export type WorkspaceDirective =
  | { action: "navigate_workspace"; view: "product" | "uploads" | "report" }
  | { action: "show_upload_card" }
  | { action: "show_report"; resultId: string }
  | { action: "request_replacement"; documentId: string };

export type DocumentKind = "evidence" | "photo";
export type DocumentState = "pending" | "active" | "inactive";

export type ProductDocument = {
  id: string;
  filename: string;
  mimeType: "application/pdf" | "image/jpeg" | "image/png";
  kind: DocumentKind;
  sizeBytes: number;
  state: DocumentState;
  replacesDocumentId: string | null;
};

export type WorkspaceProduct = {
  id: string;
  name: string;
  requirementSetKey: string;
  requirementSetVersion: number;
  fields: ProductFields;
  profile: SupplierProfile;
  documents: ProductDocument[];
  result: AssessmentResult | null;
};

export const DEMO_REQUIREMENT_SET_KEY = "neckar-cap-104";
export const DEMO_REQUIREMENT_SET_VERSION = 1;

export const FILE_LIMITS = {
  maxBytes: 4 * 1024 * 1024,
  maxEvidence: 5,
  maxPhotos: 2,
} as const;

export const JOB_STAGES: readonly JobStage[] = [
  "extracting_text",
  "extracting_facts",
  "checking_rules",
  "saving",
];

export const STAGE_LABELS: Record<JobStage, string> = {
  extracting_text: "Reading the documents",
  extracting_facts: "Extracting cited facts",
  checking_rules: "Comparing with the buyer requirements",
  saving: "Saving the report",
};

export const ORIGIN_LABELS: Record<FieldOrigin, string> = {
  user: "You",
  assistant: "Assistant",
  document: "From document",
};
