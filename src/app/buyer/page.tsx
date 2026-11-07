import type { Metadata } from "next";

import { PageHeader } from "@/components/workspace/page-chrome";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Overview" };

export default async function BuyerOverviewPage() {
  await requireSession();

  return (
    <div className="workspace-content">
      <PageHeader crumbs={[{ label: "Buyer workspace" }, { label: "Overview" }]} title="Overview" />
    </div>
  );
}
