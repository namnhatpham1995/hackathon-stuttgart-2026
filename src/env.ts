import { z } from "zod";

/** Blank counts as unset, so an empty line copied from .env.example does not switch a provider on. */
const optional = z
  .string()
  .optional()
  .transform((value) => (value ? value : undefined));

function blankToUndefined(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Optional, but a non-blank value must already be the right shape. */
const optionalUrl = z.preprocess(blankToUndefined, z.url().optional());
const optionalEmail = z.preprocess(blankToUndefined, z.email().optional());

const envSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.url().default("http://localhost:3001"),
  GOOGLE_CLIENT_ID: optional,
  GOOGLE_CLIENT_SECRET: optional,
  GITHUB_CLIENT_ID: optional,
  GITHUB_CLIENT_SECRET: optional,
  GEMINI_API_KEY: optional,
  GEMINI_MODEL: optional,
  ANTHROPIC_API_KEY: optional,
  ANTHROPIC_MODEL: optional,
  ANTHROPIC_WORKSPACE_ID: optional,
  /** Railway origin. Set on Vercel only; unset locally and on Railway. */
  BACKEND_URL: optionalUrl,
  BREVO_API_KEY: optional,
  BREVO_SENDER_EMAIL: optionalEmail,
  APP_BASE_URL: optionalUrl,
  /** Hostname Railway sets on its service (no scheme). Sign-in trusts `https://<it>` when set. */
  RAILWAY_PUBLIC_DOMAIN: optional,
  ELEVENLABS_API_KEY: optional,
});

export type Env = z.infer<typeof envSchema>;

const featureEnv = [
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_MODEL",
  "ANTHROPIC_WORKSPACE_ID",
  "BREVO_API_KEY",
  "BREVO_SENDER_EMAIL",
  "APP_BASE_URL",
  "ELEVENLABS_API_KEY",
] as const satisfies readonly (keyof Env)[];

export type FeatureEnvName = (typeof featureEnv)[number];

/** Throws when a feature is used without the variable it needs. Missing stays legal at startup. */
export function requireEnv(name: FeatureEnvName): string {
  const value = env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Add it to .env before using this feature (see .env.example).`,
    );
  }
  return value;
}

/** Server-only configuration, validated once on first use so a missing value fails with one clear
 * message instead of a confusing error deep inside a request. */
export const env: Env = (() => {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment (run \`pnpm dev:setup\`):\n${z.prettifyError(parsed.error)}`,
    );
  }
  return parsed.data;
})();
