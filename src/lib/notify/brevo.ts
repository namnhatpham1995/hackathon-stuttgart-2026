import { z } from "zod";

import { requireEnv } from "@/env";

const BREVO_SMTP_URL = "https://api.brevo.com/v3/smtp/email";
const TIMEOUT_MS = 15_000;

const brevoAcceptedSchema = z.object({
  messageId: z.string().min(1),
});

/**
 * Transactional email through Brevo. Callers that must survive a missing key
 * (completion email, connection notices) catch this and mark the notice failed.
 * The body is text only: there is no attachment field.
 */
export async function sendBrevoEmail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ messageId: string }> {
  const apiKey = requireEnv("BREVO_API_KEY");
  const sender = requireEnv("BREVO_SENDER_EMAIL");

  let response: Response;
  try {
    response = await fetch(BREVO_SMTP_URL, {
      method: "POST",
      redirect: "error",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { email: sender, name: "TradeReady" },
        to: [{ email: input.to }],
        subject: input.subject,
        textContent: input.text,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error("Brevo request timed out after 15s", { cause: error });
    }
    throw error;
  }

  if (!response.ok) {
    const detail = (await response.text()).replace(/\s+/g, " ").trim().slice(0, 300);
    throw new Error(
      detail.length > 0
        ? `Brevo rejected the email (${response.status}): ${detail}`
        : `Brevo rejected the email (${response.status})`,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error("Brevo accepted the email but returned no JSON body", { cause: error });
  }
  const parsed = brevoAcceptedSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Brevo accepted the email without a messageId");
  }
  return { messageId: parsed.data.messageId };
}
