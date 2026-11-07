"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

export function PageHeader({
  crumbs,
  title,
  meta,
  actions,
}: {
  crumbs: { href?: string; label: string }[];
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="space-y-3">
      <nav aria-label="Breadcrumb" className="meta flex flex-wrap items-center gap-1 text-muted">
        {crumbs.map((crumb, index) => (
          <span key={crumb.label} className="inline-flex items-center gap-1">
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {crumb.href ? (
              <Link href={crumb.href} className="text-accent hover:underline">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-ink">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 grid size-8 shrink-0 place-items-center rounded border border-line bg-card text-[13px] font-semibold text-accent"
          >
            ER
          </span>
          <div className="min-w-0">
            <h1 className="page-title text-balance">{title}</h1>
            {meta ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">{meta}</div>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function MetaItem({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="meta inline-flex items-center gap-1.5 text-muted">
      {icon}
      <span className="text-ink">{children}</span>
    </span>
  );
}

export function WorkFrame({ main, side }: { main: ReactNode; side: ReactNode }) {
  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
      <div className="min-w-0 space-y-4">{main}</div>
      <aside className="min-w-0 space-y-4 rounded-md border border-line bg-paper p-4">{side}</aside>
    </div>
  );
}

export function OverflowMenu({
  items,
}: {
  items: { label: string; href?: string; onSelect?: () => void }[];
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
        button.current?.focus();
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
    button.current?.focus();
  }

  return (
    <div ref={root} className="relative">
      <Button
        ref={button}
        type="button"
        variant="secondary"
        size="sm"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="More actions"
        onClick={() => setOpen((value) => !value)}
      >
        …
      </Button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-44 rounded-md border border-line bg-card py-1"
        >
          {items.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                role="menuitem"
                className="block px-3 py-2 text-sm hover:bg-paper"
                onClick={close}
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-paper"
                onClick={() => {
                  item.onSelect?.();
                  close();
                }}
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

export function askAssistant() {
  window.dispatchEvent(new Event("exportready:focus-assistant"));
}
