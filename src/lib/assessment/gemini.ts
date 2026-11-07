import type { Content, FunctionCall, GenerateContentResponse, ToolListUnion } from "@google/genai";
import { ApiError, GoogleGenAI } from "@google/genai";

import { requireEnv } from "@/env";

/**
 * Shared Gemini call. Fact extraction passes a string and `responseSchema`.
 * The assistant passes `tools`, then echoes `content` (function-call ids and
 * thought signatures included) on the next turn.
 *
 * One call, then two retries with backoff, each limited to 60 seconds.
 * The SDK's own retries are turned off so a failure is not tried ten times.
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

const TIMEOUT_MS = 60_000;
/** The first call plus two retries. */
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [1_000, 2_000] as const;

const RETRYABLE_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ENOTFOUND",
  "EPIPE",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function httpStatus(error: unknown, depth = 0): number | undefined {
  if (depth > 5 || error == null || typeof error !== "object") return undefined;
  if (error instanceof ApiError) return error.status;
  if ("status" in error && typeof error.status === "number") return error.status;
  if (error instanceof Error && error.cause !== undefined)
    return httpStatus(error.cause, depth + 1);
  return undefined;
}

function isNetworkError(error: unknown, depth = 0): boolean {
  if (depth > 5 || !(error instanceof Error)) return false;
  if (error.name === "AbortError" || error.name === "TimeoutError") return true;
  if ("code" in error && typeof error.code === "string" && RETRYABLE_CODES.has(error.code)) {
    return true;
  }
  if (/fetch failed|network|socket hang up|timed out/i.test(error.message)) return true;
  return isNetworkError(error.cause, depth + 1);
}

/** A 400 is the request. A timeout, a drop, or a 429/5xx may succeed if tried again. */
function isRetryable(error: unknown): boolean {
  const status = httpStatus(error);
  if (status !== undefined) {
    return status === 408 || status === 429 || (status >= 500 && status <= 599);
  }
  return isNetworkError(error);
}

function publicMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.replace(/([?&]key=)[^&\s]+/gi, "$1redacted");
}

function readResponse(response: GenerateContentResponse, attempts: number): GeminiResponse {
  const blocked = response.promptFeedback?.blockReason;
  if (blocked) {
    const detail = response.promptFeedback?.blockReasonMessage;
    throw new GeminiCallError(
      detail
        ? `Gemini blocked the prompt (${blocked}): ${detail}`
        : `Gemini blocked the prompt (${blocked}).`,
      { attempts },
    );
  }

  const content = response.candidates?.[0]?.content;
  const text = response.text ?? "";
  const functionCalls = response.functionCalls ?? [];
  if (!content || (text.length === 0 && functionCalls.length === 0)) {
    const reason = response.candidates?.[0]?.finishReason;
    const why = reason ? ` Finish reason: ${reason}.` : "";
    throw new GeminiCallError(`Gemini returned no text or function call.${why}`, { attempts });
  }

  return { text, content, functionCalls };
}

export async function callGemini(request: GeminiRequest): Promise<GeminiResponse> {
  const apiKey = requireEnv("GEMINI_API_KEY");
  const model = requireEnv("GEMINI_MODEL");
  const httpOptions = { timeout: TIMEOUT_MS, retryOptions: { attempts: 1 } };
  const ai = new GoogleGenAI({ apiKey, httpOptions });

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: request.contents,
        config: {
          systemInstruction: request.systemInstruction,
          temperature: request.temperature,
          responseMimeType: request.responseSchema === undefined ? undefined : "application/json",
          responseSchema: request.responseSchema,
          abortSignal: AbortSignal.timeout(TIMEOUT_MS),
          httpOptions,
          ...(request.tools === undefined
            ? {}
            : {
                tools: request.tools as ToolListUnion,
                automaticFunctionCalling: { disable: true },
              }),
        },
      });
      return readResponse(response, attempt);
    } catch (error) {
      if (error instanceof GeminiCallError) throw error;
      lastError = error;
      const delay = BACKOFF_MS[attempt - 1];
      if (attempt === MAX_ATTEMPTS || delay === undefined || !isRetryable(error)) {
        const noun = attempt === 1 ? "attempt" : "attempts";
        throw new GeminiCallError(
          `Gemini call failed after ${attempt} ${noun}: ${publicMessage(error)}`,
          { attempts: attempt, cause: error },
        );
      }
      await sleep(delay);
    }
  }

  throw new GeminiCallError(
    `Gemini call failed after ${MAX_ATTEMPTS} attempts: ${publicMessage(lastError)}`,
    { attempts: MAX_ATTEMPTS, cause: lastError },
  );
}
