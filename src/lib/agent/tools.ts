import type { FunctionDeclaration, Schema } from "@google/genai";
import { Type } from "@google/genai";
import { and, desc, eq } from "drizzle-orm";
import { ZodError, z } from "zod";

import { db } from "@/db/client";
import { assessmentJob, assessmentResult, product } from "@/db/schema";
import { getRequirementSet } from "@/lib/assessment/requirement-sets";
import {
  type Finding,
  findingSchema,
  type ProductFields,
  type WorkspaceDirective,
  workspaceDirectiveSchema,
  workspaceViews,
} from "@/lib/assessment/types";
import { DocumentRequestError, listDocuments } from "@/lib/documents/service";
import { getJob, type JobRecord, NotFoundError, startAssessment } from "@/lib/jobs/service";
import {
  getProduct,
  type ProductRecord,
  ProductRequestError,
  updateProduct,
} from "@/lib/products/service";

/**
 * The eight actions from the working plan, section 6. Names are the model's
 * function names. Server tools call the products, documents and jobs services
 * with the signed-in user id. Browser tools are checked here and returned as
 * directives; the panel applies them. The model never receives another user's row.
 */
export const agentToolNames = [
  "get_workflow_state",
  "navigate_workspace",
  "update_product_draft",
  "show_upload_card",
  "start_assessment",
  "get_assessment_status",
  "show_report",
  "request_replacement",
] as const;

export type AgentToolName = (typeof agentToolNames)[number];

export type AgentToolResult = {
  output: Record<string, unknown>;
  directive?: WorkspaceDirective;
};

const idSchema = z.string().trim().min(1).max(200);
const draftValue = z.string().trim().min(1).max(200);
const draftFields = ["supplierName", "partNumber", "revision", "material", "packaging"] as const;

const productIdField = idSchema.optional();

const workflowArgs = z.object({ productId: productIdField });
const navigateArgs = z.object({
  view: z.enum(workspaceViews),
  productId: productIdField,
});
const draftArgs = z.object({
  productId: productIdField,
  supplierName: draftValue.optional(),
  partNumber: draftValue.optional(),
  revision: draftValue.optional(),
  material: draftValue.optional(),
  packaging: draftValue.optional(),
});
const uploadArgs = z.object({ productId: productIdField });
const startArgs = z.object({ productId: productIdField });
const statusArgs = z.object({
  productId: productIdField,
  jobId: idSchema.optional(),
});
const reportArgs = z.object({
  productId: productIdField,
  resultId: idSchema.optional(),
});
const replacementArgs = z.object({
  productId: productIdField,
  documentId: idSchema,
});

const productIdProperty: Schema = {
  type: Type.STRING,
  description:
    "Product id. It is checked against the signed-in user. Omit it to use the product open in the workspace.",
};

function parameters(
  description: string,
  properties: Record<string, Schema>,
  required: string[] = [],
): Schema {
  return {
    type: Type.OBJECT,
    description,
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

const declarations: Record<AgentToolName, FunctionDeclaration> = {
  get_workflow_state: {
    name: "get_workflow_state",
    description:
      "Read this user's product draft, buyer checklist, upload state and actual job status. Changes nothing.",
    parameters: parameters("Workflow read.", { productId: productIdProperty }),
  },
  navigate_workspace: {
    name: "navigate_workspace",
    description: "Open only the product, uploads or report view. No other destination.",
    parameters: parameters(
      "Workspace navigation.",
      {
        view: {
          type: Type.STRING,
          format: "enum",
          enum: [...workspaceViews],
          description: "product, uploads or report.",
        },
        productId: productIdProperty,
      },
      ["view"],
    ),
  },
  update_product_draft: {
    name: "update_product_draft",
    description:
      "Set one or more draft fields. The server records the origin as assistant. Allowed fields: supplierName, partNumber, revision, material, packaging.",
    parameters: parameters("Draft update.", {
      productId: productIdProperty,
      supplierName: { type: Type.STRING, description: "Supplier name on the draft." },
      partNumber: { type: Type.STRING, description: "Part number on the draft." },
      revision: { type: Type.STRING, description: "Revision on the draft." },
      material: { type: Type.STRING, description: "Material on the draft." },
      packaging: { type: Type.STRING, description: "Packaging on the draft." },
    }),
  },
  show_upload_card: {
    name: "show_upload_card",
    description:
      "Show the upload card and wait for the user to choose files. Returns WAITING_FOR_USER. Does not upload a file and does not start an assessment.",
    parameters: parameters("Upload card.", { productId: productIdProperty }),
  },
  start_assessment: {
    name: "start_assessment",
    description:
      "Start an assessment when the checklist exists and the upload batch is already finalised. Returns the existing or new job id. Does not upload files.",
    parameters: parameters("Start assessment.", { productId: productIdProperty }),
  },
  get_assessment_status: {
    name: "get_assessment_status",
    description:
      "Read the job stage, stored result id, stored findings and any error. Call it once. The page polls; do not call it in a loop.",
    parameters: parameters("Assessment status.", {
      productId: productIdProperty,
      jobId: {
        type: Type.STRING,
        description: "Job id. Checked against the signed-in user. Omit it to use the latest job.",
      },
    }),
  },
  show_report: {
    name: "show_report",
    description:
      "Open a stored report this user owns. A product or result id owned by someone else is not found.",
    parameters: parameters("Open a report.", {
      productId: productIdProperty,
      resultId: {
        type: Type.STRING,
        description: "Stored result id. Checked against the signed-in user.",
      },
    }),
  },
  request_replacement: {
    name: "request_replacement",
    description:
      "Ask the user to choose a replacement for one active document they own. Does not upload the file and does not start an assessment.",
    parameters: parameters(
      "Request a replacement file.",
      {
        productId: productIdProperty,
        documentId: {
          type: Type.STRING,
          description: "Active document id on this user's product.",
        },
      },
      ["documentId"],
    ),
  },
};

/** Passed to callGemini as the tool list. Automatic function calling stays off. */
export const agentTools = [
  { functionDeclarations: agentToolNames.map((name) => declarations[name]) },
];

function failed(error: string, recovery: string, message?: string): AgentToolResult {
  return {
    output: {
      ok: false,
      error,
      recovery,
      ...(message ? { message } : {}),
    },
  };
}

/** Same sentence for every foreign id, so a miss does not reveal whose row it is. */
function notFound(): AgentToolResult {
  return failed(
    "not found",
    "Open a product you own and ask again.",
    "I could not open it. It was not found.",
  );
}

function isToolResult(value: ProductRecord | AgentToolResult): value is AgentToolResult {
  return "output" in value;
}

function parseArgs<T>(schema: z.ZodType<T>, args: unknown): T | AgentToolResult {
  const parsed = schema.safeParse(args ?? {});
  if (!parsed.success) {
    return failed(
      "Invalid arguments",
      parsed.error.issues[0]?.message ?? "Check the values and try again.",
    );
  }
  return parsed.data;
}

function isParsed<T>(value: T | AgentToolResult): value is T {
  return typeof value !== "object" || value === null || !("output" in value);
}

function productIdFrom(args: { productId?: string }, contextProductId: string): string {
  return args.productId ?? contextProductId;
}

async function requireOwned(
  userId: string,
  productId: string,
): Promise<ProductRecord | AgentToolResult> {
  const found = await getProduct(userId, productId);
  if (!found) return notFound();
  return found;
}

function withDirective(
  output: Record<string, unknown>,
  directive: WorkspaceDirective,
): AgentToolResult {
  const parsed = workspaceDirectiveSchema.safeParse(directive);
  if (!parsed.success) {
    return failed("The workspace action could not be prepared.", "Use the buttons on the page.");
  }
  return { output, directive: parsed.data };
}

function knownFailure(error: unknown): AgentToolResult | null {
  if (error instanceof NotFoundError) return notFound();
  if (error instanceof ProductRequestError || error instanceof DocumentRequestError) {
    if (error.status === 404) return notFound();
    return failed(error.message, "Correct the value and try again, or use the form on the page.");
  }
  if (error instanceof ZodError) {
    return failed(
      "Invalid arguments",
      error.issues[0]?.message ?? "Check the values and try again.",
    );
  }
  if (error instanceof Error && error.message.includes("Assessment jobs run on the API server")) {
    return failed(
      "The assessment could not be started on this server.",
      "Use Upload and assess. The assessment runs on the API server.",
    );
  }
  return null;
}

function isAgentToolName(name: string): name is AgentToolName {
  return (agentToolNames as readonly string[]).includes(name);
}

/**
 * Latest job for a product this user owns, then the jobs service read so a
 * stuck run is recovered the same way as the status route. The jobs service
 * has no product-scoped list, and this lane does not own that file.
 */
async function latestJob(userId: string, productId: string): Promise<JobRecord | null> {
  const [row] = await db
    .select({ id: assessmentJob.id })
    .from(assessmentJob)
    .innerJoin(product, eq(product.id, assessmentJob.productId))
    .where(and(eq(assessmentJob.productId, productId), eq(product.userId, userId)))
    .orderBy(desc(assessmentJob.createdAt))
    .limit(1);
  if (!row) return null;
  return getJob(userId, row.id);
}

/** Stored findings for a result this user owns. Null when the row is missing or unreadable. */
async function storedFindings(
  userId: string,
  resultId: string,
): Promise<{ complete: boolean; findings: Finding[] } | null> {
  const [row] = await db
    .select({
      complete: assessmentResult.complete,
      findings: assessmentResult.findings,
    })
    .from(assessmentResult)
    .innerJoin(product, eq(product.id, assessmentResult.productId))
    .where(and(eq(assessmentResult.id, resultId), eq(product.userId, userId)))
    .limit(1);
  if (!row) return null;
  const findings = z.array(findingSchema).safeParse(row.findings);
  if (!findings.success) return null;
  return { complete: row.complete, findings: findings.data };
}

function jobSummary(job: JobRecord): Record<string, unknown> {
  return {
    id: job.id,
    status: job.status,
    stage: job.stage,
    error: job.error,
    resultId: job.resultId,
  };
}

async function getWorkflowState(
  userId: string,
  contextProductId: string,
  args: unknown,
): Promise<AgentToolResult> {
  const parsed = parseArgs(workflowArgs, args);
  if (!isParsed(parsed)) return parsed;
  const owned = await requireOwned(userId, productIdFrom(parsed, contextProductId));
  if (isToolResult(owned)) return owned;

  const set = getRequirementSet(owned.requirementSetKey, owned.requirementSetVersion);
  const documents = await listDocuments(userId, owned.id);
  const job = await latestJob(userId, owned.id);
  return {
    output: {
      ok: true,
      product: {
        id: owned.id,
        name: owned.name,
        requirementSetKey: owned.requirementSetKey,
        requirementSetVersion: owned.requirementSetVersion,
        fields: owned.fields,
      },
      checklist: set
        ? {
            key: set.key,
            version: set.version,
            requirements: set.requirements.map((requirement) => ({
              id: requirement.id,
              statement: requirement.statement,
              dimension: requirement.dimension,
              kind: requirement.kind,
              expected: requirement.expected,
            })),
          }
        : null,
      uploads: {
        pending: documents.filter((document) => document.state === "pending").length,
        active: documents.filter((document) => document.state === "active").length,
        documents: documents.map((document) => ({
          id: document.id,
          filename: document.filename,
          kind: document.kind,
          state: document.state,
        })),
      },
      job: job ? jobSummary(job) : null,
      ...(set
        ? {}
        : {
            recovery:
              "This product has no buyer checklist. No assessment can start until it has one.",
          }),
    },
  };
}

async function navigateWorkspace(
  userId: string,
  contextProductId: string,
  args: unknown,
): Promise<AgentToolResult> {
  const parsed = parseArgs(navigateArgs, args);
  if (!isParsed(parsed)) return parsed;
  const owned = await requireOwned(userId, productIdFrom(parsed, contextProductId));
  if (isToolResult(owned)) return owned;
  return withDirective({ ok: true, view: parsed.view }, { type: "navigate", view: parsed.view });
}

async function updateProductDraft(
  userId: string,
  contextProductId: string,
  args: unknown,
): Promise<AgentToolResult> {
  const parsed = parseArgs(draftArgs, args);
  if (!isParsed(parsed)) return parsed;
  const fields: ProductFields = {};
  for (const key of draftFields) {
    const value = parsed[key];
    if (value) fields[key] = { value, origin: "assistant" };
  }
  if (Object.keys(fields).length === 0) {
    return failed(
      "No draft field was provided.",
      "Say which field to set: supplier name, part number, revision, material or packaging.",
    );
  }
  const owned = await requireOwned(userId, productIdFrom(parsed, contextProductId));
  if (isToolResult(owned)) return owned;
  const updated = await updateProduct(userId, owned.id, { fields });
  return {
    output: {
      ok: true,
      productId: updated.id,
      name: updated.name,
      fields: updated.fields,
    },
  };
}

async function showUploadCard(
  userId: string,
  contextProductId: string,
  args: unknown,
): Promise<AgentToolResult> {
  const parsed = parseArgs(uploadArgs, args);
  if (!isParsed(parsed)) return parsed;
  const owned = await requireOwned(userId, productIdFrom(parsed, contextProductId));
  if (isToolResult(owned)) return owned;
  return withDirective({ ok: true, status: "WAITING_FOR_USER" }, { type: "show_upload_card" });
}

async function startAssessmentTool(
  userId: string,
  contextProductId: string,
  args: unknown,
): Promise<AgentToolResult> {
  const parsed = parseArgs(startArgs, args);
  if (!isParsed(parsed)) return parsed;
  const owned = await requireOwned(userId, productIdFrom(parsed, contextProductId));
  if (isToolResult(owned)) return owned;
  if (!getRequirementSet(owned.requirementSetKey, owned.requirementSetVersion)) {
    return failed(
      "This product has no buyer checklist.",
      "Choose a product with a checklist. No assessment was started.",
    );
  }

  const documents = await listDocuments(userId, owned.id);
  const pending = documents.filter((document) => document.state === "pending").length;
  const active = documents.filter((document) => document.state === "active").length;
  if (pending > 0) {
    return failed(
      "The upload batch is not finalised.",
      "Press Upload and assess on the upload card. No assessment was started.",
    );
  }
  if (active === 0) {
    return failed(
      "There are no finalised documents.",
      "Choose the files on the upload card, then press Upload and assess. No assessment was started.",
    );
  }

  // The jobs service owns idempotency and scheduling. Group 13 fills the runner.
  const job = await startAssessment(userId, owned.id);
  return { output: { ok: true, ...jobSummary(job), jobId: job.id } };
}

async function assessmentStatus(
  userId: string,
  contextProductId: string,
  args: unknown,
): Promise<AgentToolResult> {
  const parsed = parseArgs(statusArgs, args);
  if (!isParsed(parsed)) return parsed;
  const productId = productIdFrom(parsed, contextProductId);
  const owned = await requireOwned(userId, productId);
  if (isToolResult(owned)) return owned;

  const job = parsed.jobId ? await getJob(userId, parsed.jobId) : await latestJob(userId, owned.id);
  if (parsed.jobId && (!job || job.productId !== owned.id)) return notFound();
  if (!job) {
    return {
      output: {
        ok: true,
        status: null,
        stage: null,
        error: null,
        resultId: null,
        findings: [],
        recovery: "No assessment has been started. Finalise the upload batch, then start one.",
      },
    };
  }

  const output: Record<string, unknown> = { ok: true, ...jobSummary(job), jobId: job.id };
  if (job.status === "NEEDS_ATTENTION") {
    output.recovery = "Correct the documents, then start a new assessment.";
  } else if (job.status === "QUEUED" || job.status === "PROCESSING") {
    output.recovery =
      "Wait for the assessment. The page shows the real status, so do not ask again.";
  }
  if (job.resultId) {
    const stored = await storedFindings(userId, job.resultId);
    if (!stored) {
      output.recovery = "The stored findings could not be read. Open the report from the page.";
    } else {
      output.complete = stored.complete;
      output.findings = stored.findings;
    }
  }
  return { output };
}

async function showReport(
  userId: string,
  contextProductId: string,
  args: unknown,
): Promise<AgentToolResult> {
  const parsed = parseArgs(reportArgs, args);
  if (!isParsed(parsed)) return parsed;
  const owned = await requireOwned(userId, productIdFrom(parsed, contextProductId));
  if (isToolResult(owned)) return owned;

  const filters = [
    eq(product.userId, userId),
    eq(assessmentResult.productId, owned.id),
    eq(assessmentJob.status, "COMPLETED"),
  ];
  if (parsed.resultId) filters.push(eq(assessmentResult.id, parsed.resultId));
  const [row] = await db
    .select({ resultId: assessmentResult.id })
    .from(assessmentResult)
    .innerJoin(product, eq(product.id, assessmentResult.productId))
    .innerJoin(assessmentJob, eq(assessmentJob.id, assessmentResult.jobId))
    .where(and(...filters))
    .orderBy(desc(assessmentResult.createdAt))
    .limit(1);
  if (!row)
    return parsed.resultId
      ? notFound()
      : failed(
          "There is no stored report yet.",
          "Start an assessment and wait until it completes, then ask again.",
        );
  return withDirective(
    { ok: true, resultId: row.resultId, productId: owned.id },
    { type: "show_report", resultId: row.resultId },
  );
}

async function requestReplacement(
  userId: string,
  contextProductId: string,
  args: unknown,
): Promise<AgentToolResult> {
  const parsed = parseArgs(replacementArgs, args);
  if (!isParsed(parsed)) return parsed;
  const owned = await requireOwned(userId, productIdFrom(parsed, contextProductId));
  if (isToolResult(owned)) return owned;
  const documents = await listDocuments(userId, owned.id);
  const match = documents.find((document) => document.id === parsed.documentId);
  if (!match) return notFound();
  if (match.state !== "active") {
    return failed(
      "Only an active document can be replaced.",
      "Choose an active document on this product. No file was uploaded.",
    );
  }
  return withDirective(
    {
      ok: true,
      status: "WAITING_FOR_USER",
      documentId: match.id,
      filename: match.filename,
    },
    { type: "request_replacement", documentId: match.id },
  );
}

const handlers: Record<
  AgentToolName,
  (userId: string, contextProductId: string, args: unknown) => Promise<AgentToolResult>
> = {
  get_workflow_state: getWorkflowState,
  navigate_workspace: navigateWorkspace,
  update_product_draft: updateProductDraft,
  show_upload_card: showUploadCard,
  start_assessment: startAssessmentTool,
  get_assessment_status: assessmentStatus,
  show_report: showReport,
  request_replacement: requestReplacement,
};

export async function executeAgentTool(
  userId: string,
  contextProductId: string,
  call: { name?: string; args?: unknown },
): Promise<AgentToolResult> {
  const name = call.name ?? "";
  if (!isAgentToolName(name)) {
    return failed(
      "That action is not available.",
      "Ask for a workspace action, or use the buttons on the page.",
    );
  }
  try {
    return await handlers[name](userId, contextProductId, call.args);
  } catch (error) {
    const known = knownFailure(error);
    if (known) return known;
    throw error;
  }
}
