import type { ReactNode } from "react";

import { BuyerShell } from "@/components/buyer/shell";
import { unreadCount } from "@/lib/connections/service";
import { requireSession } from "@/lib/session";

export default async function BuyerLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();

  return (
    <BuyerShell
      user={{ name: session.user.name, email: session.user.email }}
      unread={await unreadCount(session.user.id, "buyer")}
    >
      {children}
    </BuyerShell>
  );
}
