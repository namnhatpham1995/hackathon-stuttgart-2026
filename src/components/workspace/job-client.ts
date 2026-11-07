import type { AssessmentJobView, JobStage, JobStatus } from "./contract";

export const POLL_INTERVAL_MS = 2000;

const STATUSES: readonly JobStatus[] = ["QUEUED", "PROCESSING", "COMPLETED", "NEEDS_ATTENTION"];
const STAGES: readonly JobStage[] = [
  "extracting_text",
  "extracting_facts",
  "checking_rules",
  "saving",
];

export class JobPollError extends Error {
  constructor(
    message: string,
    readonly retry: boolean,
  ) {
    super(message);
  }
}

function isStage(value: unknown): value is JobStage {
  return typeof value === "string" && STAGES.includes(value as JobStage);
}

export function parseJob(body: unknown, fallbackId: string): AssessmentJobView {
  if (!body || typeof body !== "object") {
    throw new JobPollError(
      "The assessment status came back in an unexpected shape. Refresh the page.",
      false,
    );
  }
  const record = body as Record<string, unknown>;
  const status = record.status;
  if (typeof status !== "string" || !STATUSES.includes(status as JobStatus)) {
    throw new JobPollError(
      "The assessment status came back in an unexpected shape. Refresh the page.",
      false,
    );
  }
  const stage = record.stage;
  const resultId =
    typeof record.resultId === "string"
      ? record.resultId
      : typeof record.result_id === "string"
        ? record.result_id
        : null;
  return {
    id: typeof record.id === "string" ? record.id : fallbackId,
    status: status as JobStatus,
    stage: isStage(stage) ? stage : null,
    error: typeof record.error === "string" ? record.error : null,
    resultId,
  };
}

/** Reads `GET /api/jobs/[jobId]`. A missing or foreign job is an error, never a stand-in result. */
export async function fetchJob(jobId: string): Promise<AssessmentJobView> {
  let response: Response;
  try {
    response = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
  } catch {
    throw new JobPollError(
      "The assessment status could not be reached. This page will try again.",
      true,
    );
  }
  if (response.status === 404) {
    throw new JobPollError(
      "This assessment was not found for your account. Return to the product and start it again.",
      false,
    );
  }
  if (!response.ok) {
    throw new JobPollError(
      `The assessment status could not be read (${response.status}). This page will try again.`,
      true,
    );
  }
  try {
    return parseJob(await response.json(), jobId);
  } catch (error) {
    if (error instanceof JobPollError) throw error;
    throw new JobPollError(
      "The assessment status came back in an unexpected shape. Refresh the page.",
      false,
    );
  }
}
