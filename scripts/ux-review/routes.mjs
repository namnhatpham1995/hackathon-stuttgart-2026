// Lists the pages of the app from the filesystem, so an audit never relies on a hand-kept list: a new
// `page.tsx` shows up here with no edit to anything else. Dynamic segments stay as Next.js names
// them (`[slug]`, `[...rest]`).
//
// `node scripts/ux-review/routes.mjs [--json]` prints one pattern per line, or with `--json` the
// pattern and the page file of each route.
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const modulePath = fileURLToPath(import.meta.url);
export const APP_DIR = path.resolve(path.dirname(modulePath), "../../src/app");

const PAGE_FILE = /^page\.(?:tsx|ts|jsx|js|mdx)$/;

/** The URL segment a folder adds: `null` when it adds none (`(group)` folders), `undefined` when it
 * is no route at all (`_private`, `@slot`, and `(.)` / `(..)` folders that intercept another route). */
function segmentOf(folder) {
  if (folder.startsWith("_") || folder.startsWith("@") || /^\(\.{1,3}\)/.test(folder)) {
    return undefined;
  }
  if (/^\(.*\)$/.test(folder)) return null;
  return folder;
}

function collect(directory, segments, relativeDir, routes) {
  const entries = readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && PAGE_FILE.test(entry.name)) {
      routes.push({
        pattern: `/${segments.join("/")}`,
        file: [...relativeDir, entry.name].join("/"),
      });
    }
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const segment = segmentOf(entry.name);
    if (segment === undefined) continue;
    collect(
      path.join(directory, entry.name),
      segment === null ? segments : [...segments, segment],
      [...relativeDir, entry.name],
      routes,
    );
  }
}

/** Every page under `appDir` as `{ pattern, file }`, ordered by pattern. */
export function listRoutes(appDir = APP_DIR) {
  const routes = [];
  collect(appDir, [], [], routes);
  return routes.sort((a, b) => a.pattern.localeCompare(b.pattern) || a.file.localeCompare(b.file));
}

if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) {
  const routes = listRoutes();
  if (process.argv.includes("--json")) console.log(JSON.stringify(routes, null, 2));
  else for (const route of routes) console.log(route.pattern);
}
