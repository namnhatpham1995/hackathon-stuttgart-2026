// The one rule that keeps a UX audit off real systems: the target's host has to be on this machine or
// in a reserved test name. The list is `.claude/skills/ux-review/hosts.json`; staging and production
// hosts are deliberately not in it, and adding one is a decision, not an edit made during a run.
//
// `node scripts/ux-review/assert-target.mjs <origin>` exits 0 for an allowed target and 1 with the
// reason otherwise.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const modulePath = fileURLToPath(import.meta.url);
export const HOSTS_FILE = path.resolve(
  path.dirname(modulePath),
  "../../.claude/skills/ux-review/hosts.json",
);

/** The schemes a page of the target may use. A WebSocket goes to a host like any page does. */
const PROTOCOLS = new Set(["http:", "https:", "ws:", "wss:"]);

/** `hosts` match exactly. A suffix starts with a dot and matches whole labels only, so `.test`
 * allows `shop.test` and not `shop.test.example.com` or `contest`. */
export function readAllowedHosts(file = HOSTS_FILE) {
  const { hosts, hostSuffixes } = JSON.parse(readFileSync(file, "utf8")) ?? {};
  const isNames = (list) =>
    Array.isArray(list) && list.every((name) => typeof name === "string" && name !== "");
  if (!isNames(hosts) || !isNames(hostSuffixes)) {
    throw new Error(`${file} must hold "hosts" and "hostSuffixes", each a list of names`);
  }
  if (!hostSuffixes.every((suffix) => suffix.startsWith(".") && suffix.length > 1)) {
    throw new Error(`${file}: every host suffix must start with a dot`);
  }
  return { hosts, hostSuffixes };
}

/** Why `target` may not be audited, or `null` when it may. The host is read the way a browser reads
 * it (`new URL`), so a look-alike such as `http://localhost@attacker.example.com` is judged by
 * `attacker.example.com`. */
export function targetRefusal(target, allowed = readAllowedHosts()) {
  let url;
  try {
    url = new URL(target);
  } catch {
    return `"${target}" is not a web address`;
  }
  if (!PROTOCOLS.has(url.protocol)) return `${url.protocol} addresses are not audit targets`;
  if (url.username !== "" || url.password !== "") {
    return "an audit target address carries no user name or password";
  }
  const host = url.hostname;
  if (
    allowed.hosts.includes(host) ||
    allowed.hostSuffixes.some((suffix) => host.endsWith(suffix))
  ) {
    return null;
  }
  const names = [...allowed.hosts, ...allowed.hostSuffixes.map((suffix) => `*${suffix}`)];
  return `host "${host}" is not an audit target; only ${names.join(", ")} are`;
}

/** Throws with the reason when `target` may not be audited. */
export function assertTarget(target, allowed) {
  const refusal = targetRefusal(target, allowed);
  if (refusal !== null) throw new Error(refusal);
}

if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) {
  const target = process.argv[2];
  if (!target) {
    console.error("usage: node scripts/ux-review/assert-target.mjs <origin>");
    process.exit(2);
  }
  try {
    assertTarget(target);
    console.log(`ok: ${new URL(target).hostname} is an audit target`);
  } catch (error) {
    console.error(`refused: ${error.message}`);
    process.exit(1);
  }
}
