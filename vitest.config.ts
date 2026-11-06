import path from "node:path";

import { defineConfig } from "vitest/config";

try {
  process.loadEnvFile();
} catch {
  // No .env (e.g. CI): TEST_DATABASE_URL comes from the environment.
}

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5433/hackathon_test";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    globalSetup: ["./test/global-setup.ts"],
    // Tests that touch persistence use a real PostgreSQL database, never mocks: global setup
    // recreates and migrates this one before every run.
    env: {
      DATABASE_URL: testDatabaseUrl,
      BETTER_AUTH_SECRET: "test-only-secret-0123456789abcdef0123456789",
      BETTER_AUTH_URL: "http://localhost:3000",
      GOOGLE_CLIENT_ID: "",
      GOOGLE_CLIENT_SECRET: "",
      GITHUB_CLIENT_ID: "",
      GITHUB_CLIENT_SECRET: "",
    },
  },
});
