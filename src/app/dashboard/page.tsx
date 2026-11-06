import { requireSession } from "@/lib/session";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardPage() {
  const { user } = await requireSession();

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-6 py-16">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <SignOutButton />
      </header>
      <section className="rounded-xl border border-line p-6">
        <p className="text-sm text-muted">Signed in as</p>
        <p className="text-lg font-medium">{user.name}</p>
        <p className="text-muted">{user.email}</p>
      </section>
      <p className="text-muted">
        This page is protected. Start your feature here: propose it with <code>/opsx:propose</code>,
        then build it with <code>/opsx:apply</code>.
      </p>
    </main>
  );
}
