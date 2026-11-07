"use client";

import { type FormEvent, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { safeNextPath } from "@/lib/safe-next-path";

/** New accounts use the mailbox name; redirects stay on this site. */
export function magicLinkSignInBody(email: string, next = "/workspace") {
  const at = email.indexOf("@");
  const name = at > 0 ? email.slice(0, at) : email;
  return { email, name, callbackURL: safeNextPath(next) };
}

export function MagicLinkForm({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const email = String(new FormData(event.currentTarget).get("email"));
    const { error: resultError } = await authClient.signIn.magicLink(
      magicLinkSignInBody(email, next),
    );
    setPending(false);
    if (resultError) {
      setError(resultError.message ?? "Could not send the sign-in link. Try again.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p role="status" className="text-sm">
        Check your inbox for a sign-in link.
      </p>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Email
        <input className="field" name="email" type="email" autoComplete="email" required />
      </label>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <button className="btn-secondary" type="submit" disabled={pending}>
        {pending ? "Please wait…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
