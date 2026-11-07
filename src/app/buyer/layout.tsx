import type { ReactNode } from "react";

import { BuyerShell } from "@/components/buyer/shell";
import { requireSession } from "@/lib/session";

export default async function BuyerLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();

  return (
    <BuyerShell user={{ name: session.user.name, email: session.user.email }}>
      {children}
    </BuyerShell>
  );
}
