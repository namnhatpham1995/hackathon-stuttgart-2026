import Link from "next/link";

import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">Hackathon Starter</h1>
        <p className="text-lg text-muted">
          Sign-in, a database and an agent workflow are already set up. Build your idea.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {session ? (
          <Link className="btn-primary" href="/dashboard">
            Go to dashboard
          </Link>
        ) : (
          <>
            <Link className="btn-primary" href="/sign-up">
              Create an account
            </Link>
            <Link className="btn-secondary" href="/sign-in">
              Sign in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
