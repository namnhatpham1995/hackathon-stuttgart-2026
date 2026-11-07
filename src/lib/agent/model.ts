import { env } from "@/env";
import { callGemini, type GeminiRequest, type GeminiResponse } from "@/lib/assessment/gemini";

import { callClaudeAssistant } from "./claude-assistant";

/**
 * One model call for the assistant. Claude answers when `ANTHROPIC_API_KEY` is
 * set; if that call fails, Gemini answers the same request. Without the key it
 * is Gemini alone, so a deployment that only has Gemini behaves as before.
 */
export async function callAssistantModel(request: GeminiRequest): Promise<GeminiResponse> {
  if (!env.ANTHROPIC_API_KEY) return callGemini(request);
  try {
    return await callClaudeAssistant(request);
  } catch (error) {
    console.error(
      "Assistant: Claude failed, using Gemini.",
      error instanceof Error ? error.message : error,
    );
    return callGemini(request);
  }
}
