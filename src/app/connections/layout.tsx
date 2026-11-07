import Link from "next/link";
import type { ReactNode } from "react";

import { AssistantDock } from "@/components/assistant/assistant-dock";
import { ConnectionsNav } from "@/components/connections/connections-nav";
import { SignOutButton } from "@/components/connections/sign-out-button";
import { BrandMark } from "@/components/ui/brand-mark";
import { Button } from "@/components/ui/button";
import { WorkspaceSwitcher } from "@/components/ui/workspace-switcher";
import { requireSession } from "@/lib/session";

export default async function ConnectionsLayout({ children }: { children: ReactNode }) {
  const { user } = await requireSession();

  return (
    <div className="min-h-dvh bg-card text-ink">
      <header className="flex min-h-16 flex-wrap items-center gap-3 border-b border-line px-4 py-3 md:px-10">
        <Link href="/dashboard" className="inline-flex items-center gap-2 font-semibold">
          <BrandMark />
          TradeReady
        </Link>
        <span className="text-sm text-muted">Connections</span>
        <div className="ml-auto flex items-center gap-3">
          <p className="hidden max-w-40 truncate text-sm text-muted sm:block">{user.name}</p>
          <AssistantDock />
          <SignOutButton />
        </div>
      </header>
      <WorkspaceSwitcher />
      <ConnectionsNav />
      <main className="mx-auto min-w-0 max-w-3xl px-4 py-6">
        <div className="mb-6">
          <Button href="/dashboard" variant="secondary">
            Back to workspaces
          </Button>
        </div>
        {children}
      </main>
    </div>
  );
}
