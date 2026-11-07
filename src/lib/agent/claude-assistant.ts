import Anthropic from "@anthropic-ai/sdk";
import type { Content, FunctionDeclaration, Part, Schema } from "@google/genai";

import { env, requireEnv } from "@/env";
import type { GeminiRequest, GeminiResponse } from "@/lib/assessment/gemini";

/**
 * The assistant's Claude call. The conversation stays in the Gemini `Content`
 * shape the loop already keeps, so a turn can move between the two models:
 * this file turns that history into Claude messages and the answer back into
 * a `GeminiResponse`. Function-call ids are kept (or made) so each tool result
 * pairs with its call.
 */

const DEFAULT_MODEL = "claude-haiku-5-5";
const MAX_TOKENS = 4_000;
const TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;

type JsonSchema = Record<string, unknown>;

/** Gemini declares types in upper case (OBJECT, STRING); JSON Schema wants lower case. */
function toJsonSchema(schema: Schema | undefined): JsonSchema {
  if (!schema) return { type: "object", properties: {} };
  const out: JsonSchema = {};
  if (schema.type) out.type = String(schema.type).toLowerCase();
  if (schema.description) out.description = schema.description;
  if (schema.enum) out.enum = schema.enum;
  if (schema.required) out.required = schema.required;
  if (schema.properties) {
    out.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, value]) => [key, toJsonSchema(value)]),
    );
  }
  if (schema.items) out.items = toJsonSchema(schema.items);
  return out;
}

function toolsFrom(tools: unknown): Anthropic.Tool[] {
  const lists = Array.isArray(tools) ? tools : [];
  return lists.flatMap((entry: { functionDeclarations?: FunctionDeclaration[] }) =>
    (entry.functionDeclarations ?? []).map((declaration) => ({
      name: declaration.name ?? "unknown",
      description: declaration.description ?? "",
      input_schema: {
        ...toJsonSchema(declaration.parameters as Schema | undefined),
        type: "object" as const,
      },
    })),
  );
}

function messagesFrom(contents: string | Content[]): Anthropic.MessageParam[] {
  if (typeof contents === "string") return [{ role: "user", content: contents }];
  const messages: Anthropic.MessageParam[] = [];
  const ids = new Map<string, string[]>();
  for (const turn of contents) {
    const blocks: Anthropic.ContentBlockParam[] = [];
    for (const part of turn.parts ?? []) {
      if (part.text) blocks.push({ type: "text", text: part.text });
      if (part.functionCall) {
        const name = part.functionCall.name ?? "unknown";
        const id = part.functionCall.id ?? `call_${crypto.randomUUID().replaceAll("-", "")}`;
        ids.set(name, [...(ids.get(name) ?? []), id]);
        blocks.push({ type: "tool_use", id, name, input: part.functionCall.args ?? {} });
      }
      if (part.functionResponse) {
        const name = part.functionResponse.name ?? "unknown";
        const id = part.functionResponse.id ?? ids.get(name)?.shift() ?? "unknown";
        blocks.push({
          type: "tool_result",
          tool_use_id: id,
          content: JSON.stringify(part.functionResponse.response ?? {}),
        });
      }
    }
    if (blocks.length === 0) continue;
    const role = turn.role === "model" ? "assistant" : "user";
    const last = messages.at(-1);
    if (last && last.role === role && Array.isArray(last.content)) {
      last.content.push(...blocks);
    } else {
      messages.push({ role, content: blocks });
    }
  }
  return messages;
}

export async function callClaudeAssistant(request: GeminiRequest): Promise<GeminiResponse> {
  const apiKey = requireEnv("ANTHROPIC_API_KEY");
  const workspaceId = env.ANTHROPIC_WORKSPACE_ID;
  const client = new Anthropic({
    apiKey,
    timeout: TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
    defaultHeaders: workspaceId ? { "anthropic-workspace-id": workspaceId } : undefined,
  });
  const tools = toolsFrom(request.tools);

  const message = await client.messages.create({
    model: env.ANTHROPIC_MODEL ?? DEFAULT_MODEL,
    max_tokens: MAX_TOKENS,
    system: request.systemInstruction,
    messages: messagesFrom(request.contents),
    ...(tools.length > 0 ? { tools } : {}),
  });

  if (message.stop_reason === "refusal") throw new Error("Claude declined the request.");

  const parts: Part[] = [];
  let text = "";
  const functionCalls: NonNullable<GeminiResponse["functionCalls"]> = [];
  for (const block of message.content) {
    if (block.type === "text") {
      text += block.text;
      parts.push({ text: block.text });
    } else if (block.type === "tool_use") {
      const call = {
        id: block.id,
        name: block.name,
        args: (block.input ?? {}) as Record<string, unknown>,
      };
      functionCalls.push(call);
      parts.push({ functionCall: call });
    }
  }
  if (parts.length === 0) throw new Error("Claude returned no text or tool call.");
  return { text, content: { role: "model", parts }, functionCalls };
}
