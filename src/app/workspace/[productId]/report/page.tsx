import type { Metadata } from "next";

import type { WorkspaceProduct } from "@/components/workspace/contract";
import {
  applyPack,
  correctedProduct,
  type EvidencePack,
  fixtureById,
  isEvidencePack,
  lotusProfile,
} from "@/components/workspace/fixtures";
import { ReportScreen } from "@/components/workspace/report-screen";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Evidence report" };

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ evidence?: string }>;
}) {
  await requireSession();
  const { productId } = await params;
  const { evidence } = await searchParams;
  const fixture = fixtureById(productId);
  const requested = isEvidencePack(evidence) ? evidence : null;
  const initial = initialProduct(productId, fixture, requested);

  return <ReportScreen productId={productId} initial={initial} />;
}

function initialProduct(
  productId: string,
  fixture: WorkspaceProduct | null,
  requested: EvidencePack | null,
): WorkspaceProduct | null {
  if (fixture) {
    const pack = requested ?? (fixture.id === correctedProduct.id ? "corrected" : "baseline");
    return applyPack(fixture, pack);
  }
  if (!requested) return null;
  return applyPack(
    {
      id: productId,
      name: "Product",
      requirementSetKey: "neckar-cap-104",
      requirementSetVersion: 1,
      fields: {},
      profile: { ...lotusProfile, companyName: "Declared profile loads with the product" },
      documents: [],
      result: null,
    },
    requested,
  );
}
