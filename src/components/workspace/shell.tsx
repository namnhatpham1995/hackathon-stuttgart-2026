"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { setTheme } from "@/app/workspace/actions";
import { AssistantDock } from "@/components/assistant/assistant-dock";
import { clearAssistantHistory } from "@/components/assistant/assistant-history";
import { ConnectionsNav } from "@/components/connections/connections-nav";
import { BrandMark } from "@/components/ui/brand-mark";
import { Button } from "@/components/ui/button";
import { NavItem } from "@/components/ui/nav-item";
import { WorkspaceSwitcher } from "@/components/ui/workspace-switcher";
import { signOut } from "@/lib/auth-client";
import { ProductIcon, SignOutIcon, ThemeIcon } from "./icons";

export function WorkspaceShell({
  user,
  unread,
  children,
}: {
  user: { name: string; email: string };
  unread: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const productId = typeof params.productId === "string" ? params.productId : undefined;

  return (
    <div className="workspace-shell min-h-dvh bg-card text-ink">
      <a
        href="#workspace-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-card focus:px-4 focus:py-3"
      >
        Skip to content
      </a>
      <aside className="workspace-sidebar">
        <Link href="/workspace" className="workspace-brand">
          <BrandMark />
          <span>TradeReady</span>
        </Link>
        <div className="px-4 pt-6 pb-3">
          <p className="meta font-medium text-ink">Supplier workspace</p>
          <p className="mt-1 text-xs text-muted">Documents &amp; buyer requirements</p>
        </div>
        <nav aria-label="Primary" className="px-3">
          <NavItem
            href="/workspace"
            tone="default"
            current={pathname === "/workspace" || Boolean(productId)}
          >
            <span className="flex items-center gap-2.5">
              <ProductIcon /> Products
            </span>
          </NavItem>
        </nav>
        <div className="px-3 pb-3">
          <ConnectionsNav layout="sidebar" unread={unread} />
        </div>
        <div className="mt-auto border-t border-line p-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-card text-xs font-medium"
              aria-hidden="true"
            >
              {user.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <SignOut />
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="workspace-topbar">
          <Link href="/workspace" className="inline-flex items-center gap-2 font-medium md:hidden">
            <BrandMark /> TradeReady
          </Link>
          <WorkspaceSwitcher className="order-last w-full lg:order-none lg:w-auto" />
          <div className="ml-auto flex items-center gap-3">
            <span className="meta hidden text-muted sm:inline">{user.name}</span>
            <AssistantDock />
            <ThemeToggle />
            <div className="md:hidden">
              <SignOut compact />
            </div>
          </div>
        </header>
        <div className="md:hidden">
          <ConnectionsNav unread={unread} />
        </div>
        <main id="workspace-main" className="workspace-main" key={pathname}>
          {children}
        </main>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const [label, setLabel] = useState("Dark theme");
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function updateLabel() {
      const explicit = document.documentElement.dataset.theme;
      const dark = explicit === "dark" || (!explicit && media.matches);
      setLabel(dark ? "Light theme" : "Dark theme");
    }
    updateLabel();
    media.addEventListener("change", updateLabel);
    return () => media.removeEventListener("change", updateLabel);
  }, []);
  function toggle() {
    const explicit = document.documentElement.dataset.theme;
    const dark =
      explicit === "dark" ||
      (!explicit && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    void setTheme(next);
    setLabel(next === "dark" ? "Light theme" : "Dark theme");
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="min-w-8"
    >
      <ThemeIcon />
    </Button>
  );
}

function SignOut({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      pending={pending}
      onClick={async () => {
        setPending(true);
        clearAssistantHistory();
        await signOut();
        router.push("/");
        router.refresh();
      }}
    >
      {compact ? <SignOutIcon /> : null}
      <span className={compact ? "sr-only" : undefined}>Sign out</span>
    </Button>
  );
}
