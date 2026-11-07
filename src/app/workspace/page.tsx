import type { Metadata } from "next";

import { WorkspaceHome } from "@/components/workspace/workspace-home";
import { listProducts } from "@/lib/products/service";
import { loadWorkspaceProduct } from "@/lib/products/workspace";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Products" };

export default async function WorkspacePage() {
  const session = await requireSession();
  const products = await listProducts(session.user.id);
  const initial = await Promise.all(
    products.map((product) => loadWorkspaceProduct(session.user.id, product.id)),
  );
  return <WorkspaceHome initial={initial.filter((product) => product !== null)} />;
}
