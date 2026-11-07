export const documentMimeTypes = ["application/pdf", "image/jpeg", "image/png"] as const;
export type DocumentMimeType = (typeof documentMimeTypes)[number];

export const documentKinds = ["evidence", "photo"] as const;
export type DocumentKind = (typeof documentKinds)[number];

export const documentStates = ["pending", "active", "inactive"] as const;
export type DocumentState = (typeof documentStates)[number];

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

export async function addPendingDocument(
  userId: string,
  productId: string,
  file: UploadedFile,
): Promise<DocumentRecord> {
  void userId;
  void productId;
  void file;
  throw new Error("not implemented: addPendingDocument");
}

/** Active and pending documents for the product. Inactive rows stay stored and are not listed. */
export async function listDocuments(userId: string, productId: string): Promise<DocumentRecord[]> {
  void userId;
  void productId;
  throw new Error("not implemented: listDocuments");
}

export async function replaceDocument(
  userId: string,
  productId: string,
  documentId: string,
  file: UploadedFile,
): Promise<DocumentRecord> {
  void userId;
  void productId;
  void documentId;
  void file;
  throw new Error("not implemented: replaceDocument");
}

/** Pending becomes active, and any document it replaces becomes inactive, in one transaction. */
export async function finaliseDocuments(
  userId: string,
  productId: string,
): Promise<DocumentRecord[]> {
  void userId;
  void productId;
  throw new Error("not implemented: finaliseDocuments");
}
