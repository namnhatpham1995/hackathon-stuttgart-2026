"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavItem({
  href,
  children,
  exact = false,
  tone = "inverse",
}: {
  href: string;
  children: ReactNode;
  exact?: boolean;
  tone?: "inverse" | "default";
}) {
  const pathname = usePathname();
  const current = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const palette =
    tone === "inverse"
      ? current
        ? "bg-navy-current text-navy-ink"
        : "text-navy-muted hover:bg-navy-hover hover:text-navy-ink"
      : current
        ? "bg-paper text-ink"
        : "text-muted hover:bg-paper hover:text-ink";

  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`nav-on-navy flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium motion-safe:active:scale-[0.98] ${palette}`}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <NavPending />
    </Link>
  );
}

function NavPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span className="shrink-0 text-xs">Opening…</span>;
}
