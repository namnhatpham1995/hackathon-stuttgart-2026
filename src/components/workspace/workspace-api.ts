import {
  DEMO_REQUIREMENT_SET_KEY,
  DEMO_REQUIREMENT_SET_VERSION,
  type ProductDocument,
  type WorkspaceProduct,
} from "./contract";

export class WorkspaceApiError extends Error {}

async function errorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string; message?: string };
    if (payload.error) return payload.error;
    if (payload.message) return payload.message;
  } catch {
    // The route may return an empty body.
  }
  return fallback;
}

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) throw new WorkspaceApiError(await errorMessage(response, fallback));
  return (await response.json()) as T;
}

export type ProductDraftInput = {
  name: string;
  companyName: string;
  country: string;
  productCategory: string;
  capabilities: string;
  targetMarket: string;
  supplierName: string;
  partNumber: string;
  revision: string;
  material: string;
  packaging: string;
};

/** Creates the product, its declared profile and its draft through `POST /api/products`. */
export async function createProductRequest(input: ProductDraftInput): Promise<WorkspaceProduct> {
  const capabilities = input.capabilities
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const response = await fetch("/api/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      requirementSetKey: DEMO_REQUIREMENT_SET_KEY,
      requirementSetVersion: DEMO_REQUIREMENT_SET_VERSION,
      profile: {
        companyName: input.companyName,
        country: input.country,
        productCategory: input.productCategory,
        capabilities,
        targetMarket: input.targetMarket,
      },
      fields: {
        supplierName: { value: input.supplierName, origin: "user" },
        partNumber: { value: input.partNumber, origin: "user" },
        revision: { value: input.revision, origin: "user" },
        material: { value: input.material, origin: "user" },
        packaging: { value: input.packaging, origin: "user" },
      },
    }),
  });
  return readJson(
    response,
    "The product could not be created. Your entries are still here. Try again.",
  );
}

/** Saves the draft through `PATCH /api/products/[productId]`. */
export async function saveDraftRequest(
  productId: string,
  input: {
    name: string;
    supplierName: string;
    partNumber: string;
    revision: string;
    material: string;
    packaging: string;
  },
): Promise<WorkspaceProduct> {
  const response = await fetch(`/api/products/${productId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return readJson(
    response,
    "The draft could not be saved. Your entries are still here. Try again.",
  );
}

/** Posts one file to the documents route. `replacesDocumentId` uses the replace path. */
export async function uploadDocumentRequest(
  productId: string,
  file: File,
  replacesDocumentId?: string | null,
): Promise<ProductDocument> {
  const body = new FormData();
  body.set("file", file);
  if (replacesDocumentId) body.set("replacesDocumentId", replacesDocumentId);
  const response = await fetch(`/api/products/${productId}/documents`, { method: "POST", body });
  return readJson(
    response,
    `${file.name} was not accepted. Check the type and size, then try again.`,
  );
}

/** Starts an assessment through `POST /api/jobs`. */
export async function startAssessmentRequest(productId: string): Promise<{ id: string }> {
  const response = await fetch("/api/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productId }),
  });
  const job = await readJson<{ id?: string }>(
    response,
    "The assessment could not be started. Check the documents and choose Upload and assess again.",
  );
  if (!job.id) {
    throw new WorkspaceApiError(
      "The assessment started without an id. Refresh the page and try again.",
    );
  }
  return { id: job.id };
}
