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

const localDemoJobs = new Set<string>();

const timeline: { at: number; status: JobStatus; stage: JobStage | null }[] = [
  { at: 0, status: "QUEUED", stage: null },
  { at: 2000, status: "PROCESSING", stage: "extracting_text" },
  { at: 4000, status: "PROCESSING", stage: "extracting_facts" },
  { at: 6000, status: "PROCESSING", stage: "checking_rules" },
  { at: 8000, status: "PROCESSING", stage: "saving" },
  { at: 10000, status: "COMPLETED", stage: null },
];

export function simulatedJob(
  jobId: string,
  startedAt: number,
  now = Date.now(),
): AssessmentJobView {
  const elapsed = now - startedAt;
  let current = timeline[0];
  if (!current) {
    return { id: jobId, status: "QUEUED", stage: null, error: null, resultId: null };
  }
  for (const step of timeline) {
    if (elapsed >= step.at) current = step;
  }
  return {
    id: jobId,
    status: current.status,
    stage: current.stage,
    error: null,
    resultId: current.status === "COMPLETED" ? `demo-result-${jobId}` : null,
  };
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

/**
 * Reads `GET /api/jobs/[jobId]`. Until group 9's route exists, a demo job id
 * falls back to the same stages the live job uses.
 */
export async function fetchJob(jobId: string, startedAt: number): Promise<AssessmentJobView> {
  if (jobId.startsWith("demo-error")) {
    return {
      id: jobId,
      status: "NEEDS_ATTENTION",
      stage: "extracting_text",
      error:
        "03_CAP104_Inspection_RevA.pdf has no readable text. Replace it with a text-based PDF and choose Upload and assess again.",
      resultId: null,
    };
  }

  if (!localDemoJobs.has(jobId)) {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
      if (response.ok) return parseJob(await response.json(), jobId);
      if (response.status !== 404) {
        throw new JobPollError(
          `The assessment status could not be read (${response.status}). This page will try again.`,
          true,
        );
      }
    } catch (error) {
      if (error instanceof JobPollError) throw error;
      if (!jobId.startsWith("demo-")) {
        throw new JobPollError(
          "The assessment status could not be reached. This page will try again.",
          true,
        );
      }
    }
    if (!jobId.startsWith("demo-")) {
      throw new JobPollError(
        "This assessment was not found for your account. Return to the product and start it again.",
        false,
      );
    }
    localDemoJobs.add(jobId);
  }

  return simulatedJob(jobId, startedAt);
}
