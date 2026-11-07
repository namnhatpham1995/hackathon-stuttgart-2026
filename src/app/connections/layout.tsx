import type { ReactNode } from "react";

import { ConnectionsNav } from "@/components/connections/connections-nav";
import { SignOutButton } from "@/components/connections/sign-out-button";
import { requireSession } from "@/lib/session";

export default async function ConnectionsLayout({ children }: { children: ReactNode }) {
  const { user } = await requireSession();

  return (
    <div className="min-h-dvh">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <p className="text-sm font-semibold">ExportReady</p>
        <p className="min-w-0 truncate text-sm text-muted">{user.name}</p>
        <SignOutButton />
      </header>
      <ConnectionsNav />
      <main className="mx-auto min-w-0 max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
