import { z } from "zod";

export const findingStatuses = [
  "DOCUMENTED",
  "MISSING",
  "MISMATCH",
  "EXPIRED",
  "NEEDS_REVIEW",
] as const;
export type FindingStatus = (typeof findingStatuses)[number];

export const jobStatuses = ["QUEUED", "PROCESSING", "COMPLETED", "NEEDS_ATTENTION"] as const;
export type JobStatus = (typeof jobStatuses)[number];

export const jobStages = [
  "extracting_text",
  "extracting_facts",
  "checking_rules",
  "saving",
] as const;
export type JobStage = (typeof jobStages)[number];

export const fieldOrigins = ["user", "assistant", "document"] as const;
export type FieldOrigin = (typeof fieldOrigins)[number];

export const readinessDimensions = [
  "quality",
  "product_material",
  "traceability",
  "packaging_logistics",
] as const;
export type ReadinessDimension = (typeof readinessDimensions)[number];

/** Labels from the evidence-assessment spec. A dimension is a grouping, not a score. */
export const readinessDimensionLabels: Record<ReadinessDimension, string> = {
  quality: "Quality",
  product_material: "Product and material",
  traceability: "Traceability",
  packaging_logistics: "Packaging and logistics",
};

export const requirementKinds = [
  "material_datasheet",
  "certificate",
  "inspection_report",
  "traceability_record",
  "packaging_acceptance",
  "product_specification",
  "material_declaration",
  "packaging_specification",
] as const;
export type RequirementKind = (typeof requirementKinds)[number];

export const evidenceTypeLabels: Record<RequirementKind, string> = {
  material_datasheet: "material datasheet",
  certificate: "submitted certificate",
  inspection_report: "inspection report",
  traceability_record: "traceability record",
  packaging_acceptance: "packaging acceptance",
  product_specification: "product specification",
  material_declaration: "material declaration",
  packaging_specification: "packaging specification",
};

/** Values the rules compare. Absent keys are not part of that requirement. */
export type ExpectedValues = {
  partNumber?: string;
  productName?: string;
  revision?: string;
  material?: string;
  grade?: string;
  supplierName?: string;
  scope?: string;
  /** Covered like `scope`: "ISO 9001" is covered by "ISO 9001:2015". */
  standard?: string;
  packagingCode?: string;
  packagingRevision?: string;
};

export type Requirement = {
  id: string;
  statement: string;
  kind: RequirementKind;
  dimension: ReadinessDimension;
  expected: ExpectedValues;
  /** Short label for lists. Falls back to the id. */
  name?: string;
  /** Traceability links that must all be shown. Default: resin batch, production lot, shipment. */
  traceLinks?: string[];
};

export type RequirementSet = {
  key: string;
  version: number;
  requirements: Requirement[];
};

export type PageText = {
  documentId: string;
  filename: string;
  page: number;
  text: string;
};

export type Observation = {
  requirementId: string;
  field: string;
  value: string | null;
  documentId: string;
  page: number;
  quote: string;
};

export const citationSchema = z.object({
  documentId: z.string().min(1),
  filename: z.string().min(1),
  page: z.number().int().positive(),
  quote: z.string(),
});
export type Citation = z.infer<typeof citationSchema>;

const citedStatuses = ["DOCUMENTED", "MISMATCH", "EXPIRED"] as const;

export const findingSchema = z
  .object({
    requirementId: z.string().min(1),
    status: z.enum(findingStatuses),
    evidenceType: z.enum(requirementKinds),
    observed: z.record(z.string(), z.string().nullable()),
    citations: z.array(citationSchema),
    reason: z.string().min(1),
    nextAction: z.string().min(1),
  })
  .superRefine((finding, ctx) => {
    const needsCitation = citedStatuses.some((status) => status === finding.status);
    if (needsCitation && finding.citations.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "A documented, mismatch or expired finding needs a citation",
      });
    }
    if (finding.status === "MISSING" && finding.citations.length > 0) {
      ctx.addIssue({ code: "custom", message: "A missing finding has no citation" });
    }
  });
export type Finding = z.infer<typeof findingSchema>;

export type AssessedDocument = {
  id: string;
  filename: string;
  sha256: string;
};

export type AssessmentResult = {
  requirementSetKey: string;
  requirementSetVersion: number;
  assessmentDate: string;
  complete: boolean;
  findings: Finding[];
  documents: AssessedDocument[];
};

export const productFieldSchema = z.object({
  value: z.string(),
  origin: z.enum(fieldOrigins),
});
export type ProductField = z.infer<typeof productFieldSchema>;

export const productFieldsSchema = z.object({
  supplierName: productFieldSchema.optional(),
  partNumber: productFieldSchema.optional(),
  revision: productFieldSchema.optional(),
  material: productFieldSchema.optional(),
  packaging: productFieldSchema.optional(),
});
export type ProductFields = z.infer<typeof productFieldsSchema>;

export const supplierProfileSchema = z.object({
  companyName: z.string().min(1),
  country: z.string().min(1),
  productCategory: z.string().min(1),
  capabilities: z.array(z.string()),
  targetMarket: z.string().min(1),
});
export type SupplierProfile = z.infer<typeof supplierProfileSchema>;

/** `{}` until onboarding. The assessment never reads this as evidence. */
export type StoredSupplierProfile = SupplierProfile | Record<string, never>;

export const workspaceViews = ["product", "uploads", "report"] as const;

export const workspaceDirectiveSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("navigate"),
    productId: z.string().min(1).max(200).optional(),
    view: z.enum(workspaceViews),
  }),
  z.object({
    type: z.literal("show_upload_card"),
    productId: z.string().min(1).max(200).optional(),
  }),
  z.object({
    type: z.literal("show_report"),
    productId: z.string().min(1).max(200).optional(),
    resultId: z.string().min(1),
  }),
  z.object({
    type: z.literal("request_replacement"),
    productId: z.string().min(1).max(200).optional(),
    documentId: z.string().min(1),
  }),
]);
export type WorkspaceDirective = z.infer<typeof workspaceDirectiveSchema>;
