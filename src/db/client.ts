import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/env";
import * as schema from "./schema";

/** One connection pool per process. Next's dev server re-evaluates modules on every edit, so the
 * pool is kept on `globalThis` to avoid leaking a new one each time. */
const globalForDb = globalThis as unknown as { sql?: postgres.Sql };
const sql = globalForDb.sql ?? postgres(env.DATABASE_URL, { max: 10 });
if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;

export const db = drizzle(sql, { schema, casing: "snake_case" });
export type Database = typeof db;
