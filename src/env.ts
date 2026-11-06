import { z } from "zod";

/** Blank counts as unset, so an empty line copied from .env.example does not switch a provider on. */
const optional = z
  .string()
  .optional()
  .transform((value) => (value ? value : undefined));

const envSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: optional,
  GOOGLE_CLIENT_SECRET: optional,
  GITHUB_CLIENT_ID: optional,
  GITHUB_CLIENT_SECRET: optional,
});

export type Env = z.infer<typeof envSchema>;

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
