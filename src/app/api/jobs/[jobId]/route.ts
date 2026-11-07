import { ZodError, z } from "zod";

import { auth } from "@/lib/auth";
import { getJob, NotFoundError } from "@/lib/jobs/service";

import { jobResponse, noStore } from "../json";

export const runtime = "nodejs";

const paramsSchema = z.object({
  jobId: z.string().trim().min(1).max(200),
});

/**
 * Owner-only status. A job stuck in PROCESSING is re-queued from here, and
 * the runner is scheduled with `after()` on this same request. In production
 * this route is served by Railway (the `/api/*` rewrite), which has no
 * function timeout. Do not set `maxDuration`.
 */
export async function GET(request: Request, context: { params: Promise<{ jobId: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return noStore({ error: "Sign in required" }, 401);

  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) return noStore({ error: "Invalid request" }, 400);

  try {
    const job = await getJob(session.user.id, parsed.data.jobId);
    if (!job) return noStore({ error: "Not found" }, 404);
    return jobResponse(job);
  } catch (error) {
    if (error instanceof NotFoundError) return noStore({ error: "Not found" }, 404);
    if (error instanceof ZodError) return noStore({ error: "Invalid request" }, 400);
    throw error;
  }
}
