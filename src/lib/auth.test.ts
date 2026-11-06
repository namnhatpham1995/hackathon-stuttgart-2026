import { eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";

import { db } from "@/db/client";
import { account, user } from "@/db/schema";
import { auth } from "./auth";

/** A unique address per test, so tests stay independent on the shared test database. */
function uniqueEmail() {
  return `person-${crypto.randomUUID()}@example.com`;
}

describe("email and password auth against PostgreSQL", () => {
  test("sign-up stores the user and a hashed password, never the plain text", async () => {
    const email = uniqueEmail();

    await auth.api.signUpEmail({ body: { name: "Ada", email, password: "correct-horse-1" } });

    const [stored] = await db.select().from(user).where(eq(user.email, email));
    expect(stored?.name).toBe("Ada");
    const [credential] = await db
      .select()
      .from(account)
      .where(eq(account.userId, stored?.id ?? ""));
    expect(credential?.providerId).toBe("credential");
    expect(credential?.password).toBeTruthy();
    expect(credential?.password).not.toContain("correct-horse-1");
  });

  test("sign-in with the right password returns a session for that user", async () => {
    const email = uniqueEmail();
    await auth.api.signUpEmail({ body: { name: "Ada", email, password: "correct-horse-1" } });

    const result = await auth.api.signInEmail({ body: { email, password: "correct-horse-1" } });

    expect(result.user.email).toBe(email);
    expect(result.token).toEqual(expect.any(String));
  });

  test("sign-in with a wrong password is rejected as unauthorized", async () => {
    const email = uniqueEmail();
    await auth.api.signUpEmail({ body: { name: "Ada", email, password: "correct-horse-1" } });

    await expect(
      auth.api.signInEmail({ body: { email, password: "wrong-password-1" } }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  test("a second sign-up with the same email is refused and creates no second user", async () => {
    const email = uniqueEmail();
    await auth.api.signUpEmail({ body: { name: "Ada", email, password: "correct-horse-1" } });

    await expect(
      auth.api.signUpEmail({ body: { name: "Eve", email, password: "another-pass-1" } }),
    ).rejects.toMatchObject({ statusCode: 422 });
    const rows = await db.select().from(user).where(eq(user.email, email));
    expect(rows).toHaveLength(1);
  });

  test("the database rejects a second user with the same email even without Better Auth", async () => {
    const email = uniqueEmail();
    const row = { name: "Ada", email, emailVerified: false };

    await db.insert(user).values({ id: crypto.randomUUID(), ...row });

    await expect(db.insert(user).values({ id: crypto.randomUUID(), ...row })).rejects.toMatchObject(
      {
        cause: { constraint_name: "user_email_unique" },
      },
    );
  });
});
