"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
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
  const [assistantOpen, setAssistantOpen] = useState(false);
  const productSegment = pathname.match(/^\/workspace\/([^/]+)/)?.[1];
  const productId =
    productSegment && productSegment !== "states" ? decodeURIComponent(productSegment) : null;

  useEffect(() => {
    function onFocus() {
      setAssistantOpen(true);
    }
    window.addEventListener("exportready:focus-assistant", onFocus);
    return () => window.removeEventListener("exportready:focus-assistant", onFocus);
  }, []);

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <a
        href="#workspace-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-card px-4 py-2">
        <p className="text-sm font-semibold text-accent">ExportReady</p>
        <nav aria-label="Primary" className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          <NavItem href="/workspace" exact tone="default">
            Products
          </NavItem>
          {productId ? (
            <>
              <NavItem href={`/workspace/${productId}`} exact tone="default">
                Product
              </NavItem>
              <NavItem href={`/workspace/${productId}/report`} exact tone="default">
                Report
              </NavItem>
            </>
          ) : null}
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAssistantOpen((value) => !value)}
          >
            {assistantOpen ? "Hide assistant" : "Assistant"}
          </Button>
          <ThemeToggle />
          <span className="meta hidden text-muted sm:inline">{user.name}</span>
          <SignOut />
        </div>
      </header>
      <ConnectionsNav />
      <div className={assistantOpen ? "xl:grid xl:grid-cols-[280px_minmax(0,1fr)]" : undefined}>
        {assistantOpen ? (
          <aside
            aria-label="Assistant"
            className="min-w-0 border-b border-line xl:sticky xl:top-0 xl:h-[calc(100dvh-3.25rem)] xl:overflow-y-auto xl:border-r xl:border-b-0"
          >
            <AssistantPanel onCollapse={() => setAssistantOpen(false)} />
          </aside>
        ) : null}
        <main id="workspace-main" className="min-w-0 px-4 py-4 sm:px-6">
          {children}
        </main>
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
    <Button type="button" variant="secondary" size="sm" onClick={toggle}>
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
      size="sm"
      pending={pending}
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
