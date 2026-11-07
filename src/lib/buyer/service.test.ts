import { eq } from "drizzle-orm";
import { expect, test } from "vitest";

import { db } from "@/db/client";
import {
  assessmentJob,
  assessmentResult,
  buyerRequest,
  product,
  requestConnection,
  user,
} from "@/db/schema";
import type { ProductFields, StoredSupplierProfile } from "@/lib/assessment/types";

import {
  closeMyRequest,
  getBuyerOverview,
  getCatalogProduct,
  listMyRequests,
  searchCatalog,
} from "./service";

const lotusProfile: StoredSupplierProfile = {
  companyName: "Lotus Mould Co., Ltd.",
  country: "Vietnam",
  productCategory: "Plastic components",
  capabilities: ["Injection moulding"],
  targetMarket: "Germany",
};

function email(local: string) {
  return `${local}-${crypto.randomUUID()}@buyers.example`;
}

async function createUser(name: string, address: string) {
  const id = crypto.randomUUID();
  await db.insert(user).values({ id, name, email: address, emailVerified: false });
  return { id, email: address };
}

async function createProduct(input: {
  ownerId: string;
  name: string;
  partNumber: string;
  listed: boolean;
  profile?: StoredSupplierProfile;
}) {
  const id = crypto.randomUUID();
  const fields: ProductFields = { partNumber: { value: input.partNumber, origin: "user" } };
  await db.insert(product).values({
    id,
    userId: input.ownerId,
    requirementSetKey: "neckar-cap-104",
    requirementSetVersion: 1,
    name: input.name,
    fields,
    profile: input.profile ?? {},
    listed: input.listed,
  });
  return id;
}

async function storeResult(productId: string, filename: string) {
  const jobId = crypto.randomUUID();
  const resultId = crypto.randomUUID();
  await db.insert(assessmentJob).values({
    id: jobId,
    productId,
    requirementSetKey: "neckar-cap-104",
    requirementSetVersion: 1,
    documentSetHash: crypto.randomUUID(),
    documentIds: [],
    status: "QUEUED",
  });
  await db.insert(assessmentResult).values({
    id: resultId,
    jobId,
    productId,
    assessmentDate: "2026-11-07",
    complete: false,
    findings: [],
    documents: [{ id: crypto.randomUUID(), filename, sha256: "abc123secretsha" }],
  });
  return resultId;
}

async function createRequest(input: {
  buyerId: string;
  title: string;
  partNumber: string;
  status: "open" | "closed";
  createdAt: Date;
  org?: string;
}) {
  const id = crypto.randomUUID();
  await db.insert(buyerRequest).values({
    id,
    buyerUserId: input.buyerId,
    buyerOrgName: input.org ?? "Neckar Maschinenbau GmbH",
    title: input.title,
    partNumber: input.partNumber,
    requirementSetKey: "neckar-cap-104",
    requirementSetVersion: 1,
    visibility: "open",
    status: input.status,
    createdAt: input.createdAt,
  });
  return id;
}

async function connect(input: {
  requestId: string;
  productId: string;
  status: "requested" | "in_progress" | "shared" | "declined";
  initiatedBy: "buyer" | "supplier";
  sharedResultId?: string;
  updatedAt: Date;
}) {
  const id = crypto.randomUUID();
  await db.insert(requestConnection).values({
    id,
    requestId: input.requestId,
    productId: input.productId,
    initiatedBy: input.initiatedBy,
    status: input.status,
    sharedResultId: input.sharedResultId,
    updatedAt: input.updatedAt,
  });
  return id;
}

function expectNoSecrets(value: unknown, secrets: string[]) {
  const serialised = JSON.stringify(value);
  for (const secret of secrets) expect(serialised).not.toContain(secret);
  return serialised;
}

test("a second buyer's requests and connections never appear", async () => {
  const neckarEmail = email("neckar");
  const otherEmail = email("other");
  const lotusEmail = email("lotus");
  const neckar = await createUser("Neckar", neckarEmail);
  const other = await createUser("Other buyer", otherEmail);
  const lotus = await createUser("Lotus", lotusEmail);

  const cover = await createProduct({
    ownerId: lotus.id,
    name: "Cover cap",
    partNumber: "CAP-104",
    listed: true,
    profile: lotusProfile,
  });
  const clip = await createProduct({
    ownerId: lotus.id,
    name: "Clip",
    partNumber: "CLP-1",
    listed: true,
    profile: lotusProfile,
  });
  const bracket = await createProduct({
    ownerId: lotus.id,
    name: "Bracket",
    partNumber: "BRK-2",
    listed: true,
    profile: { ...lotusProfile, companyName: "Other Works GmbH" },
  });
  const washer = await createProduct({
    ownerId: lotus.id,
    name: "Washer",
    partNumber: "WSH-3",
    listed: false,
    profile: {},
  });

  const sharedResultId = await storeResult(cover, "secret-drawing.pdf");
  const hiddenResultId = await storeResult(clip, "secret-drawing.pdf");
  const foreignResultId = await storeResult(cover, "secret-drawing.pdf");

  const newest = await createRequest({
    buyerId: neckar.id,
    title: "Cover cap CAP-104 rev B",
    partNumber: "CAP-104",
    status: "open",
    createdAt: new Date("2026-11-07T12:00:00Z"),
  });
  const middle = await createRequest({
    buyerId: neckar.id,
    title: "Spare bracket",
    partNumber: "BRK-2",
    status: "open",
    createdAt: new Date("2026-11-06T12:00:00Z"),
  });
  const oldest = await createRequest({
    buyerId: neckar.id,
    title: "Old washer",
    partNumber: "WSH-3",
    status: "closed",
    createdAt: new Date("2026-11-05T12:00:00Z"),
  });
  const foreign = await createRequest({
    buyerId: other.id,
    title: "Foreign pump housing",
    partNumber: "PMP-9",
    status: "open",
    createdAt: new Date("2026-11-08T12:00:00Z"),
    org: "Other Buyer AG",
  });

  const sharedConnection = await connect({
    requestId: newest,
    productId: cover,
    status: "shared",
    initiatedBy: "supplier",
    sharedResultId,
    updatedAt: new Date("2026-11-07T11:00:00Z"),
  });
  const hiddenConnection = await connect({
    requestId: newest,
    productId: clip,
    status: "requested",
    initiatedBy: "buyer",
    sharedResultId: hiddenResultId,
    updatedAt: new Date("2026-11-07T09:00:00Z"),
  });
  await connect({
    requestId: middle,
    productId: bracket,
    status: "in_progress",
    initiatedBy: "supplier",
    updatedAt: new Date("2026-11-06T09:00:00Z"),
  });
  await connect({
    requestId: oldest,
    productId: washer,
    status: "declined",
    initiatedBy: "buyer",
    updatedAt: new Date("2026-11-05T09:00:00Z"),
  });
  const foreignConnection = await connect({
    requestId: foreign,
    productId: cover,
    status: "shared",
    initiatedBy: "supplier",
    sharedResultId: foreignResultId,
    updatedAt: new Date("2026-11-08T09:00:00Z"),
  });

  const [storedHidden] = await db
    .select({
      status: requestConnection.status,
      sharedResultId: requestConnection.sharedResultId,
    })
    .from(requestConnection)
    .where(eq(requestConnection.id, hiddenConnection));
  expect(storedHidden).toEqual({ status: "requested", sharedResultId: hiddenResultId });

  const requests = await listMyRequests(neckar.id);
  const serialised = expectNoSecrets(requests, [
    neckarEmail,
    otherEmail,
    lotusEmail,
    "secret-drawing.pdf",
    hiddenResultId,
    foreignResultId,
    foreign,
    foreignConnection,
    "Foreign pump housing",
    "Other Buyer AG",
  ]);
  expect(serialised).toContain("Cover cap CAP-104 rev B");
  expect(requests.map((request) => request.title)).toEqual([
    "Cover cap CAP-104 rev B",
    "Spare bracket",
    "Old washer",
  ]);

  const capRequest = requests[0];
  expect(capRequest?.requestId).toBe(newest);
  expect(capRequest?.connections.map((connection) => connection.connectionId)).toEqual([
    sharedConnection,
    hiddenConnection,
  ]);
  expect(capRequest?.connections[0]).toMatchObject({
    productName: "Cover cap",
    partNumber: "CAP-104",
    supplierCompany: "Lotus Mould Co., Ltd.",
    initiatedBy: "supplier",
    status: "shared",
    sharedResultId,
  });
  expect(capRequest?.connections[1]).toMatchObject({
    productName: "Clip",
    status: "requested",
    sharedResultId: null,
  });
  expect(requests[2]?.connections[0]).toMatchObject({
    productName: "Washer",
    supplierCompany: null,
    status: "declined",
    sharedResultId: null,
  });

  expect(await getBuyerOverview(neckar.id)).toEqual({
    openRequests: 2,
    connectedSuppliers: 4,
    sharedReports: 1,
  });

  const others = await listMyRequests(other.id);
  expect(others.map((request) => request.requestId)).toEqual([foreign]);
  expect(JSON.stringify(others)).not.toContain(newest);
  expect(JSON.stringify(others)).not.toContain("Cover cap CAP-104 rev B");
});

test("unlisted and own products stay out of the catalog", async () => {
  const buyerEmail = email("catalog-buyer");
  const otherEmail = email("catalog-other");
  const supplierEmail = email("catalog-supplier");
  const buyer = await createUser("Catalog buyer", buyerEmail);
  const other = await createUser("Catalog other", otherEmail);
  const supplier = await createUser("Catalog supplier", supplierEmail);

  const cover = await createProduct({
    ownerId: supplier.id,
    name: "Cover cap",
    partNumber: "CAP-104",
    listed: true,
    profile: lotusProfile,
  });
  const hidden = await createProduct({
    ownerId: supplier.id,
    name: "Hidden jig",
    partNumber: "CAP-104",
    listed: false,
    profile: lotusProfile,
  });
  const own = await createProduct({
    ownerId: buyer.id,
    name: "Own housing",
    partNumber: "CAP-104",
    listed: true,
    profile: {
      companyName: "Neckar Maschinenbau GmbH",
      country: "Germany",
      productCategory: "Machinery",
      capabilities: ["Assembly"],
      targetMarket: "Germany",
    },
  });
  const bracket = await createProduct({
    ownerId: supplier.id,
    name: "Bracket",
    partNumber: "BRK-2",
    listed: true,
    profile: {
      companyName: "Other Works GmbH",
      country: "Germany",
      productCategory: "Metal",
      capabilities: ["Stamping"],
      targetMarket: "Germany",
    },
  });

  const buyerConnection = await connect({
    requestId: await createRequest({
      buyerId: buyer.id,
      title: "Need a cover cap",
      partNumber: "CAP-104",
      status: "open",
      createdAt: new Date("2026-11-07T08:00:00Z"),
    }),
    productId: cover,
    status: "requested",
    initiatedBy: "buyer",
    updatedAt: new Date("2026-11-07T08:00:00Z"),
  });
  const newerForeign = await connect({
    requestId: await createRequest({
      buyerId: other.id,
      title: "Foreign catalog request",
      partNumber: "CAP-104",
      status: "open",
      createdAt: new Date("2026-11-07T18:00:00Z"),
      org: "Other Buyer AG",
    }),
    productId: cover,
    status: "shared",
    initiatedBy: "supplier",
    sharedResultId: await storeResult(cover, "secret-drawing.pdf"),
    updatedAt: new Date("2026-11-07T18:00:00Z"),
  });

  const byPart = await searchCatalog(buyer.id, { q: "cap-104" });
  expect(byPart.map((item) => item.productId)).toContain(cover);
  expect(byPart.map((item) => item.productId)).not.toContain(hidden);
  expect(byPart.map((item) => item.productId)).not.toContain(own);
  expect(byPart.map((item) => item.productId)).not.toContain(bracket);

  const byCompany = await searchCatalog(buyer.id, { q: "lotus mould" });
  expect(byCompany.map((item) => item.productId)).toContain(cover);
  expect(byCompany.map((item) => item.productId)).not.toContain(bracket);

  const byName = await searchCatalog(buyer.id, { q: "BRACKET" });
  expect(byName.map((item) => item.productId)).toContain(bracket);
  expect(byName.map((item) => item.productId)).not.toContain(cover);

  const plastics = await searchCatalog(buyer.id, { productCategory: "Plastic components" });
  expect(plastics.map((item) => item.productId)).toContain(cover);
  expect(plastics.map((item) => item.productId)).not.toContain(bracket);
  const wrongCase = await searchCatalog(buyer.id, { productCategory: "plastic components" });
  expect(wrongCase.map((item) => item.productId)).not.toContain(cover);

  const germany = await searchCatalog(buyer.id, { country: "Germany" });
  expect(germany.map((item) => item.productId)).toContain(bracket);
  expect(germany.map((item) => item.productId)).not.toContain(cover);
  expect(germany.map((item) => item.productId)).not.toContain(own);

  expect(await getCatalogProduct(buyer.id, hidden)).toBeNull();
  expect(await getCatalogProduct(buyer.id, own)).toBeNull();
  expect(await getCatalogProduct(buyer.id, crypto.randomUUID())).toBeNull();
  const listed = await getCatalogProduct(buyer.id, cover);
  expect(listed).toEqual({
    productId: cover,
    productName: "Cover cap",
    partNumber: "CAP-104",
    profile: lotusProfile,
    myConnection: { connectionId: buyerConnection, status: "requested" },
  });
  expect(listed?.myConnection?.connectionId).not.toBe(newerForeign);

  const serialised = expectNoSecrets({ byPart, byCompany, byName, plastics, germany, listed }, [
    buyerEmail,
    otherEmail,
    supplierEmail,
    "secret-drawing.pdf",
    newerForeign,
  ]);
  expect(serialised).toContain("Lotus Mould Co., Ltd.");
});

test("buyer results contain no account email or document", async () => {
  const buyerEmail = email("serial-buyer");
  const supplierEmail = email("serial-supplier");
  const buyer = await createUser("Serial buyer", buyerEmail);
  const supplier = await createUser("Serial supplier", supplierEmail);
  const cover = await createProduct({
    ownerId: supplier.id,
    name: "Cover cap",
    partNumber: "CAP-104",
    listed: true,
    profile: lotusProfile,
  });
  const resultId = await storeResult(cover, "secret-drawing.pdf");
  const requestId = await createRequest({
    buyerId: buyer.id,
    title: "Cover cap CAP-104 rev B",
    partNumber: "CAP-104",
    status: "open",
    createdAt: new Date("2026-11-07T12:00:00Z"),
  });
  await connect({
    requestId,
    productId: cover,
    status: "shared",
    initiatedBy: "supplier",
    sharedResultId: resultId,
    updatedAt: new Date("2026-11-07T12:00:00Z"),
  });

  const requests = await listMyRequests(buyer.id);
  const overview = await getBuyerOverview(buyer.id);
  const catalog = await searchCatalog(buyer.id, { q: "CAP-104" });
  const one = await getCatalogProduct(buyer.id, cover);
  const closed = await closeMyRequest(buyer.id, requestId);

  const serialised = expectNoSecrets({ requests, overview, catalog, one, closed }, [
    buyerEmail,
    supplierEmail,
    "secret-drawing.pdf",
    "abc123secretsha",
  ]);
  expect(serialised).toContain(resultId);
  expect(serialised).toContain("Cover cap");
  expect(closed).toBe(true);
});

test("closing a request updates only the caller's open request", async () => {
  const buyer = await createUser("Closer", email("closer"));
  const other = await createUser("Other closer", email("other-closer"));
  const ownOpen = await createRequest({
    buyerId: buyer.id,
    title: "Open cap request",
    partNumber: "CAP-104",
    status: "open",
    createdAt: new Date("2026-11-07T12:00:00Z"),
  });
  const staysOpen = await createRequest({
    buyerId: buyer.id,
    title: "Leave this open",
    partNumber: "CAP-105",
    status: "open",
    createdAt: new Date("2026-11-06T12:00:00Z"),
  });
  const foreign = await createRequest({
    buyerId: other.id,
    title: "Foreign open request",
    partNumber: "CAP-106",
    status: "open",
    createdAt: new Date("2026-11-07T12:00:00Z"),
    org: "Other Buyer AG",
  });

  expect(await closeMyRequest(buyer.id, ownOpen)).toBe(true);
  expect(await closeMyRequest(buyer.id, ownOpen)).toBe(false);
  expect(await closeMyRequest(other.id, staysOpen)).toBe(false);
  expect(await closeMyRequest(buyer.id, foreign)).toBe(false);

  async function statusOf(id: string) {
    const [row] = await db
      .select({ status: buyerRequest.status })
      .from(buyerRequest)
      .where(eq(buyerRequest.id, id));
    return row?.status;
  }
  expect(await statusOf(ownOpen)).toBe("closed");
  expect(await statusOf(staysOpen)).toBe("open");
  expect(await statusOf(foreign)).toBe("open");

  const listed = await listMyRequests(buyer.id);
  expect(listed.find((request) => request.requestId === ownOpen)?.status).toBe("closed");
  expect(listed.find((request) => request.requestId === staysOpen)?.status).toBe("open");
  expect(listed.map((request) => request.requestId)).not.toContain(foreign);
});
