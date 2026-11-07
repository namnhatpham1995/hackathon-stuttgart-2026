import { ZodError } from "zod";

import { auth } from "@/lib/auth";
import { createProduct, listProducts, ProductRequestError } from "@/lib/products/service";
import { loadWorkspaceProduct } from "@/lib/products/workspace";

export const runtime = "nodejs";

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function userId(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id ?? null;
}

/** Products owned by the signed-in user, newest first, with documents and the latest stored result. */
export async function GET(request: Request) {
  const ownerId = await userId(request);
  if (!ownerId) return json({ error: "Sign in required" }, 401);
  const owned = await listProducts(ownerId);
  const products = (
    await Promise.all(owned.map((product) => loadWorkspaceProduct(ownerId, product.id)))
  ).filter((product) => product !== null);
  return json({ products }, 200);
}

/** Creates a product with the declared supplier profile and draft fields. */
export async function POST(request: Request) {
  const ownerId = await userId(request);
  if (!ownerId) return json({ error: "Sign in required" }, 401);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  try {
    const created = await createProduct(ownerId, payload);
    const product = await loadWorkspaceProduct(ownerId, created.id);
    if (!product) return json({ error: "Product not found" }, 404);
    return json(product, 201);
  } catch (error) {
    if (error instanceof ProductRequestError) return json({ error: error.message }, error.status);
    if (error instanceof ZodError) return json({ error: "Invalid request" }, 400);
    throw error;
  }
}
