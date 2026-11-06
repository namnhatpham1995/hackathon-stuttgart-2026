import { execSync } from "node:child_process";

try {
  execSync("git config core.hooksPath .githooks", { stdio: "ignore" });
} catch {
  // No .git directory (e.g. a CI or deploy build context): nothing to configure.
}
