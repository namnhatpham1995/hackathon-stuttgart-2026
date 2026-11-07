import type { AssessedDocument, Finding, JobStage, JobStatus } from "@/lib/assessment/types";

export type JobRecord = {
  id: string;
  productId: string;
  status: JobStatus;
  stage: JobStage | null;
  error: string | null;
  attempts: number;
  resultId: string | null;
};

export type CompletedAssessment = {
  assessmentDate: string;
  complete: boolean;
  findings: Finding[];
  documents: AssessedDocument[];
};

export async function startAssessment(userId: string, productId: string): Promise<JobRecord> {
  void userId;
  void productId;
  throw new Error("not implemented: startAssessment");
}

/** Claims QUEUED → PROCESSING. Null means another runner already has the job. */
export async function claimJob(jobId: string): Promise<JobRecord | null> {
  void jobId;
  throw new Error("not implemented: claimJob");
}

export async function setStage(jobId: string, stage: JobStage): Promise<void> {
  void jobId;
  void stage;
  throw new Error("not implemented: setStage");
}

export async function failJob(jobId: string, error: string): Promise<void> {
  void jobId;
  void error;
  throw new Error("not implemented: failJob");
}

export async function completeJob(
  jobId: string,
  result: CompletedAssessment,
): Promise<{ resultId: string; notificationId: string }> {
  void jobId;
  void result;
  throw new Error("not implemented: completeJob");
}

/**
 * The owner's job, or null when the id is unknown or belongs to someone else.
 * A job stuck in PROCESSING for more than five minutes is re-queued, up to two attempts.
 */
export async function getJob(userId: string, jobId: string): Promise<JobRecord | null> {
  void userId;
  void jobId;
  throw new Error("not implemented: getJob");
}
