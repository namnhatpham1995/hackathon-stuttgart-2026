import { expect, test } from "vitest";

import { safeNextPath } from "./safe-next-path";

test("keeps a path on this site", () => {
  expect(safeNextPath("/dashboard/settings?tab=team")).toBe("/dashboard/settings?tab=team");
});

test.each([
  ["missing", null],
  ["empty", ""],
  ["absolute URL", "https://evil.example/"],
  ["protocol-relative URL", "//evil.example/"],
  ["backslash trick", "/\\evil.example/"],
  ["relative path", "dashboard"],
])("falls back to /dashboard for a %s value", (_label, value) => {
  expect(safeNextPath(value)).toBe("/dashboard");
});
