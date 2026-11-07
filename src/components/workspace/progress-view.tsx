"use client";

import { useEffect, useRef, useState } from "react";

import { AttentionBanner } from "./attention-banner";
import { type AssessmentJobView, JOB_STAGES, type JobStage, STAGE_LABELS } from "./contract";
import { fetchJob, JobPollError, POLL_INTERVAL_MS } from "./job-client";

export function ProgressView({
  jobId,
  startedAt,
  onComplete,
  pausedJob,
}: {
  jobId: string;
  startedAt: number;
  onComplete: (job: AssessmentJobView) => void;
  /** When set, the view shows this job and does not poll. Used for the error and loading states. */
  pausedJob?: AssessmentJobView;
}) {
  const [job, setJob] = useState<AssessmentJobView | null>(pausedJob ?? null);
  const [failure, setFailure] = useState<string | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (pausedJob) return;
    let stopped = false;
    let inFlight = false;

    async function tick() {
      if (stopped || inFlight) return;
      inFlight = true;
      try {
        const next = await fetchJob(jobId, startedAt);
        if (stopped) return;
        setJob(next);
        setFailure(null);
        if (next.status === "COMPLETED") {
          stopped = true;
          onCompleteRef.current(next);
          return;
        }
        if (next.status === "NEEDS_ATTENTION") stopped = true;
      } catch (error) {
        if (stopped) return;
        const retry = error instanceof JobPollError ? error.retry : true;
        setFailure(
          error instanceof Error
            ? error.message
            : "The assessment status could not be read. This page will try again.",
        );
        if (!retry) stopped = true;
      } finally {
        inFlight = false;
      }
    }

    void tick();
    const timer = window.setInterval(() => void tick(), POLL_INTERVAL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [jobId, pausedJob, startedAt]);

  const current = pausedJob ?? job;

  return (
    <section className="space-y-4" aria-live="polite">
      <h2 className="text-lg font-semibold tracking-tight">Assessment</h2>
      {failure ? <AttentionBanner title="Status unavailable">{failure}</AttentionBanner> : null}
      {current?.status === "NEEDS_ATTENTION" ? (
        <AttentionBanner title="Processing incomplete">
          {current.error ??
            "The assessment stopped. Replace the file that could not be read and choose Upload and assess again."}
        </AttentionBanner>
      ) : null}
      {!current ? <p className="text-sm text-muted">Checking the assessment…</p> : null}
      {current?.status === "QUEUED" ? (
        <p className="text-sm text-muted">Queued. Waiting for the assessment to start.</p>
      ) : null}
      <ol className="space-y-2">
        {JOB_STAGES.map((stage) => (
          <li key={stage} className="flex items-baseline gap-3 text-sm">
            <StageMark stage={stage} job={current} />
            <span className={markTone(stage, current)}>{STAGE_LABELS[stage]}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function stageIndex(stage: JobStage) {
  return JOB_STAGES.indexOf(stage);
}

function markTone(stage: JobStage, job: AssessmentJobView | null) {
  if (!job || job.status === "QUEUED") return "text-muted";
  if (job.status === "COMPLETED") return "text-ink";
  if (!job.stage) return "text-muted";
  return stageIndex(stage) <= stageIndex(job.stage) ? "text-ink" : "text-muted";
}

function StageMark({ stage, job }: { stage: JobStage; job: AssessmentJobView | null }) {
  const label = stageMark(stage, job);
  return (
    <span className="w-16 shrink-0 font-medium text-muted" aria-hidden="true">
      {label}
    </span>
  );
}

function stageMark(stage: JobStage, job: AssessmentJobView | null) {
  if (!job || job.status === "QUEUED") return "Waiting";
  if (job.status === "COMPLETED") return "Done";
  if (job.status === "NEEDS_ATTENTION") {
    if (!job.stage) return "Stopped";
    if (stage === job.stage) return "Stopped";
    return stageIndex(stage) < stageIndex(job.stage) ? "Done" : "Waiting";
  }
  if (!job.stage) return "Waiting";
  if (stage === job.stage) return "Now";
  return stageIndex(stage) < stageIndex(job.stage) ? "Done" : "Waiting";
}
