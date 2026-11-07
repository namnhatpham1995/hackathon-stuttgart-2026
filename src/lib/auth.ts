import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";

import { db } from "@/db/client";
import * as schema from "@/db/schema/auth";
import { env } from "@/env";

import { sendMagicLinkEmail } from "./auth/magic-link-email";

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
  appName: "TradeReady",
  baseURL: env.BETTER_AUTH_URL,
  // The public site moved from Vercel to Railway. Trust both origins so sign-in works on either
  // URL, whichever one BETTER_AUTH_URL names.
  trustedOrigins: ["https://exportready-production.up.railway.app", "https://tradeready-eu.vercel.app"],
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // A hackathon demo has no mail provider. Turn this on once one is wired in `sendVerificationEmail`.
    requireEmailVerification: false,
  },
  socialProviders: socialProviders(),
  // nextCookies() must stay last: it lets server actions set the session cookie.
  plugins: [
    magicLink({
      // The email already carries the raw URL. The database stores only the hash
      // (security guide: one-time tokens are not readable).
      storeToken: "hashed",
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail({ email, url });
      },
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
