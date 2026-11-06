import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "./auth";

/** The signed-in session for a server component or action, or null. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Use at the top of a protected page: sends a visitor without a session to sign-in. */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
}
