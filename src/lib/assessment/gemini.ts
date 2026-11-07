import type { Content, FunctionCall } from "@google/genai";

/**
 * Shared Gemini call. Fact extraction passes a string and `responseSchema`.
 * The assistant passes `tools`, then echoes `content` (function-call ids and
 * thought signatures included) on the next turn.
 */
export type GeminiRequest = {
  systemInstruction?: string;
  contents: string | Content[];
  temperature?: number;
  responseSchema?: unknown;
  /** Forwarded to the SDK. The assistant owns the tool declarations. */
  tools?: unknown;
};

export type GeminiResponse = {
  text: string;
  /** Model turn to send back unchanged as history. */
  content: Content;
  functionCalls: FunctionCall[];
};

export class GeminiCallError extends Error {
  readonly attempts: number;

  constructor(message: string, options: { attempts: number; cause?: unknown }) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "GeminiCallError";
    this.attempts = options.attempts;
  }
}

export async function callGemini(request: GeminiRequest): Promise<GeminiResponse> {
  void request;
  throw new GeminiCallError("not implemented: callGemini", { attempts: 0 });
}
