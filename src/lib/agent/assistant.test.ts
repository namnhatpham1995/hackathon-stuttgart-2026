import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/lib/assessment/gemini", () => {
  class GeminiCallError extends Error {
    readonly attempts: number;

    constructor(message: string, options: { attempts: number; cause?: unknown }) {
      super(message, options.cause === undefined ? undefined : { cause: options.cause });
      this.name = "GeminiCallError";
      this.attempts = options.attempts;
    }
  }

  return { callGemini: vi.fn(), GeminiCallError };
});

import { POST } from "@/app/api/assistant/route";
import { agentToolNames, agentTools } from "@/lib/agent/tools";
import type { GeminiResponse } from "@/lib/assessment/gemini";
import { callGemini, GeminiCallError } from "@/lib/assessment/gemini";
import { auth } from "@/lib/auth";
import { createProduct } from "@/lib/products/service";

const password = "correct-horse-1";

async function createUser(name: string) {
  const email = `${name.toLowerCase()}-${crypto.randomUUID()}@example.com`;
  const result = await auth.api.signUpEmail({ body: { name, email, password } });
  return { id: result.user.id, email };
}

async function sessionCookie(email: string) {
  const response = await auth.api.signInEmail({
    body: { email, password },
    asResponse: true,
  });
  const parts = response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]);
  if (parts.length === 0) throw new Error("sign-in did not set a session cookie");
  return parts.join("; ");
}

async function ownedProduct(userId: string, name: string) {
  return createProduct(userId, {
    name,
    requirementSetKey: "neckar-cap-104",
    requirementSetVersion: 1,
  });
}

function turn(productId: string | undefined, text: string, path = "/workspace/p") {
  return {
    page: { path, ...(productId ? { productId } : {}) },
    messages: [{ role: "user" as const, text }],
  };
}

async function post(email: string, body: unknown) {
  return POST(
    new Request("http://localhost/api/assistant", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: await sessionCookie(email),
      },
      body: JSON.stringify(body),
    }),
  );
}

function toolCall(name: string, args: Record<string, unknown>, id: string): GeminiResponse {
  return {
    text: "",
    functionCalls: [{ name, args, id }],
    content: {
      role: "model",
      parts: [{ functionCall: { name, args, id } }],
    },
  };
}

beforeEach(() => {
  vi.mocked(callGemini).mockReset();
});

describe("workspace assistant", () => {
  test("only the approved actions are declared", () => {
    expect(agentToolNames).toEqual([
      "get_workflow_state",
      "navigate_workspace",
      "update_product_draft",
      "show_upload_card",
      "start_assessment",
      "get_assessment_status",
      "show_report",
      "request_replacement",
      "navigate_site",
      "list_products",
      "search_catalog",
      "list_my_requests",
      "list_board",
      "read_inbox",
      "close_request",
      "list_product_connections",
      "request_evidence",
      "create_board_request",
      "respond_to_request",
      "share_result",
    ]);
  });

  test("without a product the route answers and a product tool says to open one", async () => {
    const user = await createUser("Noproduct");
    vi.mocked(callGemini)
      .mockResolvedValueOnce(toolCall("get_workflow_state", {}, "c1"))
      .mockResolvedValueOnce({
        text: "",
        functionCalls: [],
        content: { role: "model", parts: [{ text: "" }] },
      });

    const response = await post(user.email, turn(undefined, "What is the state?", "/buyer"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.reply).toBe("Open a product first.");
    expect(body.directives).toEqual([]);
    const instruction = vi.mocked(callGemini).mock.calls[0]?.[0].systemInstruction;
    expect(instruction).toContain("The user is on the buyer's Overview.");
    expect(instruction).toContain("No product is open.");
  });

  test("navigate_site returns a directive for a listed route and rejects any other", async () => {
    const user = await createUser("Navigator");
    vi.mocked(callGemini)
      .mockResolvedValueOnce(toolCall("navigate_site", { route: "/connections/inbox" }, "c1"))
      .mockResolvedValueOnce(toolCall("navigate_site", { route: "https://evil.example/" }, "c2"))
      .mockResolvedValueOnce(toolCall("navigate_site", { route: "/workspace/other-id" }, "c3"))
      .mockResolvedValueOnce({
        text: "Done.",
        functionCalls: [],
        content: { role: "model", parts: [{ text: "Done." }] },
      });

    const response = await post(user.email, turn(undefined, "Open pages", "/dashboard"));

    const body = await response.json();
    expect(body.directives).toEqual([{ type: "navigate_site", route: "/connections/inbox" }]);
    const outputs = vi
      .mocked(callGemini)
      .mock.calls.slice(1)
      .map(([input]) => JSON.stringify(input.contents.at(-1)));
    expect(outputs[1]).toContain('"ok":false');
    expect(outputs[2]).toContain('"ok":false');
  });

  test("a page path outside the known routes is rejected", async () => {
    const user = await createUser("Badpath");
    const response = await post(user.email, turn(undefined, "Hi", "/admin/secret"));
    expect(response.status).toBe(400);
    expect(callGemini).not.toHaveBeenCalled();
  });

  test("a visitor without a session is asked to sign in", async () => {
    const response = await POST(
      new Request("http://localhost/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(turn("product-1", "Show the report")),
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Sign in required" });
    expect(callGemini).not.toHaveBeenCalled();
  });

  test("another user's product in the request is not found and the model is not called", async () => {
    const owner = await createUser("Ada");
    const other = await createUser("Bea");
    const foreign = await ownedProduct(other.id, "Bea Secret Cap");

    const response = await post(owner.email, turn(foreign.id, "Show the report"));

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "Not found" });
    expect(JSON.stringify(body)).not.toContain("Bea Secret Cap");
    expect(callGemini).not.toHaveBeenCalled();
  });

  test("a model-supplied foreign product id is not found", async () => {
    const owner = await createUser("Ada");
    const other = await createUser("Bea");
    const own = await ownedProduct(owner.id, "Ada Cover");
    const foreign = await ownedProduct(other.id, "Bea Secret Cap");
    const call: GeminiResponse = {
      text: "",
      functionCalls: [{ name: "show_report", id: "call-9", args: { productId: foreign.id } }],
      content: {
        role: "model",
        parts: [
          {
            thoughtSignature: "sig-keep",
            functionCall: {
              name: "show_report",
              id: "call-9",
              args: { productId: foreign.id },
            },
          },
        ],
      },
    };
    vi.mocked(callGemini)
      .mockResolvedValueOnce(call)
      .mockResolvedValueOnce({
        text: "Acknowledged.",
        functionCalls: [],
        content: { role: "model", parts: [{ text: "Acknowledged." }] },
      });

    const response = await post(owner.email, turn(own.id, "Show the report"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.directives).toEqual([]);
    expect(body.reply).toMatch(/could not open/i);
    expect(body.reply).toMatch(/not found/i);
    expect(body.reply).toContain("Acknowledged.");
    expect(JSON.stringify(body)).not.toContain("Bea Secret Cap");

    expect(callGemini).toHaveBeenCalledTimes(2);
    const first = vi.mocked(callGemini).mock.calls[0]?.[0];
    expect(first?.tools).toEqual(agentTools);
    expect(first?.systemInstruction).toContain(own.id);
    expect(first?.systemInstruction).not.toContain(foreign.id);

    const followUp = JSON.stringify(vi.mocked(callGemini).mock.calls[1]?.[0].contents);
    expect(followUp).toContain("sig-keep");
    expect(followUp).toContain("call-9");
    expect(followUp).toContain('"error":"not found"');
    expect(followUp).not.toContain("Bea Secret Cap");
  });

  test("tool calls stop after five rounds and the reply says what was done", async () => {
    const owner = await createUser("Ada");
    const own = await ownedProduct(owner.id, "Ada Cover");
    vi.mocked(callGemini).mockImplementation(async () =>
      toolCall("navigate_workspace", { view: "uploads" }, "nav"),
    );

    const response = await post(owner.email, turn(own.id, "Open uploads"));

    expect(response.status).toBe(200);
    expect(callGemini).toHaveBeenCalledTimes(5);
    const body = await response.json();
    expect(body.reply).toContain("Opened the uploads view.");
    expect(body.directives).toEqual([
      { type: "navigate", view: "uploads" },
      { type: "navigate", view: "uploads" },
      { type: "navigate", view: "uploads" },
      { type: "navigate", view: "uploads" },
      { type: "navigate", view: "uploads" },
    ]);
  });

  test("a model that answers is not called again", async () => {
    const owner = await createUser("Ada");
    const own = await ownedProduct(owner.id, "Ada Cover");
    vi.mocked(callGemini)
      .mockResolvedValueOnce(toolCall("navigate_workspace", { view: "product" }, "nav"))
      .mockResolvedValueOnce({
        text: "The product page is open.",
        functionCalls: [],
        content: { role: "model", parts: [{ text: "The product page is open." }] },
      });

    const response = await post(owner.email, turn(own.id, "Open the product"));

    expect(response.status).toBe(200);
    expect(callGemini).toHaveBeenCalledTimes(2);
    const body = await response.json();
    expect(body.directives).toEqual([{ type: "navigate", view: "product" }]);
    expect(body.reply).toContain("The product page is open.");
    expect(body.reply).not.toContain("Stopped after 5");
  });

  test("a model failure is explained with a recovery step", async () => {
    const owner = await createUser("Ada");
    const own = await ownedProduct(owner.id, "Ada Cover");
    vi.mocked(callGemini).mockRejectedValue(
      new GeminiCallError("Gemini call failed after 1 attempt: socket hang up", { attempts: 1 }),
    );

    const response = await post(owner.email, turn(own.id, "Show the report"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.directives).toEqual([]);
    expect(body.reply).toBe(
      "The assistant could not complete that. Try again in a moment, or use the buttons on the page.",
    );
    expect(JSON.stringify(body)).not.toContain("socket hang up");
  });
});
