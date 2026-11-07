"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

import { setTheme } from "@/app/workspace/actions";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/ui/brand-mark";
import { WorkspaceSwitcher } from "@/components/ui/workspace-switcher";
import { SignOutIcon, ThemeIcon } from "@/components/workspace/icons";
import { signOut } from "@/lib/auth-client";

export function BuyerShell({
  user,
  children,
}: {
  user: { name: string; email: string };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    setHash(pathname === "/buyer" ? window.location.hash : "");
  }, [pathname]);

  useEffect(() => {
    const read = () => setHash(window.location.hash);
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const onOverview = pathname === "/buyer";
  const onRequests = onOverview && hash === "#requests";

  return (
    <div className="min-h-dvh bg-card text-ink">
      <a
        href="#buyer-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-card focus:px-4 focus:py-3"
      >
        Skip to content
      </a>
      <header className="border-b border-line bg-card">
        <div className="flex min-h-16 items-center gap-3 px-4 py-3 md:px-10">
          <Link href="/buyer" className="inline-flex min-w-0 items-center gap-2 font-medium">
            <BrandMark />
            <span className="truncate">TradeReady</span>
          </Link>
          <span className="meta hidden text-muted lg:inline">Buyer workspace</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="meta hidden max-w-40 truncate text-muted sm:inline">{user.name}</span>
            <ThemeToggle />
            <div className="sm:hidden">
              <SignOut compact />
            </div>
            <div className="hidden sm:block">
              <SignOut />
            </div>
          </div>
        </div>
        <WorkspaceSwitcher />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pb-3 md:px-10">
          <nav aria-label="Buyer" className="flex flex-wrap items-center gap-1">
            <BuyerLink href="/buyer" current={onOverview && !onRequests}>
              Overview
            </BuyerLink>
            <BuyerLink href="/buyer#requests" current={onRequests}>
              My requests
            </BuyerLink>
            <BuyerLink href="/buyer/products" current={pathname.startsWith("/buyer/products")}>
              Find products
            </BuyerLink>
          </nav>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <Button href="/connections/requests/new" size="sm">
              New request
            </Button>
          </div>
        </div>
      </header>
      <main id="buyer-main" className="workspace-main">
        {children}
      </main>
    </div>
  );
}

function BuyerLink({
  href,
  current,
  children,
}: {
  href: string;
  current: boolean;
  children: ReactNode;
}) {
  const className = `inline-flex min-h-11 items-center rounded-md px-2.5 text-sm font-medium motion-safe:active:scale-[0.98] ${
    current ? "bg-selected text-selected-ink" : "text-muted hover:bg-paper hover:text-ink"
  }`;
  if (href.includes("#")) {
    return (
      <a href={href} aria-current={current ? "page" : undefined} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} aria-current={current ? "page" : undefined} className={className}>
      {children}
      <LinkPending />
    </Link>
  );
}

function LinkPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span className="ml-1 text-xs">Opening…</span>;
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
