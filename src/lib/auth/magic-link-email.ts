import { APIError } from "better-auth";

import { sendBrevoEmail } from "@/lib/notify/brevo";

export const MAGIC_LINK_SUBJECT = "Your TradeReady sign-in link";

/**
 * Server-only send for Better Auth's magic-link plugin. Imported from `src/lib/auth.ts`.
 * Do not import this module, or `src/lib/notify/brevo.ts`, from a client component.
 */
export async function sendMagicLinkEmail(input: { email: string; url: string }): Promise<void> {
  try {
    await sendBrevoEmail({
      to: input.email,
      subject: MAGIC_LINK_SUBJECT,
      text: `Sign in to TradeReady by opening this link:\n${input.url}\n\nIf you did not ask for it, you can ignore this email.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send the sign-in link.";
    throw new APIError("INTERNAL_SERVER_ERROR", { message });
  }
}
