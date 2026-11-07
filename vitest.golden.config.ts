import path from "node:path";

import { defineConfig } from "vitest/config";

try {
  process.loadEnvFile();
} catch {
  // No .env (for example CI): the environment already has what a golden run needs.
}

/** Live assessment checks. Not part of `pnpm verify`; run them with `pnpm test:golden`. */
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    include: ["src/**/*.golden.ts"],
    passWithNoTests: true,
  },
});
