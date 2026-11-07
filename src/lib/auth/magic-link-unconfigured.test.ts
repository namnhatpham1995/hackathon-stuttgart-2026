import { afterEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  delete process.env.BREVO_API_KEY;
  delete process.env.BREVO_SENDER_EMAIL;
});

import { auth } from "../auth";
import { sendMagicLinkEmail } from "./magic-link-email";

const origin = "http://localhost:3000";

describe("magic link when Brevo is not configured", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("the send callback names the missing key and does not call Brevo", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(
      sendMagicLinkEmail({
        email: "supplier@example.com",
        url: `${origin}/api/auth/magic-link/verify?token=abc`,
      }),
    ).rejects.toMatchObject({
      statusCode: 500,
      message:
        "BREVO_API_KEY is not set. Add it to .env before using this feature (see .env.example).",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("the sign-in route returns that same error", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(
      auth.api.signInMagicLink({
        body: { email: "supplier@example.com", callbackURL: "/workspace" },
        headers: new Headers({ origin }),
      }),
    ).rejects.toMatchObject({
      statusCode: 500,
      message:
        "BREVO_API_KEY is not set. Add it to .env before using this feature (see .env.example).",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
