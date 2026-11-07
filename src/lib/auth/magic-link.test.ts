import { eq } from "drizzle-orm";
import { describe, expect, test, vi } from "vitest";

vi.mock("@/lib/notify/brevo", () => ({
  sendBrevoEmail: vi.fn(async () => ({ messageId: "test-message" })),
}));

import { db } from "@/db/client";
import { session, user, verification } from "@/db/schema";
import { auth } from "@/lib/auth";
import { sendBrevoEmail } from "@/lib/notify/brevo";

const origin = "http://localhost:3000";

function uniqueEmail() {
  return `link-${crypto.randomUUID()}@example.com`;
}

async function requestLink(email: string) {
  vi.mocked(sendBrevoEmail).mockClear();
  const result = await auth.api.signInMagicLink({
    body: { email, callbackURL: "/workspace" },
    headers: new Headers({ origin }),
  });
  expect(result).toEqual({ status: true });
  expect(sendBrevoEmail).toHaveBeenCalledTimes(1);
  const sent = vi.mocked(sendBrevoEmail).mock.calls[0]?.[0];
  expect(sent?.to).toBe(email);
  expect(sent?.subject).toBe("Your ExportReady sign-in link");
  const url = new URL(sent?.text.match(/https?:\/\/\S+/)?.[0] ?? "");
  expect(url.origin).toBe(origin);
  expect(url.pathname).toBe("/api/auth/magic-link/verify");
  expect(url.searchParams.get("callbackURL")).toBe("/workspace");
  const token = url.searchParams.get("token");
  expect(token).toEqual(expect.any(String));
  const pending = (await db.select().from(verification)).filter((row) => row.value.includes(email));
  expect(pending).toHaveLength(1);
  expect(pending[0]?.identifier.startsWith("magic-link:")).toBe(true);
  expect(pending[0]?.identifier).not.toBe(`magic-link:${token}`);
  expect(pending[0]?.identifier.includes(token ?? "")).toBe(false);
  return token ?? "";
}

async function openLink(token: string) {
  return auth.api.magicLinkVerify({
    query: { token, callbackURL: "/workspace" },
    headers: new Headers({ origin }),
    asResponse: true,
  });
}

describe("magic-link sign-in against PostgreSQL", () => {
  test("the first click creates one verified user and redirects to /workspace", async () => {
    const email = uniqueEmail();
    const token = await requestLink(email);

    const response = await openLink(token);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(`${origin}/workspace`);
    const rows = await db.select().from(user).where(eq(user.email, email));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.emailVerified).toBe(true);
    const sessions = await db
      .select()
      .from(session)
      .where(eq(session.userId, rows[0]?.id ?? ""));
    expect(sessions).toHaveLength(1);

    const again = await openLink(token);
    const errorUrl = new URL(again.headers.get("location") ?? "");
    expect(errorUrl.searchParams.get("error")).toBe("INVALID_TOKEN");
    const after = await db.select().from(user).where(eq(user.email, email));
    expect(after).toHaveLength(1);
  });

  test("an existing password user is signed in as the same row", async () => {
    const email = uniqueEmail();
    await auth.api.signUpEmail({ body: { name: "Ada", email, password: "correct-horse-1" } });
    const [before] = await db.select().from(user).where(eq(user.email, email));
    // Password sign-in still works. The plugin removes that password only after this
    // unverified account opens a magic link, which is what proves the mailbox.
    const signedIn = await auth.api.signInEmail({
      body: { email, password: "correct-horse-1" },
    });
    expect(signedIn.user.id).toBe(before?.id);

    const response = await openLink(await requestLink(email));

    expect(response.headers.get("location")).toBe(`${origin}/workspace`);
    const rows = await db.select().from(user).where(eq(user.email, email));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(before?.id);
    expect(rows[0]?.emailVerified).toBe(true);
  });
});
