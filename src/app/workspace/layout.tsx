import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/workspace/shell";
import { unreadCount } from "@/lib/connections/service";
import { requireSession } from "@/lib/session";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();

  return (
    <WorkspaceShell
      user={{ name: session.user.name, email: session.user.email }}
      unread={await unreadCount(session.user.id, "supplier")}
    >
      {children}
    </WorkspaceShell>
  );
}
