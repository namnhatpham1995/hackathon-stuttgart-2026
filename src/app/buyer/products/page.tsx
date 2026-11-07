import type { Metadata } from "next";

import { Catalog } from "@/components/buyer/catalog";
import { loadCatalog } from "@/components/buyer/load";
import { catalogSearchInput } from "@/lib/buyer/service";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Find products" };

function first(value: string | string[] | undefined) {
  const picked = Array.isArray(value) ? value[0] : value;
  const trimmed = picked?.trim() ?? "";
  return trimmed;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    productCategory?: string | string[];
    country?: string | string[];
  }>;
}) {
  const session = await requireSession();
  const raw = await searchParams;
  const values = {
    q: first(raw.q),
    productCategory: first(raw.productCategory),
    country: first(raw.country),
  };
  const parsed = catalogSearchInput.safeParse({
    q: values.q || undefined,
    productCategory: values.productCategory || undefined,
    country: values.country || undefined,
  });

  if (!parsed.success) {
    return (
      <Catalog
        products={[]}
        example={false}
        values={values}
        error="Use 100 characters or fewer in each filter."
      />
    );
  }

  const catalog = await loadCatalog(session.user.id, parsed.data);
  return <Catalog {...catalog} values={values} error={null} />;
}
