import { ZodError, z } from "zod";

import { auth } from "@/lib/auth";
import { NotFoundError, startAssessment } from "@/lib/jobs/service";

import { jobResponse, noStore } from "./json";

export const runtime = "nodejs";

const bodySchema = z.object({
  productId: z.string().trim().min(1).max(200),
});

/**
 * Starts an assessment on the server that serves `/api/*`. In production
 * Vercel rewrites this path to Railway before its own functions run, and
 * `startAssessment` schedules the runner with `after()` on that process.
 * There is no `maxDuration`: Railway is a long-lived Node server.
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return noStore({ error: "Sign in required" }, 401);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return noStore({ error: "Invalid request" }, 400);
  }
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) return noStore({ error: "Invalid request" }, 400);

  try {
    const job = await startAssessment(session.user.id, parsed.data.productId);
    return jobResponse(job);
  } catch (error) {
    if (error instanceof NotFoundError) return noStore({ error: "Not found" }, 404);
    if (error instanceof ZodError) return noStore({ error: "Invalid request" }, 400);
    throw error;
  }
}
