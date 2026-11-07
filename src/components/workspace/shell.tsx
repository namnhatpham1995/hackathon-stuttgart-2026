"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { setTheme } from "@/app/workspace/actions";
import { Button } from "@/components/ui/button";
import { NavItem } from "@/components/ui/nav-item";
import { ConnectionsNav } from "@/components/connections/connections-nav";
import { signOut } from "@/lib/auth-client";

import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { subscribeWorkspaceDirective } from "./workspace-events";
import { DocumentIcon, PanelIcon, ProductIcon, SignOutIcon, ThemeIcon } from "./icons";

export function WorkspaceShell({
  user,
  children,
}: {
  user: { name: string; email: string };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const productId = typeof params.productId === "string" ? params.productId : undefined;
  const [assistantOpen, setAssistantOpen] = useState(false);
  const assistantDialog = useRef<HTMLDialogElement>(null);
  const assistantTrigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (assistantOpen) assistantDialog.current?.showModal();
    else assistantDialog.current?.close();
  }, [assistantOpen]);

  useEffect(
    () =>
      subscribeWorkspaceDirective((directive) => {
        if (!productId) return;
        setAssistantOpen(false);
        const base = `/workspace/${encodeURIComponent(directive.productId ?? productId)}`;
        if (directive.type === "show_report") {
          router.push(`${base}/report?result=${encodeURIComponent(directive.resultId)}`);
        } else if (directive.type === "request_replacement") {
          router.push(`${base}?replace=${encodeURIComponent(directive.documentId)}#upload-card`);
        } else if (directive.type === "navigate" && directive.view === "report") {
          router.push(`${base}/report`);
        } else if (directive.type === "navigate" && directive.view === "product") {
          router.push(`${base}?view=product#product-draft`);
        } else {
          router.push(`${base}?view=uploads#upload-card`);
        }
      }),
    [productId, router],
  );

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
          <DocumentIcon />
          <span>TradeReady</span>
        </Link>
        <div className="px-4 pt-6 pb-3">
          <p className="meta font-medium text-ink">Supplier workspace</p>
          <p className="mt-1 text-xs text-muted">Documents &amp; buyer requirements</p>
        </div>
        <nav aria-label="Primary" className="px-3">
          <NavItem href="/workspace" tone="default">
            <span className="flex items-center gap-2.5">
              <ProductIcon /> Products
            </span>
          </NavItem>
          <ConnectionsNav />
        </nav>
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
            <DocumentIcon /> TradeReady
          </Link>
          <span className="meta hidden text-muted md:inline">Supplier workspace</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="meta hidden text-muted sm:inline">{user.name}</span>
            <Button
              ref={assistantTrigger}
              type="button"
              variant="secondary"
              size="sm"
              aria-haspopup="dialog"
              aria-expanded={assistantOpen}
              onClick={() => setAssistantOpen(true)}
            >
              <PanelIcon /> Assistant
            </Button>
            <ThemeToggle />
            <div className="md:hidden">
              <SignOut compact />
            </div>
          </div>
        </header>
        <main id="workspace-main" className="workspace-main" key={pathname}>
          {children}
        </main>
      </div>
      <dialog
        ref={assistantDialog}
        aria-label="Assistant"
        className="assistant-dialog"
        onCancel={() => setAssistantOpen(false)}
        onClose={() => {
          setAssistantOpen(false);
          assistantTrigger.current?.focus();
        }}
      >
        <div className="h-full">
          <AssistantPanel
            key={productId ?? "workspace"}
            productId={productId}
            onCollapse={() => setAssistantOpen(false)}
          />
        </div>
      </dialog>
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
