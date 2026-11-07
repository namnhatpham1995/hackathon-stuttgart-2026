import { z } from "zod";

import { auth } from "@/lib/auth";
import {
  addPendingDocument,
  DocumentRequestError,
  documentTooLargeMessage,
  maxDocumentBytes,
  replaceDocument,
} from "@/lib/documents/service";

/** Multipart framing around a 4 MB file stays well under this. A 5 MB file does not. */
const maxRequestBytes = maxDocumentBytes + 1024 * 1024;

const productIdSchema = z.string().trim().min(1).max(64);
const fileMetaSchema = z.object({
  filename: z.string().trim().min(1).max(1024),
  mimeType: z.string().trim().min(1).max(128),
});
const replacesDocumentIdSchema = z.string().trim().min(1).max(64);

function jsonError(status: number, error: string) {
  return Response.json({ error }, { status });
}

/**
 * One file per request. Files stay pending until the workspace finalises the batch.
 * `replacesDocumentId` links the new pending file to an active document.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return jsonError(401, "Sign in required");

  const productId = productIdSchema.safeParse((await params).productId);
  if (!productId.success) return jsonError(404, "Product not found");

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxRequestBytes) {
    return jsonError(413, documentTooLargeMessage);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, "Send one file per request");
  }

  const files: File[] = [];
  for (const value of form.values()) {
    if (value instanceof File) files.push(value);
  }
  const file = files[0];
  if (files.length !== 1 || !file) return jsonError(400, "Send one file per request");

  const meta = fileMetaSchema.safeParse({ filename: file.name, mimeType: file.type });
  if (!meta.success) return jsonError(400, "Only PDF, JPEG and PNG files are accepted");

  if (file.size > maxDocumentBytes) return jsonError(413, documentTooLargeMessage);
  if (file.size === 0) return jsonError(400, "The file is empty");

  const replacement = form.get("replacesDocumentId");
  let replacesDocumentId: string | undefined;
  if (typeof replacement === "string" && replacement.trim().length > 0) {
    const parsed = replacesDocumentIdSchema.safeParse(replacement);
    if (!parsed.success) return jsonError(400, "The document to replace was not found");
    replacesDocumentId = parsed.data;
  } else if (replacement instanceof File) {
    return jsonError(400, "Send one file per request");
  }

  try {
    const uploaded = {
      filename: meta.data.filename,
      mimeType: meta.data.mimeType,
      content: new Uint8Array(await file.arrayBuffer()),
    };
    const record = replacesDocumentId
      ? await replaceDocument(session.user.id, productId.data, replacesDocumentId, uploaded)
      : await addPendingDocument(session.user.id, productId.data, uploaded);
    return Response.json(record, { status: 201 });
  } catch (error) {
    if (error instanceof DocumentRequestError) return jsonError(error.status, error.message);
    throw error;
  }
}
