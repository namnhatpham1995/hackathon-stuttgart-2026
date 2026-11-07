import { z } from "zod";

import { runAssistantTurn } from "@/lib/agent/conversation";
import { GeminiCallError } from "@/lib/assessment/gemini";
import { auth } from "@/lib/auth";
import { getProduct } from "@/lib/products/service";

export const runtime = "nodejs";

const messageSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().trim().min(1).max(8_000),
});

const bodySchema = z
  .object({
    productId: z.string().trim().min(1).max(200),
    messages: z.array(messageSchema).min(1).max(40),
  })
  .superRefine((body, ctx) => {
    if (body.messages.at(-1)?.role !== "user") {
      ctx.addIssue({
        code: "custom",
        message: "The latest message must be from the user.",
      });
    }
  });

function noStore(body: unknown, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

const MODEL_RECOVERY =
  "The assistant could not complete that. Try again in a moment, or use the buttons on the page.";
const CONFIG_RECOVERY =
  "The assistant is not configured on the API server. Use the buttons on the page.";

function explained(error: unknown): string | null {
  if (error instanceof GeminiCallError) return MODEL_RECOVERY;
  if (error instanceof Error && /GEMINI_(API_KEY|MODEL) is not set/.test(error.message)) {
    return CONFIG_RECOVERY;
  }
  return null;
}

/**
 * One assistant turn on the server that serves `/api/*`. In production Vercel
 * rewrites this path to Railway before its own functions run. Function calling
 * stays here, at most five rounds. There is no `maxDuration`: Railway is a
 * long-lived Node server.
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

  const owned = await getProduct(session.user.id, parsed.data.productId);
  if (!owned) return noStore({ error: "Not found" }, 404);

  try {
    const turn = await runAssistantTurn({
      userId: session.user.id,
      productId: owned.id,
      messages: parsed.data.messages,
    });
    return noStore(turn, 200);
  } catch (error) {
    const reply = explained(error);
    if (reply) return noStore({ reply, directives: [] }, 200);
    throw error;
  }
}
