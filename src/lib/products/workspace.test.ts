import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { expect, test, vi } from "vitest";

vi.mock("@/lib/assessment/gemini", () => ({
  callGemini: vi.fn(),
  GeminiCallError: class extends Error {},
}));

const { context } = vi.hoisted(() => ({ context: { headers: new Headers() } }));
vi.mock("next/headers", () => ({ headers: async () => context.headers }));

import {
  createProduct,
  finaliseWorkspaceDocuments,
  readWorkspace,
  saveWorkspaceDraft,
  undoWorkspaceUpload,
} from "@/app/workspace/actions";
import { POST as upload } from "@/app/api/products/[productId]/documents/route";
import { POST as assistant } from "@/app/api/assistant/route";
import { callGemini } from "@/lib/assessment/gemini";
import { db } from "@/db/client";
import { assessmentJob, assessmentResult } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getProduct } from "./service";
import { loadWorkspaceProduct } from "./workspace";
import { startAssessment } from "@/lib/jobs/service";
import { setProductListed } from "@/lib/connections/service";

async function owner() {
  const email = `workspace-${crypto.randomUUID()}@example.com`;
  const password = "workspace-test-password";
  const signedUp = await auth.api.signUpEmail({
    body: { name: "Workspace owner", email, password },
  });
  const signedIn = await auth.api.signInEmail({ body: { email, password }, asResponse: true });
  context.headers = new Headers({
    cookie: signedIn.headers
      .getSetCookie()
      .map((cookie) => cookie.split(";")[0])
      .join("; "),
  });
  return signedUp.user.id;
}

async function create() {
  const result = await createProduct({
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
  });
  if (!result.ok) throw new Error("Creation failed");
  return result.product;
}

async function add(productId: string, replacing?: string) {
  const file = await readFile("fixtures/exportready/03_CAP104_Inspection_RevA.pdf");
  const body = new FormData();
  body.set("file", new File([file], "03_CAP104_Inspection_RevA.pdf", { type: "application/pdf" }));
  if (replacing) body.set("replacesDocumentId", replacing);
  const response = await upload(
    new Request("http://localhost/api/products/upload/documents", {
      method: "POST",
      headers: context.headers,
      body,
    }),
    { params: Promise.resolve({ productId }) },
  );
  expect(response.status).toBe(201);
  return response.json() as Promise<{ id: string }>;
}

test("a UI-created product, draft and report use owned database state", async () => {
  const userId = await owner();
  const created = await create();
  expect(created.stored).toBe(true);
  const stored = await getProduct(userId, created.id);
  expect(stored?.fields.partNumber).toEqual({ value: "CAP-104", origin: "user" });
  expect(stored?.profile).toMatchObject({
    companyName: "Lotus Mould Co., Ltd.",
    capabilities: ["Injection moulding"],
  });
  const saved = await saveWorkspaceDraft(created.id, {
    name: "Updated cap",
    supplierName: "Lotus Mould Co., Ltd.",
    partNumber: "CAP-104",
    revision: "B",
    material: "ABS",
    packaging: "PKG-08",
  });
  expect(saved.ok).toBe(true);
  expect((await getProduct(userId, created.id))?.fields.packaging).toEqual({
    value: "PKG-08",
    origin: "user",
  });
  const document = await add(created.id);
  await finaliseWorkspaceDocuments(created.id);
  const job = await startAssessment(userId, created.id);
  const resultId = crypto.randomUUID();
  await db
    .insert(assessmentResult)
    .values({
      id: resultId,
      jobId: job.id,
      productId: created.id,
      assessmentDate: "2026-11-07",
      complete: true,
      documents: [
        { id: document.id, filename: "03_CAP104_Inspection_RevA.pdf", sha256: "fixture-hash" },
      ],
      findings: [
        {
          requirementId: "R3",
          status: "MISMATCH",
          evidenceType: "inspection_report",
          observed: { revision: "A" },
          citations: [
            {
              documentId: document.id,
              filename: "03_CAP104_Inspection_RevA.pdf",
              page: 1,
              quote: "Drawing revision: A.",
            },
          ],
          reason: "Revision A does not match B.",
          nextAction: "Provide revision B.",
        },
      ],
    });
  await db
    .update(assessmentJob)
    .set({ status: "COMPLETED", resultId })
    .where(eq(assessmentJob.id, job.id));
  const workspace = await readWorkspace(created.id);
  expect(workspace?.result?.id).toBe(resultId);
  expect(workspace?.result?.findings[0]).toMatchObject({
    requirementId: "R3",
    status: "MISMATCH",
    evidenceType: "inspection report",
    evidence: [
      {
        documentId: document.id,
        filename: "03_CAP104_Inspection_RevA.pdf",
        page: 1,
        quote: "Drawing revision: A.",
      },
    ],
  });
  expect(workspace?.job).toBeNull();
  vi.mocked(callGemini)
    .mockResolvedValueOnce({
      text: "",
      functionCalls: [{ name: "get_assessment_status", args: {} }],
      content: {
        role: "model",
        parts: [{ functionCall: { name: "get_assessment_status", args: {} } }],
      },
    })
    .mockResolvedValueOnce({
      text: "The inspection report says Drawing revision: A. Provide revision B.",
      functionCalls: [],
      content: {
        role: "model",
        parts: [{ text: "The inspection report says Drawing revision: A. Provide revision B." }],
      },
    });
  const reply = await assistant(
    new Request("http://localhost/api/assistant", {
      method: "POST",
      headers: new Headers({
        ...Object.fromEntries(context.headers),
        "content-type": "application/json",
      }),
      body: JSON.stringify({
        page: { path: `/workspace/${created.id}`, productId: created.id },
        messages: [{ role: "user", text: "Why did R3 fail?" }],
      }),
    }),
  );
  expect(reply.status).toBe(200);
  const modelInput = vi.mocked(callGemini).mock.calls[1]?.[0];
  expect(JSON.stringify(modelInput?.contents)).toContain("Drawing revision: A.");
  expect(JSON.stringify(modelInput?.contents)).toContain(document.id);
  expect((await reply.json()).reply).toContain("revision B");
  const otherId = await owner();
  expect(await loadWorkspaceProduct(otherId, created.id)).toBeNull();
});

test("Undo discards a pending replacement and retains its active predecessor", async () => {
  await owner();
  const created = await create();
  const original = await add(created.id);
  await finaliseWorkspaceDocuments(created.id);
  const replacement = await add(created.id, original.id);
  await undoWorkspaceUpload(created.id, replacement.id);
  await undoWorkspaceUpload(created.id, replacement.id);
  expect(
    (await readWorkspace(created.id))?.documents.map((document) => ({
      id: document.id,
      state: document.state,
    })),
  ).toEqual([{ id: original.id, state: "active" }]);
  await expect(undoWorkspaceUpload(created.id, original.id)).rejects.toMatchObject({
    status: 400,
    message: "Only a pending upload can be undone",
  });
});

test("a new product is unlisted and the owner can list it", async () => {
  const userId = await owner();
  const created = await create();
  expect(created.listed).toBe(false);
  expect((await readWorkspace(created.id))?.listed).toBe(false);
  await setProductListed(userId, created.id, true);
  expect((await readWorkspace(created.id))?.listed).toBe(true);
});
