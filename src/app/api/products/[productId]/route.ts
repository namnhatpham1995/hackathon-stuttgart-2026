import { ZodError, z } from "zod";

import { auth } from "@/lib/auth";
import { ProductRequestError } from "@/lib/products/service";
import { applyProductDraft, loadWorkspaceProduct } from "@/lib/products/workspace";

export const runtime = "nodejs";

const paramsSchema = z.object({
  productId: z.string().trim().min(1).max(200),
});

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function userId(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id ?? null;
}

/** One owned product, its active and pending documents, and the latest result (or `?result=`). */
export async function GET(request: Request, context: { params: Promise<{ productId: string }> }) {
  const ownerId = await userId(request);
  if (!ownerId) return json({ error: "Sign in required" }, 401);
  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) return json({ error: "Product not found" }, 404);
  const resultId = new URL(request.url).searchParams.get("result") ?? undefined;
  const product = await loadWorkspaceProduct(ownerId, params.data.productId, resultId);
  if (!product) return json({ error: "Product not found" }, 404);
  return json(product, 200);
}

/** Saves the product draft. Unchanged fields keep the origin already stored. */
export async function PATCH(request: Request, context: { params: Promise<{ productId: string }> }) {
  const ownerId = await userId(request);
  if (!ownerId) return json({ error: "Sign in required" }, 401);
  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) return json({ error: "Product not found" }, 404);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  try {
    const saved = await applyProductDraft(ownerId, params.data.productId, payload);
    if (!saved.ok)
      return json({ error: "Check the highlighted fields.", errors: saved.errors }, 400);
    return json(saved.product, 200);
  } catch (error) {
    if (error instanceof ProductRequestError) return json({ error: error.message }, error.status);
    if (error instanceof ZodError) return json({ error: "Invalid request" }, 400);
    throw error;
  }
}
