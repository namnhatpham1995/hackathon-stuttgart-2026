import { createHash } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";

import { type Database, db } from "@/db/client";
import { document, product } from "@/db/schema";
import { getProduct } from "@/lib/products/service";

export const documentMimeTypes = ["application/pdf", "image/jpeg", "image/png"] as const;
export type DocumentMimeType = (typeof documentMimeTypes)[number];

export const documentKinds = ["evidence", "photo"] as const;
export type DocumentKind = (typeof documentKinds)[number];

export const documentStates = ["pending", "active", "inactive"] as const;
export type DocumentState = (typeof documentStates)[number];

/** 4 MiB. The database check uses the same bound. */
export const maxDocumentBytes = 4 * 1024 * 1024;
export const maxActivePdfs = 5;
export const maxActivePhotos = 2;

export const documentTooLargeMessage = "This file is over the 4 MB limit";

export type UploadedFile = {
  filename: string;
  mimeType: string;
  content: Uint8Array;
};

export type DocumentRecord = {
  id: string;
  productId: string;
  filename: string;
  mimeType: DocumentMimeType;
  kind: DocumentKind;
  sizeBytes: number;
  sha256: string;
  state: DocumentState;
  replacesDocumentId: string | null;
};

/** A rejected document write. Routes map `status` and return `message` as `{ error }`. */
export class DocumentRequestError extends Error {
  readonly status: 400 | 404 | 413;

  constructor(status: 400 | 404 | 413, message: string) {
    super(message);
    this.name = "DocumentRequestError";
    this.status = status;
  }
}

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

type StoredDocument = {
  id: string;
  productId: string;
  filename: string;
  mimeType: string;
  kind: string;
  sizeBytes: number;
  sha256: string;
  state: string;
  replacesDocumentId: string | null;
};

const documentColumns = {
  id: document.id,
  productId: document.productId,
  filename: document.filename,
  mimeType: document.mimeType,
  kind: document.kind,
  sizeBytes: document.sizeBytes,
  sha256: document.sha256,
  state: document.state,
  replacesDocumentId: document.replacesDocumentId,
};

function isMimeType(value: string): value is DocumentMimeType {
  return documentMimeTypes.some((mime) => mime === value);
}

function isKind(value: string): value is DocumentKind {
  return documentKinds.some((kind) => kind === value);
}

function isState(value: string): value is DocumentState {
  return documentStates.some((state) => state === value);
}

function toDocument(row: StoredDocument): DocumentRecord {
  if (!isMimeType(row.mimeType) || !isKind(row.kind) || !isState(row.state)) {
    throw new DocumentRequestError(400, "A stored document has an invalid type");
  }
  return {
    id: row.id,
    productId: row.productId,
    filename: row.filename,
    mimeType: row.mimeType,
    kind: row.kind,
    sizeBytes: row.sizeBytes,
    sha256: row.sha256,
    state: row.state,
    replacesDocumentId: row.replacesDocumentId,
  };
}

function fileName(name: string): string {
  const base = name.replaceAll("\\", "/").split("/").pop()?.trim() ?? "";
  if (base.length === 0 || base === "." || base === "..") {
    throw new DocumentRequestError(400, "A file name is required");
  }
  if (base.length > 255) throw new DocumentRequestError(400, "The file name is too long");
  return base;
}

function declaredMime(mimeType: string): DocumentMimeType {
  const mime = mimeType.trim().toLowerCase();
  if (!isMimeType(mime)) {
    throw new DocumentRequestError(400, "Only PDF, JPEG and PNG files are accepted");
  }
  return mime;
}

function kindFor(mime: DocumentMimeType): DocumentKind {
  return mime === "application/pdf" ? "evidence" : "photo";
}

function matchesDeclaredType(mime: DocumentMimeType, content: Uint8Array): boolean {
  if (mime === "application/pdf") return hasPdfHeader(content);
  if (mime === "image/jpeg") {
    return content.length >= 3 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff;
  }
  return (
    content.length >= 8 &&
    content[0] === 0x89 &&
    content[1] === 0x50 &&
    content[2] === 0x4e &&
    content[3] === 0x47 &&
    content[4] === 0x0d &&
    content[5] === 0x0a &&
    content[6] === 0x1a &&
    content[7] === 0x0a
  );
}

function hasPdfHeader(content: Uint8Array): boolean {
  const header = [0x25, 0x50, 0x44, 0x46, 0x2d];
  const end = Math.min(content.length, 1024);
  for (let index = 0; index <= end - header.length; index++) {
    if (header.every((byte, offset) => content[index + offset] === byte)) return true;
  }
  return false;
}

function checkedFile(file: UploadedFile): {
  filename: string;
  mimeType: DocumentMimeType;
  kind: DocumentKind;
  content: Buffer;
  sha256: string;
} {
  if (file.content.byteLength === 0) throw new DocumentRequestError(400, "The file is empty");
  if (file.content.byteLength > maxDocumentBytes) {
    throw new DocumentRequestError(413, documentTooLargeMessage);
  }
  const mimeType = declaredMime(file.mimeType);
  if (!matchesDeclaredType(mimeType, file.content)) {
    throw new DocumentRequestError(400, "The file contents do not match the declared type");
  }
  const content = Buffer.from(file.content);
  return {
    filename: fileName(file.filename),
    mimeType,
    kind: kindFor(mimeType),
    content,
    sha256: createHash("sha256").update(content).digest("hex"),
  };
}

function projectedCounts(
  rows: DocumentRecord[],
  incoming?: { kind: DocumentKind; replacesDocumentId: string | null },
): { pdfs: number; photos: number } {
  const replaced = new Set<string>();
  for (const row of rows) {
    if (row.state === "pending" && row.replacesDocumentId) replaced.add(row.replacesDocumentId);
  }
  if (incoming?.replacesDocumentId) replaced.add(incoming.replacesDocumentId);

  let pdfs = 0;
  let photos = 0;
  const count = (kind: DocumentKind) => {
    if (kind === "evidence") pdfs += 1;
    else photos += 1;
  };
  for (const row of rows) {
    if (row.state === "inactive") continue;
    if (row.state === "active" && replaced.has(row.id)) continue;
    count(row.kind);
  }
  if (incoming) count(incoming.kind);
  return { pdfs, photos };
}

function assertWithinLimits(counts: { pdfs: number; photos: number }) {
  if (counts.pdfs > maxActivePdfs) {
    throw new DocumentRequestError(400, "A product can have at most 5 active PDFs");
  }
  if (counts.photos > maxActivePhotos) {
    throw new DocumentRequestError(400, "A product can have at most 2 photos");
  }
}

async function lockOwnedProduct(tx: Tx, userId: string, productId: string) {
  const [owned] = await tx
    .select({ id: product.id })
    .from(product)
    .where(and(eq(product.id, productId), eq(product.userId, userId)))
    .for("update")
    .limit(1);
  if (!owned) throw new DocumentRequestError(404, "Product not found");
}

async function loadDocuments(tx: Tx, productId: string): Promise<DocumentRecord[]> {
  const rows = await tx
    .select(documentColumns)
    .from(document)
    .where(eq(document.productId, productId))
    .orderBy(asc(document.createdAt));
  return rows.map(toDocument);
}

async function insertPending(
  tx: Tx,
  productId: string,
  file: ReturnType<typeof checkedFile>,
  replacesDocumentId: string | null,
): Promise<DocumentRecord> {
  const [row] = await tx
    .insert(document)
    .values({
      id: crypto.randomUUID(),
      productId,
      filename: file.filename,
      mimeType: file.mimeType,
      kind: file.kind,
      sizeBytes: file.content.byteLength,
      sha256: file.sha256,
      content: file.content,
      state: "pending",
      replacesDocumentId,
    })
    .returning(documentColumns);
  if (!row) throw new DocumentRequestError(400, "The file could not be saved");
  return toDocument(row);
}

export async function addPendingDocument(
  userId: string,
  productId: string,
  file: UploadedFile,
): Promise<DocumentRecord> {
  const checked = checkedFile(file);
  return db.transaction(async (tx) => {
    await lockOwnedProduct(tx, userId, productId);
    const rows = await loadDocuments(tx, productId);
    assertWithinLimits(projectedCounts(rows, { kind: checked.kind, replacesDocumentId: null }));
    return insertPending(tx, productId, checked, null);
  });
}

/** Active and pending documents for the product. Inactive rows stay stored and are not listed. */
export async function listDocuments(userId: string, productId: string): Promise<DocumentRecord[]> {
  const owned = await getProduct(userId, productId);
  if (!owned) throw new DocumentRequestError(404, "Product not found");
  const rows = await db
    .select(documentColumns)
    .from(document)
    .where(and(eq(document.productId, productId), inArray(document.state, ["pending", "active"])))
    .orderBy(asc(document.createdAt));
  return rows.map(toDocument);
}

export async function replaceDocument(
  userId: string,
  productId: string,
  documentId: string,
  file: UploadedFile,
): Promise<DocumentRecord> {
  const checked = checkedFile(file);
  return db.transaction(async (tx) => {
    await lockOwnedProduct(tx, userId, productId);
    const rows = await loadDocuments(tx, productId);
    const target = rows.find((row) => row.id === documentId);
    if (!target) throw new DocumentRequestError(404, "Document not found");
    if (target.state !== "active") {
      throw new DocumentRequestError(400, "Only an active document can be replaced");
    }

    const earlier = rows.filter(
      (row) => row.state === "pending" && row.replacesDocumentId === documentId,
    );
    if (earlier.length > 0) {
      await tx
        .update(document)
        .set({ state: "inactive" })
        .where(
          inArray(
            document.id,
            earlier.map((row) => row.id),
          ),
        );
      for (const row of earlier) row.state = "inactive";
    }

    assertWithinLimits(
      projectedCounts(rows, { kind: checked.kind, replacesDocumentId: documentId }),
    );
    return insertPending(tx, productId, checked, documentId);
  });
}

/** Pending becomes active, and any document it replaces becomes inactive, in one transaction. */
export async function finaliseDocuments(
  userId: string,
  productId: string,
): Promise<DocumentRecord[]> {
  return db.transaction(async (tx) => {
    await lockOwnedProduct(tx, userId, productId);
    const rows = await loadDocuments(tx, productId);
    const pending = rows.filter((row) => row.state === "pending");
    const replacedIds = pending.flatMap((row) =>
      row.replacesDocumentId ? [row.replacesDocumentId] : [],
    );

    if (pending.length > 0) {
      await tx
        .update(document)
        .set({ state: "active" })
        .where(and(eq(document.productId, productId), eq(document.state, "pending")));
    }
    if (replacedIds.length > 0) {
      await tx
        .update(document)
        .set({ state: "inactive" })
        .where(and(eq(document.productId, productId), inArray(document.id, replacedIds)));
    }

    const active = await loadDocuments(tx, productId);
    const visible = active.filter((row) => row.state === "active");
    assertWithinLimits(projectedCounts(visible));
    return visible;
  });
}
