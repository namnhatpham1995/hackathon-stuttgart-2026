import { NavItem } from "@/components/ui/nav-item";
import { InboxLink } from "./inbox-link";

export function ConnectionsNav({
  layout = "horizontal",
  unread = 0,
}: {
  layout?: "horizontal" | "sidebar";
  unread?: number;
}) {
  return (
    <nav
      aria-label="Supplier connections"
      className={layout === "sidebar" ? "" : "border-b border-line px-4 py-2 md:px-10"}
    >
      <ul className={`flex min-w-0 gap-1 ${layout === "sidebar" ? "flex-col" : "flex-wrap"}`}>
        <li className="min-w-0">
          <NavItem href="/workspace/requests" tone="default">
            Board
          </NavItem>
        </li>
        <li className="min-w-0">
          <InboxLink workspace="supplier" unread={unread} />
        </li>
      </ul>
    </nav>
  );
}
