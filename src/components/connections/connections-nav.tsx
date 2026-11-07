"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { loadUnreadCount } from "@/app/connections/actions";
import { NavItem } from "@/components/ui/nav-item";

const links = [
  { href: "/connections/requests", label: "Board" },
  { href: "/connections/suppliers", label: "Directory" },
  { href: "/connections/inbox", label: "Inbox" },
] as const;

export function ConnectionsNav({ layout = "horizontal" }: { layout?: "horizontal" | "sidebar" }) {
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
    <nav
      aria-label="Connections"
      className={layout === "sidebar" ? "" : "border-b border-line px-4 py-2 md:px-10"}
    >
      <ul className={`flex min-w-0 gap-1 ${layout === "sidebar" ? "flex-col" : "flex-wrap"}`}>
        {links.map((link) => (
          <li key={link.href} className="min-w-0">
            <NavItem href={link.href} tone="default">
              <span className="flex min-h-6 items-center gap-2">
                {link.label}
                {link.href === "/connections/inbox" && unread ? (
                  <span className="ml-auto rounded-full bg-paper px-2 py-0.5 text-xs text-ink">
                    {unread}
                  </span>
                ) : null}
              </span>
            </NavItem>
          </li>
        ))}
      </ul>
    </nav>
  );
}
