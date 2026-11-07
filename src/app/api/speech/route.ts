import { z } from "zod";

import { env } from "@/env";
import { auth } from "@/lib/auth";

import { synthesizeSpeech } from "./elevenlabs";

export const runtime = "nodejs";

const bodySchema = z.object({
  text: z.string().trim().min(1).max(600),
});

function noStore(body: unknown, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Speaks one assistant reply on the server that serves `/api/*`. In production
 * Vercel rewrites this path to Railway, where `ELEVENLABS_API_KEY` lives.
 * A missing key or a failed synthesis returns `{ available: false }` so the
 * reply stays text and the client has no error to show.
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

  const apiKey = env.ELEVENLABS_API_KEY;
  if (!apiKey) return noStore({ available: false }, 200);

  try {
    const audio = await synthesizeSpeech(parsed.data.text, apiKey);
    const body = new ArrayBuffer(audio.byteLength);
    new Uint8Array(body).set(audio);
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "audio/mpeg",
        "cache-control": "no-store",
      },
    });
  } catch {
    return noStore({ available: false }, 200);
  }
}
