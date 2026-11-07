import type { Metadata } from "next";

import type { WorkspaceProduct } from "@/components/workspace/contract";
import {
  applyPack,
  correctedProduct,
  type EvidencePack,
  fixtureById,
  isEvidencePack,
} from "@/components/workspace/fixtures";
import { ReportScreen } from "@/components/workspace/report-screen";
import { loadWorkspaceProduct } from "@/lib/products/workspace";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Evidence report" };

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ evidence?: string; result?: string }>;
}) {
  const session = await requireSession();
  const { productId } = await params;
  const { evidence, result } = await searchParams;
  const fixture = fixtureById(productId);
  const requested = isEvidencePack(evidence) ? evidence : null;
  const initial =
    (await loadWorkspaceProduct(session.user.id, productId, result)) ??
    initialProduct(fixture, requested);

  return <ReportScreen productId={productId} initial={initial} />;
}

function initialProduct(
  fixture: WorkspaceProduct | null,
  requested: EvidencePack | null,
): WorkspaceProduct | null {
  if (!fixture) return null;
  const pack = requested ?? (fixture.id === correctedProduct.id ? "corrected" : "baseline");
  return applyPack(fixture, pack);
}
