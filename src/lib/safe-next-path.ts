/** A `?next=` value is followed after sign-in only when it is a path on this site, so a crafted link
 * cannot send someone to another origin (`//evil.example`, `/\evil.example`, `https://…`). */
export function safeNextPath(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value?.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
