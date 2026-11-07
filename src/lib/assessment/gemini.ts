/** Shared Gemini call. Fact extraction sets `responseSchema`; the assistant sets `tools`. */
export type GeminiRequest = {
  systemInstruction?: string;
  contents: string | { role: "user" | "model"; text: string }[];
  temperature?: number;
  responseSchema?: unknown;
  tools?: unknown;
};

export type GeminiFunctionCall = {
  name: string;
  args: unknown;
};

export type GeminiResponse = {
  text: string;
  functionCalls: GeminiFunctionCall[];
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
