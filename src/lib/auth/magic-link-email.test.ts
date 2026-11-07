import { afterEach, describe, expect, test, vi } from "vitest";

import { MAGIC_LINK_SUBJECT, sendMagicLinkEmail } from "./magic-link-email";

vi.mock("@/lib/notify/brevo", () => ({
  sendBrevoEmail: vi.fn(async () => ({ messageId: "test-message" })),
}));

const verifyUrl =
  "http://localhost:3000/api/auth/magic-link/verify?token=abc&callbackURL=%2Fworkspace";

describe("magic-link send callback", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("emails the submitted address the verify link with the TradeReady subject", async () => {
    const { sendBrevoEmail } = await import("@/lib/notify/brevo");

    await sendMagicLinkEmail({ email: "supplier@example.com", url: verifyUrl });

    expect(sendBrevoEmail).toHaveBeenCalledTimes(1);
    expect(sendBrevoEmail).toHaveBeenCalledWith({
      to: "supplier@example.com",
      subject: "Your TradeReady sign-in link",
      text: expect.stringContaining(verifyUrl),
    });
    expect(MAGIC_LINK_SUBJECT).toBe("Your TradeReady sign-in link");
  });
});
