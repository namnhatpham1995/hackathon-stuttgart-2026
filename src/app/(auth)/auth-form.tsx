"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";

import { BrandMark } from "@/components/ui/brand-mark";
import { signIn, signUp } from "@/lib/auth-client";
import { safeNextPath } from "@/lib/safe-next-path";

import { MagicLinkForm } from "./magic-link-form";

const providerLabels: Record<string, string> = { google: "Google", github: "GitHub" };

export function AuthForm({
  mode,
  socialProviders,
}: {
  mode: "sign-in" | "sign-up";
  socialProviders: string[];
}) {
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const result =
      mode === "sign-up"
        ? await signUp.email({ name: String(form.get("name")), email, password })
        : await signIn.email({ email, password });
    setPending(false);
    if (result.error) {
      setError(result.error.message ?? "Something went wrong. Try again.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  const isSignUp = mode === "sign-up";

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6 py-16">
      <BrandMark className="auth-brand-mark" alt="TradeReady passport" />
      <h1 className="text-3xl font-semibold tracking-tight">
        {isSignUp ? "Create your account" : "Welcome"}
      </h1>

      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        {isSignUp && (
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Name
            <input className="field" name="name" autoComplete="name" required />
          </label>
        )}
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Email
          <input className="field" name="email" type="email" autoComplete="email" required />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Password
          <input
            className="field"
            name="password"
            type="password"
            minLength={8}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            required
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <button className="btn-primary" type="submit" disabled={pending}>
          {pending ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
        </button>
      </form>

      {!isSignUp && (
        <>
          <p className="text-center text-sm text-muted">or</p>
          <MagicLinkForm next={next} />
        </>
      )}

      {socialProviders.length > 0 && (
        <div className="flex flex-col gap-2">
          {socialProviders.map((provider) => (
            <button
              key={provider}
              className="btn-secondary"
              type="button"
              onClick={() => signIn.social({ provider, callbackURL: next })}
            >
              Continue with {providerLabels[provider] ?? provider}
            </button>
          ))}
        </div>
      )}

      <p className="text-sm text-muted">
        {isSignUp ? "Already have an account? " : "New here? "}
        <Link
          className="font-medium text-accent underline"
          href={`${isSignUp ? "/sign-in" : "/sign-up"}?next=${encodeURIComponent(next)}`}
        >
          {isSignUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </main>
  );
}
