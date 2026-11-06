import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/** Reads .env when it exists; values already in the environment win. */
export function loadEnv() {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file: rely on the environment.
  }
}

function serverUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  url.pathname = "/postgres";
  return url.toString();
}

function databaseName(databaseUrl: string) {
  return decodeURIComponent(new URL(databaseUrl).pathname.slice(1));
}

/** Creates the database named in the URL when it does not exist yet (`fresh` drops it first). */
export async function ensureDatabase(databaseUrl: string, { fresh = false } = {}) {
  const name = databaseName(databaseUrl);
  const admin = postgres(serverUrl(databaseUrl), { max: 1, onnotice: () => {} });
  try {
    if (fresh) await admin`drop database if exists ${admin(name)} with (force)`;
    const [existing] = await admin`select 1 from pg_database where datname = ${name}`;
    if (!existing) await admin`create database ${admin(name)}`;
  } finally {
    await admin.end();
  }
}

/** Applies every migration in ./drizzle that the database has not run yet. */
export async function migrateDatabase(databaseUrl: string) {
  await ensureDatabase(databaseUrl);
  const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  } finally {
    await sql.end();
  }
}
