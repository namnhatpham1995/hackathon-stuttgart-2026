import { loadEnv, migrateDatabase } from "./db-tools";

loadEnv();
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set (run `pnpm dev:setup`)");

await migrateDatabase(url);
console.log(`Migrated ${new URL(url).pathname.slice(1)}`);
