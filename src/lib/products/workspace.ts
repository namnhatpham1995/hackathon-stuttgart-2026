import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import type { EvidenceType, WorkspaceProduct } from "@/components/workspace/contract";
import { draftSchema, type FieldErrors, fieldErrors } from "@/components/workspace/schemas";
import { db } from "@/db/client";
import { assessmentJob, assessmentResult } from "@/db/schema";
import { evidenceTypeLabels, findingSchema, supplierProfileSchema } from "@/lib/assessment/types";
import { listDocuments } from "@/lib/documents/service";
import { getProduct, ProductRequestError, updateProduct } from "./service";

/** The workspace and assistant read the same owned product, documents and stored findings. */
export async function loadWorkspaceProduct(
  userId: string,
  productId: string,
  resultId?: string,
): Promise<WorkspaceProduct | null> {
  const owned = await getProduct(userId, productId);
  if (!owned) return null;
  const [documents, results, jobs] = await Promise.all([
    listDocuments(userId, owned.id),
    db
      .select()
      .from(assessmentResult)
      .where(
        and(
          eq(assessmentResult.productId, owned.id),
          resultId ? eq(assessmentResult.id, resultId) : undefined,
        ),
      )
      .orderBy(desc(assessmentResult.createdAt))
      .limit(1),
    db
      .select()
      .from(assessmentJob)
      .where(eq(assessmentJob.productId, owned.id))
      .orderBy(desc(assessmentJob.createdAt))
      .limit(1),
  ]);
  const profile = supplierProfileSchema.safeParse(owned.profile);
  const result = results[0];
  const job = jobs[0];
  return {
    id: owned.id,
    name: owned.name,
    listed: owned.listed,
    fields: owned.fields,
    requirementSetKey: owned.requirementSetKey,
    requirementSetVersion: owned.requirementSetVersion,
    stored: true,
    profile: profile.success
      ? profile.data
      : {
          companyName: owned.fields.supplierName?.value ?? "",
          country: "",
          productCategory: "",
          capabilities: [],
          targetMarket: "",
        },
    documents,
    job:
      job && job.status !== "COMPLETED" ? { id: job.id, startedAt: job.createdAt.getTime() } : null,
    result: result
      ? {
          id: result.id,
          jobId: result.jobId,
          productId: owned.id,
          assessmentDate: result.assessmentDate,
          complete: result.complete,
          incompleteFiles: [],
          documents: result.documents,
          findings: z
            .array(findingSchema)
            .parse(result.findings)
            .map((finding) => ({
              requirementId: finding.requirementId,
              status: finding.status,
              evidenceType: evidenceTypeLabels[finding.evidenceType] as EvidenceType,
              observed: Object.fromEntries(
                Object.entries(finding.observed).filter(
                  (entry): entry is [string, string] => entry[1] !== null,
                ),
              ),
              evidence: finding.citations,
              reason: finding.reason,
              nextAction: finding.nextAction,
              authenticityChecked: false,
            })),
        }
      : null,
  };
}

/** Saves the draft form the way `update_product_draft` saves a field: unchanged values keep their origin. */
export async function applyProductDraft(
  userId: string,
  productId: string,
  input: unknown,
): Promise<{ ok: true; product: WorkspaceProduct } | { ok: false; errors: FieldErrors }> {
  const id = z.string().min(1).max(200).parse(productId);
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const previous = await getProduct(userId, id);
  if (!previous) throw new ProductRequestError(404, "Product not found");
  const { name, ...values } = parsed.data;
  const fields = Object.fromEntries(
    Object.entries(values).map(([key, value]) => {
      const old = previous.fields[key as keyof typeof previous.fields];
      return [key, old?.value === value ? old : { value, origin: "user" as const }];
    }),
  );
  await updateProduct(userId, id, { name, fields });
  const product = await loadWorkspaceProduct(userId, id);
  if (!product) throw new ProductRequestError(404, "Product not found");
  return { ok: true, product };
}
