// Recreates the throwaway database of a ux-review run and creates its personas. Run by
// `scripts/ux-review/serve.mjs` only, which passes everything through the environment: DATABASE_URL
// (the run's `_ux` database), UX_REVIEW_PASSWORD and UX_REVIEW_PERSONAS. It reads no .env and never
// prints the password.
import { ensureDatabase, migrateDatabase } from "../db-tools";

const databaseUrl = process.env.DATABASE_URL;
const password = process.env.UX_REVIEW_PASSWORD;
const personas = JSON.parse(process.env.UX_REVIEW_PERSONAS ?? "[]") as {
  name: string;
  address: string;
}[];
if (!databaseUrl || !password) throw new Error("run this through `pnpm ux-review:serve`");
if (!/_ux$/.test(new URL(databaseUrl).pathname)) {
  throw new Error("DATABASE_URL is not a ux-review throwaway database; refusing to recreate it");
}

await ensureDatabase(databaseUrl, { fresh: true });
await migrateDatabase(databaseUrl);

// Imported after the database exists, because src/env.ts validates the environment on first load.
const { auth } = await import("../../src/lib/auth");
for (const persona of personas) {
  // Through Better Auth, so the password is hashed and the account row is created exactly as a real
  // sign-up would.
  await auth.api.signUpEmail({ body: { name: persona.name, email: persona.address, password } });
  console.log(`created ${persona.address}`);
}
// Every feature that adds a table adds the rows its personas need here, and a line to
// `.claude/skills/ux-review/references/personas.md`, "What the seed holds".
process.exit(0);
