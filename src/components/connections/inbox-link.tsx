import { NavItem } from "@/components/ui/nav-item";
import type { ConnectionRole } from "@/lib/connections/service";

export function InboxLink({ workspace, unread }: { workspace: ConnectionRole; unread: number }) {
  return (
    <NavItem href={workspace === "buyer" ? "/buyer/inbox" : "/workspace/inbox"} tone="default">
      <span className="flex min-h-6 items-center gap-2">
        Inbox
        {unread ? (
          <span className="ml-auto rounded-full bg-paper px-2 py-0.5 text-xs text-ink">
            {unread}
          </span>
        ) : null}
      </span>
    </NavItem>
  );
}
