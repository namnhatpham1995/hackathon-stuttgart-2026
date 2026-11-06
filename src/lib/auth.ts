import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db/client";
import * as schema from "@/db/schema/auth";
import { env } from "@/env";

/** A social provider is on only when both of its credentials are set in .env. */
function socialProviders() {
  const providers: Record<string, { clientId: string; clientSecret: string }> = {};
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.google = { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET };
  }
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    providers.github = { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET };
  }
  return providers;
}

export const enabledSocialProviders = Object.keys(socialProviders());

export const auth = betterAuth({
  appName: "Hackathon Starter",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // A hackathon demo has no mail provider. Turn this on once one is wired in `sendVerificationEmail`.
    requireEmailVerification: false,
  },
  socialProviders: socialProviders(),
  // Must stay last: lets server actions set the session cookie.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
