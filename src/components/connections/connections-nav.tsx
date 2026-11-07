"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { loadUnreadCount } from "@/app/connections/actions";

const links = [
  { href: "/connections/requests", label: "Board" },
  { href: "/connections/suppliers", label: "Directory" },
  { href: "/connections/inbox", label: "Inbox" },
] as const;

export function ConnectionsNav() {
  const pathname = usePathname();
  const [unread, setUnread] = useState<number | null>(null);

  // Refetch after a share or a mark-read navigation, not only on mount.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the refresh signal
  useEffect(() => {
    let active = true;
    loadUnreadCount()
      .then((count) => {
        if (active) setUnread(count);
      })
      .catch(() => {
        if (active) setUnread(null);
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  return (
    <nav aria-label="Connections" className="border-b border-line px-4 py-2">
      <ul className="flex min-w-0 flex-wrap gap-1">
        {links.map((link) => {
          const current =
            link.href === "/connections/requests"
              ? pathname.startsWith("/connections/requests")
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98] ${
                  current ? "bg-accent text-accent-ink" : "text-ink"
                }`}
              >
                {link.label}
                {link.href === "/connections/inbox" && unread ? (
                  <span className="ml-2 rounded-full bg-paper px-2 py-0.5 text-xs text-ink">
                    {unread}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
