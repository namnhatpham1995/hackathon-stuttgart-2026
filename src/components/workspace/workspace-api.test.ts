import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { afterEach, expect, test, vi } from "vitest";

import { GET as getJobRoute } from "@/app/api/jobs/[jobId]/route";
import { POST as postJob } from "@/app/api/jobs/route";
import { POST as upload } from "@/app/api/products/[productId]/documents/route";
import { PATCH } from "@/app/api/products/[productId]/route";
import { POST } from "@/app/api/products/route";
import { db } from "@/db/client";
import { assessmentJob, document } from "@/db/schema";
import { auth } from "@/lib/auth";
import { finaliseDocuments } from "@/lib/documents/service";

import { fetchJob, JobPollError } from "./job-client";
import {
  createProductRequest,
  saveDraftRequest,
  startAssessmentRequest,
  uploadDocumentRequest,
} from "./workspace-api";

const password = "correct-horse-1";
let cookie = "";
const paths: string[] = [];

async function owner() {
  const email = `client-${crypto.randomUUID()}@example.com`;
  const signedUp = await auth.api.signUpEmail({
    body: { name: "Client", email, password },
  });
  const signedIn = await auth.api.signInEmail({ body: { email, password }, asResponse: true });
  cookie = signedIn.headers
    .getSetCookie()
    .map((item) => item.split(";")[0])
    .join("; ");
  return signedUp.user.id;
}

function installFetch() {
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(new URL(String(input), "http://localhost"), init);
    const headers = new Headers(request.headers);
    if (cookie) headers.set("cookie", cookie);
    const authed = new Request(request, { headers });
    const url = new URL(authed.url);
    paths.push(`${authed.method} ${url.pathname}`);
    if (url.pathname === "/api/products" && authed.method === "POST") return POST(authed);
    const productId = /^\/api\/products\/([^/]+)$/.exec(url.pathname)?.[1];
    if (productId && authed.method === "PATCH") {
      return PATCH(authed, {
        params: Promise.resolve({ productId: decodeURIComponent(productId) }),
      });
    }
    const documentProductId = /^\/api\/products\/([^/]+)\/documents$/.exec(url.pathname)?.[1];
    if (documentProductId && authed.method === "POST") {
      return upload(authed, {
        params: Promise.resolve({ productId: decodeURIComponent(documentProductId) }),
      });
    }
    if (url.pathname === "/api/jobs" && authed.method === "POST") return postJob(authed);
    const jobId = /^\/api\/jobs\/([^/]+)$/.exec(url.pathname)?.[1];
    if (jobId && authed.method === "GET") {
      return getJobRoute(authed, {
        params: Promise.resolve({ jobId: decodeURIComponent(jobId) }),
      });
    }
    return Response.json({ error: "Not found" }, { status: 404 });
  });
}

afterEach(() => {
  cookie = "";
  paths.length = 0;
  vi.unstubAllGlobals();
});

const draft = {
  name: "Cover cap",
  companyName: "Lotus Mould Co., Ltd.",
  country: "Vietnam",
  productCategory: "Plastic components",
  capabilities: "Injection moulding",
  targetMarket: "Germany",
  supplierName: "Lotus Mould Co., Ltd.",
  partNumber: "CAP-104",
  revision: "B",
  material: "ABS",
  packaging: "PKG-07",
};

test("the workspace client creates, uploads, replaces and starts a real job", async () => {
  const userId = await owner();
  installFetch();

  const created = await createProductRequest(draft);
  expect(created.stored).toBe(true);
  expect(created.profile.companyName).toBe("Lotus Mould Co., Ltd.");
  expect(paths).toContain("POST /api/products");

  const saved = await saveDraftRequest(created.id, { ...draft, packaging: "PKG-08" });
  expect(saved.fields.packaging).toEqual({ value: "PKG-08", origin: "user" });

  const bytes = await readFile("fixtures/exportready/03_CAP104_Inspection_RevA.pdf");
  const file = new File([bytes], "03_CAP104_Inspection_RevA.pdf", { type: "application/pdf" });
  const uploaded = await uploadDocumentRequest(created.id, file);
  expect(paths).toContain(`POST /api/products/${created.id}/documents`);
  const pending = await db.select().from(document).where(eq(document.productId, created.id));
  expect(pending).toHaveLength(1);
  expect(pending[0]?.state).toBe("pending");

  await finaliseDocuments(userId, created.id);
  const replacement = new File([bytes], "05_CAP104_Inspection_RevB.pdf", {
    type: "application/pdf",
  });
  const replaced = await uploadDocumentRequest(created.id, replacement, uploaded.id);
  const rows = await db.select().from(document).where(eq(document.id, replaced.id));
  expect(rows[0]?.replacesDocumentId).toBe(uploaded.id);
  expect(rows[0]?.state).toBe("pending");

  await finaliseDocuments(userId, created.id);
  const started = await startAssessmentRequest(created.id);
  expect(started.id.startsWith("demo-")).toBe(false);
  expect(paths).toContain("POST /api/jobs");
  expect(paths.some((path) => path.includes("/assess"))).toBe(false);
  const jobs = await db.select().from(assessmentJob).where(eq(assessmentJob.productId, created.id));
  expect(jobs.map((job) => job.id)).toEqual([started.id]);

  const viewed = await fetchJob(started.id);
  expect(viewed).toMatchObject({ id: started.id, status: "QUEUED", error: null, resultId: null });

  const missing = `demo-${crypto.randomUUID()}`;
  await expect(fetchJob(missing)).rejects.toBeInstanceOf(JobPollError);
  await expect(fetchJob(missing)).rejects.toThrow(/not found/i);
});
