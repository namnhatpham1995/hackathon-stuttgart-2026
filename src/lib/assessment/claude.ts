import Anthropic from "@anthropic-ai/sdk";

import { env, requireEnv } from "@/env";

/**
 * Claude call for fact extraction. The answer is constrained to `schema` by structured
 * outputs and returned as the JSON text, so the caller still validates it with Zod.
 *
 * The SDK retries rate limits, overloads, 5xx and network errors itself (3 retries with
 * backoff). The request streams so a long answer cannot hit an HTTP timeout.
 */
export type ClaudeRequest = {
  system: string;
  content: string;
  /** JSON Schema for the answer. Objects need `additionalProperties: false`. */
  schema: Record<string, unknown>;
};

export type ClaudeResponse = {
  text: string;
};

const DEFAULT_MODEL = "claude-haiku-5-5";
const MAX_TOKENS = 32_000;
const TIMEOUT_MS = 5 * 60_000;
const MAX_RETRIES = 3;

export async function callClaude(request: ClaudeRequest): Promise<ClaudeResponse> {
  const apiKey = requireEnv("ANTHROPIC_API_KEY");
  // A key that is not scoped to a workspace must name one on every request.
  const workspaceId = env.ANTHROPIC_WORKSPACE_ID;
  const client = new Anthropic({
    apiKey,
    timeout: TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
    defaultHeaders: workspaceId ? { "anthropic-workspace-id": workspaceId } : undefined,
  });

  const message = await client.messages
    .stream({
      model: env.ANTHROPIC_MODEL ?? DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      system: request.system,
      messages: [{ role: "user", content: request.content }],
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: request.schema },
      },
    })
    .finalMessage();

  if (message.stop_reason === "refusal") {
    throw new Error("Claude declined the fact extraction request.");
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error("Claude fact extraction stopped at the output limit before finishing.");
  }

  const text = message.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("");
  return { text };
}
