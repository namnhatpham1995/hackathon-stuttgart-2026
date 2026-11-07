"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { setTheme } from "@/app/workspace/actions";
import { AssistantDock } from "@/components/assistant/assistant-dock";
import { clearAssistantHistory } from "@/components/assistant/assistant-history";
import { InboxLink } from "@/components/connections/inbox-link";
import { BrandMark } from "@/components/ui/brand-mark";
import { Button } from "@/components/ui/button";
import { WorkspaceSwitcher } from "@/components/ui/workspace-switcher";
import { CloseIcon, PanelIcon, SignOutIcon, ThemeIcon } from "@/components/workspace/icons";
import { signOut } from "@/lib/auth-client";

export function BuyerShell({
  user,
  unread,
  children,
}: {
  user: { name: string; email: string };
  unread: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  const navigationDialog = useRef<HTMLDialogElement>(null);
  const navigationTrigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setHash(pathname === "/buyer" ? window.location.hash : "");
  }, [pathname]);
  useEffect(() => {
    const read = () => setHash(window.location.hash);
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const onOverview = pathname === "/buyer";
  const onRequests =
    (onOverview && hash === "#requests") ||
    pathname.startsWith("/buyer/requests") ||
    pathname.startsWith("/buyer/connections");
  const sidebar = (
    <>
      <Link href="/buyer" className="workspace-brand">
        <BrandMark />
        <span>TradeReady</span>
      </Link>
      <div className="px-4 pt-6 pb-3">
        <p className="meta font-medium text-ink">Buyer workspace</p>
        <p className="mt-1 text-xs text-muted">Requests &amp; supplier evidence</p>
      </div>
      <div className="px-3 pb-3">
        <Button href="/buyer/requests/new" className="mb-4 w-full">
          New request
        </Button>
        <nav aria-label="Buyer" className="flex flex-col gap-1">
          <BuyerLink href="/buyer" current={onOverview && !onRequests}>
            Overview
          </BuyerLink>
          <BuyerLink href="/buyer#requests" current={onRequests}>
            My requests
          </BuyerLink>
          <BuyerLink href="/buyer/products" current={pathname.startsWith("/buyer/products")}>
            Find products
          </BuyerLink>
          <InboxLink workspace="buyer" unread={unread} />
        </nav>
      </div>
      <div className="mt-auto border-t border-line p-4">
        <p className="truncate text-[13px] font-medium">{user.name}</p>
        <p className="mt-1 truncate text-xs text-muted">{user.email}</p>
        <div className="mt-4">
          <SignOut />
        </div>
      </div>
    </>
  );

  return (
    <div className="workspace-shell min-h-dvh bg-card text-ink">
      <a
        href="#buyer-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-card focus:px-4 focus:py-3"
      >
        Skip to content
      </a>
      <aside className="workspace-sidebar">{sidebar}</aside>
      <div className="min-w-0">
        <header className="workspace-topbar">
          <div className="md:hidden">
            <Button
              ref={navigationTrigger}
              variant="ghost"
              size="sm"
              aria-label="Open buyer navigation"
              aria-controls="buyer-navigation"
              aria-haspopup="dialog"
              onClick={() => navigationDialog.current?.showModal()}
            >
              <PanelIcon />
            </Button>
          </div>
          <Link href="/buyer" aria-label="TradeReady" className="md:hidden">
            <BrandMark />
          </Link>
          <WorkspaceSwitcher className="order-last w-full lg:order-none lg:w-auto" />
          <div className="ml-auto flex items-center gap-3">
            <span className="meta hidden max-w-40 truncate text-muted lg:inline">{user.name}</span>
            <AssistantDock />
            <ThemeToggle />
            <div className="md:hidden">
              <SignOut compact />
            </div>
          </div>
        </header>
        <main id="buyer-main" className="workspace-main">
          {children}
        </main>
      </div>
      <dialog
        ref={navigationDialog}
        id="buyer-navigation"
        aria-label="Buyer navigation"
        className="buyer-navigation-dialog"
        onClose={() => navigationTrigger.current?.focus()}
        onClickCapture={(event) => {
          if (event.target instanceof Element && event.target.closest("a"))
            navigationDialog.current?.close();
        }}
      >
        <div className="flex min-h-dvh flex-col">
          <div className="flex justify-end border-b border-line p-3">
            <Button variant="ghost" size="sm" onClick={() => navigationDialog.current?.close()}>
              <CloseIcon /> Close navigation
            </Button>
          </div>
          {sidebar}
        </div>
      </dialog>
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
  const className = `flex min-h-11 items-center rounded-md px-2.5 text-sm font-medium motion-safe:active:scale-[0.98] ${
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
