import type { JobRecord } from "@/lib/jobs/service";

/** Job status must not be cached: the client polls it every few seconds. */
export function noStore(body: unknown, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function jobResponse(job: JobRecord) {
  return noStore(
    {
      id: job.id,
      productId: job.productId,
      status: job.status,
      stage: job.stage,
      error: job.error,
      resultId: job.resultId,
    },
    200,
  );
}
