import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  callGemini: vi.fn(),
  key: { value: "sk-test" as string | undefined },
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mocks.create };
  },
}));
vi.mock("@/lib/assessment/gemini", () => ({ callGemini: mocks.callGemini }));
vi.mock("@/env", () => ({
  env: {
    get ANTHROPIC_API_KEY() {
      return mocks.key.value;
    },
    ANTHROPIC_MODEL: undefined,
    ANTHROPIC_WORKSPACE_ID: undefined,
  },
  requireEnv: () => "sk-test",
}));

import { callAssistantModel } from "./model";

const geminiAnswer = {
  text: "from gemini",
  content: { role: "model", parts: [{ text: "from gemini" }] },
  functionCalls: [],
};
const tools = [
  {
    functionDeclarations: [
      {
        name: "list_products",
        description: "List.",
        parameters: { type: "OBJECT", properties: { q: { type: "STRING" } }, required: ["q"] },
      },
    ],
  },
];

beforeEach(() => {
  mocks.create.mockReset();
  mocks.callGemini.mockReset().mockResolvedValue(geminiAnswer);
  mocks.key.value = "sk-test";
});

test("without an Anthropic key Gemini answers and Claude is not called", async () => {
  mocks.key.value = undefined;
  const result = await callAssistantModel({ contents: [] });
  expect(result).toBe(geminiAnswer);
  expect(mocks.create).not.toHaveBeenCalled();
});

test("Claude answers with tools translated and tool calls returned with their ids", async () => {
  mocks.create.mockResolvedValue({
    stop_reason: "tool_use",
    content: [
      { type: "text", text: "Looking." },
      { type: "tool_use", id: "toolu_1", name: "list_products", input: { q: "cap" } },
    ],
  });

  const result = await callAssistantModel({
    systemInstruction: "sys",
    contents: [
      { role: "user", parts: [{ text: "hi" }] },
      { role: "model", parts: [{ functionCall: { name: "list_products", args: {} } }] },
      {
        role: "user",
        parts: [{ functionResponse: { name: "list_products", response: { ok: true } } }],
      },
    ],
    tools,
  });

  const sent = mocks.create.mock.calls[0]?.[0];
  expect(sent.system).toBe("sys");
  expect(sent.tools).toEqual([
    {
      name: "list_products",
      description: "List.",
      input_schema: {
        type: "object",
        properties: { q: { type: "string" } },
        required: ["q"],
      },
    },
  ]);
  const toolUse = sent.messages[1].content[0];
  const toolResult = sent.messages[2].content[0];
  expect(toolUse.type).toBe("tool_use");
  expect(toolResult).toMatchObject({ type: "tool_result", content: '{"ok":true}' });
  expect(toolResult.tool_use_id).toBe(toolUse.id);
  expect(result.functionCalls).toEqual([
    { id: "toolu_1", name: "list_products", args: { q: "cap" } },
  ]);
  expect(result.text).toBe("Looking.");
  expect(mocks.callGemini).not.toHaveBeenCalled();
});

test("a Claude failure falls back to Gemini with the same request", async () => {
  mocks.create.mockRejectedValue(new Error("overloaded"));
  vi.spyOn(console, "error").mockImplementation(() => {});
  const request = { contents: [{ role: "user", parts: [{ text: "hi" }] }] };

  const result = await callAssistantModel(request);

  expect(result).toBe(geminiAnswer);
  expect(mocks.callGemini).toHaveBeenCalledWith(request);
});
