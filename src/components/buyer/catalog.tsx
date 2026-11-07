import { ConnectionStatus } from "@/components/buyer/status-chip";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PageHeader } from "@/components/workspace/page-chrome";
import type { CatalogProduct } from "@/lib/buyer/service";

export function Catalog({
  products,
  example,
  values,
  error,
}: {
  products: CatalogProduct[];
  example: boolean;
  values: { q: string; productCategory: string; country: string };
  error: string | null;
}) {
  const filtered = Boolean(values.q || values.productCategory || values.country);

  return (
    <div className="workspace-content space-y-7">
      <PageHeader
        crumbs={[{ href: "/buyer", label: "Buyer workspace" }, { label: "Find products" }]}
        title="Find products"
        meta={
          <span className="meta text-muted">
            Listed products. The profile is declared by the supplier, not evidence.
          </span>
        }
      />
      {example ? (
        <p className="meta text-muted">Example data until the buyer service is connected.</p>
      ) : null}
      <form method="get" action="/buyer/products" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Field
            label="Search"
            name="q"
            defaultValue={values.q}
            hint="Name, part number or company"
            maxLength={100}
          />
          <Field
            label="Category"
            name="productCategory"
            defaultValue={values.productCategory}
            hint="Exact match"
            maxLength={100}
          />
          <Field
            label="Country"
            name="country"
            defaultValue={values.country}
            hint="Exact match"
            maxLength={100}
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit">Search</Button>
      </form>
      {products.length === 0 ? (
        <p className="max-w-prose text-muted">
          {filtered ? "No listed products match this search." : "No products are listed yet."}
        </p>
      ) : (
        <ul className="overflow-hidden rounded-md border border-line">
          {products.map((product) => (
            <li
              key={product.productId}
              className="border-b border-line px-4 py-5 last:border-b-0 md:px-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Button
                    href={`/buyer/products/${product.productId}`}
                    variant="ghost"
                    size="sm"
                    className="h-auto justify-start px-0 text-left"
                  >
                    <span className="break-words">{product.productName}</span>
                  </Button>
                  <p className="meta mt-1 font-mono text-ink">
                    {product.partNumber ?? "No part number"}
                  </p>
                </div>
                {product.myConnection ? (
                  <ConnectionStatus status={product.myConnection.status} />
                ) : null}
              </div>
              <p className="meta mt-4 text-muted">Declared by supplier</p>
              <p className="mt-1 break-words">
                {product.profile
                  ? `${product.profile.companyName} · ${product.profile.country} · ${product.profile.productCategory}`
                  : "No profile declared"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
