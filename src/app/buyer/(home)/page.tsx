import type { Metadata } from "next";

import { loadBuyerHome } from "@/components/buyer/load";
import { RequestsHome } from "@/components/buyer/requests-home";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Overview" };

export default async function BuyerOverviewPage() {
  const session = await requireSession();
  const home = await loadBuyerHome(session.user.id);
  return <RequestsHome {...home} />;
}
