import { ensureDatabase, loadEnv, migrateDatabase } from "../scripts/db-tools";

/** Gives every test run a freshly migrated database, so tests never depend on leftovers. */
export default async function setup() {
  loadEnv();
  const url =
    process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5434/hackathon_test";
  try {
    await ensureDatabase(url, { fresh: true });
  } catch (error) {
    throw new Error(
      `Cannot reach PostgreSQL for tests at ${new URL(url).host}. Start it with \`pnpm db:up\`.\n${error}`,
    );
  }
  await migrateDatabase(url);
}
