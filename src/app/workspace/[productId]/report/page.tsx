import type { Metadata } from "next";

import { ReportScreen } from "@/components/workspace/report-screen";
import { loadWorkspaceProduct } from "@/lib/products/workspace";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Evidence report" };

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ result?: string }>;
}) {
  const session = await requireSession();
  const { productId } = await params;
  const { result } = await searchParams;
  const initial = await loadWorkspaceProduct(session.user.id, productId, result ?? undefined);

  return <ReportScreen productId={productId} initial={initial} />;
}
