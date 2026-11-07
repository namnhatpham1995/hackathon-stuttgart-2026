import { BrandMark } from "@/components/ui/brand-mark";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/session";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardPage() {
  const { user } = await requireSession();

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-6 py-16">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-semibold">
          <BrandMark /> TradeReady
        </div>
        <SignOutButton />
      </header>
      <div className="space-y-2">
        <h1 className="page-title">Choose your workspace</h1>
        <p className="text-muted [overflow-wrap:anywhere]">
          Signed in as {user.name}. You can switch workspaces at any time.
        </p>
      </div>
      <section className="space-y-3 border-b border-line pb-8">
        <h2 className="text-lg font-semibold">Supplier workspace</h2>
        <p className="text-muted">
          Manage your products, upload evidence and respond to buyer requirements.
        </p>
        <Button href="/workspace">Open supplier workspace</Button>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Buyer workspace</h2>
        <p className="text-muted">
          Publish requirements, discover suppliers and review shared evidence.
        </p>
        <Button href="/buyer">Open buyer workspace</Button>
      </section>
    </main>
  );
}
