"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { setTheme } from "@/app/workspace/actions";
import { Button } from "@/components/ui/button";
import { NavItem } from "@/components/ui/nav-item";
import { signOut } from "@/lib/auth-client";

import { AssistantPanel } from "./assistant-panel";
import { ConnectionsNav } from "./connections-nav";

export function WorkspaceShell({
  user,
  children,
}: {
  user: { name: string; email: string };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const productSegment = pathname.match(/^\/workspace\/([^/]+)/)?.[1];
  const productId =
    productSegment && productSegment !== "states" ? decodeURIComponent(productSegment) : null;

  function closeMenu() {
    setOpen(false);
    menuButton.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      menuButton.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (pathname.startsWith("/workspace")) setOpen(false);
  }, [pathname]);

  const nav = (
    <>
      <div className="px-3 pb-4">
        <p className="px-3 text-base font-semibold text-navy-ink">ExportReady</p>
        <p className="px-3 text-sm text-navy-muted">Evidence workspace</p>
      </div>
      <nav
        aria-label="Primary"
        className="flex flex-col gap-1 px-3"
        onClick={() => {
          if (!open) return;
          setOpen(false);
          menuButton.current?.focus();
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || !open) return;
          setOpen(false);
          menuButton.current?.focus();
        }}
      >
        <NavItem href="/workspace" exact>
          Products
        </NavItem>
        {productId ? (
          <>
            <NavItem href={`/workspace/${productId}`} exact>
              Product draft
            </NavItem>
            <NavItem href={`/workspace/${productId}/report`} exact>
              Evidence report
            </NavItem>
          </>
        ) : null}
      </nav>
      <ConnectionsNav />
      <div className="mt-auto space-y-3 px-3 pt-6">
        <ThemeToggle />
        <div className="min-w-0 px-3">
          <p className="truncate text-sm font-medium text-navy-ink">{user.name}</p>
          <p className="text-sm break-all text-navy-muted">{user.email}</p>
        </div>
        <SignOut />
      </div>
    </>
  );

  return (
    <div className="min-h-dvh bg-paper text-ink md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <a
        href="#workspace-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <aside className="hidden md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:overflow-y-auto md:bg-navy md:py-4">
        {nav}
      </aside>
      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-navy/50"
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-navy py-4">
            {nav}
          </div>
        </div>
      ) : null}
      <div className="min-w-0 xl:grid xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 md:hidden">
            <p className="font-semibold">ExportReady</p>
            <Button
              ref={menuButton}
              type="button"
              variant="secondary"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              Menu
            </Button>
          </header>
          <main id="workspace-main" className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
        <aside
          aria-label="Assistant"
          className="min-w-0 border-t border-line xl:sticky xl:top-0 xl:h-dvh xl:overflow-y-auto xl:border-t-0 xl:border-l"
        >
          <AssistantPanel />
        </aside>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const [label, setLabel] = useState("Dark theme");

  useEffect(() => {
    const explicit = document.documentElement.dataset.theme;
    const dark =
      explicit === "dark" ||
      (!explicit && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setLabel(dark ? "Light theme" : "Dark theme");
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
    <Button type="button" variant="secondary" className="w-full" onClick={toggle}>
      {label}
    </Button>
  );
}

function SignOut() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="secondary"
      pending={pending}
      className="w-full"
      onClick={async () => {
        setPending(true);
        await signOut();
        router.push("/");
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}
