// Creates the demo account from .env so there is always someone to sign in as. Safe to run again.
import { loadEnv } from "./db-tools";

loadEnv();
const email = process.env.SEED_USER_EMAIL ?? "demo@example.com";
const password = process.env.SEED_USER_PASSWORD ?? "demo-password-123";

// Imported after loadEnv, because src/env.ts validates the environment when it is first loaded.
const { auth } = await import("../src/lib/auth");
const { db } = await import("../src/db/client");
const { user } = await import("../src/db/schema");
const { eq } = await import("drizzle-orm");

const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
if (existing) {
  console.log(`Seed user ${email} already exists`);
} else {
  // Through Better Auth, so the password is hashed and the account row is created exactly as a
  // real sign-up would.
  await auth.api.signUpEmail({ body: { name: "Demo User", email, password } });
  console.log(`Created seed user ${email}`);
}
process.exit(0);
