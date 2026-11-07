import { eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import { assessmentJob, document } from "@/db/schema";
import { claimJob, completeJob, failJob, setStage } from "@/lib/jobs/service";
import { sendCompletionEmail } from "@/lib/notify/completion-email";

import { extractFacts } from "./extract-facts";
import { extractPages, type PdfDocument } from "./pdf-text";
import { getRequirementSet } from "./requirement-sets";
import { decideFindings } from "./rules";
import type { Citation, Finding, Observation, PageText } from "./types";

/**
 * Claims a queued job and stores one result: page text, extracted facts,
 * validated citations, then rule findings. A coverage warning or a PDF with
 * no text marks processing incomplete. The completion email is sent after
 * the result transaction commits. A runner that loses the claim returns
 * without writing. Any earlier failure marks the job NEEDS_ATTENTION.
 */
export async function runAssessment(jobId: string): Promise<void> {
  const claimed = await claimJob(jobId);
  if (!claimed) return;

  try {
    const saved = await assessClaimed(jobId);
    try {
      await sendCompletionEmail(saved.notificationId);
    } catch {
      // completeJob already committed the result and the notification row.
    }
  } catch (error) {
    await failProcessingJob(jobId, error);
  }
}

async function assessClaimed(jobId: string): Promise<{ notificationId: string }> {
  const [job] = await db.select().from(assessmentJob).where(eq(assessmentJob.id, jobId));
  if (!job) {
    throw new Error(
      "This assessment is no longer available. Start it again from the product page.",
    );
  }

  const requirementSet = getRequirementSet(job.requirementSetKey, job.requirementSetVersion);
  if (!requirementSet) {
    throw new Error(
      "This product's requirement set is not available. Open the product and start a new assessment.",
    );
  }

  await setStage(jobId, "extracting_text");
  const snapshot = await loadDocuments(job.documentIds);
  // Photos are not evidence. They are not read, not stored on the result,
  // and they do not make processing incomplete.
  const documents = snapshot.filter((row) => row.kind !== "photo");
  const extracted = await readDocuments(documents);

  await setStage(jobId, "extracting_facts");
  const facts = await extractFacts({
    requirements: requirementSet.requirements,
    pages: extracted.pages,
  });
  // Same incomplete flag as a PDF with no text layer: absence is not MISSING.
  const complete = extracted.emptyDocuments.length === 0 && facts.warnings.length === 0;

  await setStage(jobId, "checking_rules");
  const assessmentDate = berlinDate(new Date());
  const findings = nameIncompleteFiles(
    decideFindings({
      requirementSet,
      observations: facts,
      citations: citationsFromObservations(facts, extracted.pages),
      pages: extracted.pages,
      assessmentDate,
      complete,
    }),
    extracted.emptyDocuments,
    facts.warnings,
  );

  await setStage(jobId, "saving");
  return completeJob(jobId, {
    assessmentDate,
    complete,
    findings,
    documents: documents.map((row) => ({
      id: row.id,
      filename: row.filename,
      sha256: row.sha256,
    })),
  });
}

/** The absence sentence `decideFindings` uses when processing was incomplete. */
const INCOMPLETE_REASON =
  "Processing was incomplete, so this requirement cannot be reported as missing.";

function nameIncompleteFiles(
  findings: Finding[],
  emptyDocuments: readonly { filename: string }[],
  warnings: readonly { filename: string }[],
): Finding[] {
  if (emptyDocuments.length === 0 && warnings.length === 0) return findings;
  const copy = incompleteCopy(emptyDocuments, warnings);
  return findings.map((item) =>
    item.reason === INCOMPLETE_REASON
      ? { ...item, reason: copy.reason, nextAction: copy.nextAction }
      : item,
  );
}

function incompleteCopy(
  emptyDocuments: readonly { filename: string }[],
  warnings: readonly { filename: string }[],
): { reason: string; nextAction: string } {
  const textless = uniqueNames(emptyDocuments.map((item) => item.filename));
  const warned = uniqueNames(warnings.map((item) => item.filename));
  const reason = [INCOMPLETE_REASON];
  const nextAction: string[] = [];
  if (textless.length > 0) {
    const names = textless.join(", ");
    reason.push(`No text could be read from ${names}.`);
    nextAction.push(`Replace ${names} with a text-based PDF and assess again.`);
  }
  if (warned.length > 0) {
    const names = warned.join(", ");
    reason.push(`No facts could be extracted from ${names}.`);
    nextAction.push(
      `Assess ${names} again. If that file still produces no facts, replace it and assess again.`,
    );
  }
  return { reason: reason.join(" "), nextAction: nextAction.join(" ") };
}

function uniqueNames(names: readonly string[]): string[] {
  return [...new Set(names.map((name) => name.trim()).filter((name) => name.length > 0))];
}

async function loadDocuments(documentIds: readonly string[]) {
  if (documentIds.length === 0) return [];
  const rows = await db
    .select()
    .from(document)
    .where(inArray(document.id, [...documentIds]));
  const byId = new Map(rows.map((row) => [row.id, row]));
  return documentIds.map((id) => {
    const row = byId.get(id);
    if (!row) {
      throw new Error(
        "A document in this assessment is no longer available. Upload it again and start a new assessment.",
      );
    }
    return row;
  });
}

async function readDocuments(
  rows: readonly { id: string; filename: string; mimeType: string; content: Buffer }[],
): Promise<{ pages: PageText[]; emptyDocuments: { documentId: string; filename: string }[] }> {
  const pages: PageText[] = [];
  const emptyDocuments: { documentId: string; filename: string }[] = [];
  for (const row of rows) {
    if (row.mimeType !== "application/pdf") {
      throw new Error(
        `"${safeName(row.filename)}" is not a PDF. Replace it with a text-based PDF and start the assessment again.`,
      );
    }
    const pdf: PdfDocument = {
      documentId: row.id,
      filename: row.filename,
      content: new Uint8Array(row.content),
    };
    try {
      const extracted = await extractPages([pdf]);
      pages.push(...extracted.pages);
      emptyDocuments.push(...extracted.emptyDocuments);
    } catch (error) {
      throw new Error(
        `Could not read the text in "${safeName(row.filename)}". Replace that PDF and start the assessment again.`,
        { cause: error },
      );
    }
  }
  return { pages, emptyDocuments };
}

function citationsFromObservations(
  observations: readonly Observation[],
  pages: readonly PageText[],
): Citation[] {
  const filenames = new Map<string, string>();
  for (const page of pages) filenames.set(`${page.documentId}\0${page.page}`, page.filename);

  const citations: Citation[] = [];
  for (const observation of observations) {
    const filename = filenames.get(`${observation.documentId}\0${observation.page}`);
    if (!filename) continue;
    citations.push({
      documentId: observation.documentId,
      filename,
      page: observation.page,
      quote: observation.quote,
    });
  }
  return citations;
}

/** Demo and answer key use the Europe/Berlin calendar date, not UTC. */
function berlinDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error("The assessment date could not be determined. Start the assessment again.");
  }
  return `${year}-${month}-${day}`;
}

function safeName(filename: string): string {
  return filename.replace(/[\r\n"]/g, " ").slice(0, 200);
}

function actionableMessage(error: unknown): string {
  const raw =
    error instanceof Error ? error.message : "The assessment failed before it could be saved.";
  const cleaned = raw
    .replace(/([?&]key=)[^&\s]+/gi, "$1redacted")
    .replace(/\s+/g, " ")
    .trim();
  const detail = cleaned.length > 0 ? cleaned : "The assessment failed before it could be saved.";
  const guided =
    /not set|replace the|replace that|start a new assessment|start the assessment|upload it again/i.test(
      detail,
    )
      ? detail
      : `${detail} Start the assessment again from the product page. If it fails on the same file, replace that PDF and try again.`;
  return guided.slice(0, 4000);
}

async function failProcessingJob(jobId: string, error: unknown): Promise<void> {
  try {
    await failJob(jobId, actionableMessage(error));
  } catch {
    // The job already left PROCESSING, so the stored result stays as it is.
  }
}
