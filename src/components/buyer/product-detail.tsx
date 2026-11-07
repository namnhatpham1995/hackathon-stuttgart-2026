import { EvidenceForm } from "@/components/buyer/evidence-form";
import { ConnectionStatus } from "@/components/buyer/status-chip";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/workspace/page-chrome";
import type { SupplierProfile } from "@/lib/assessment/types";
import type { BuyerConnectionStatus, CatalogProduct } from "@/lib/buyer/service";

export function ProductDetail({ product, example }: { product: CatalogProduct; example: boolean }) {
  return (
    <div className="workspace-content space-y-8">
      <PageHeader
        crumbs={[
          { href: "/buyer", label: "Buyer workspace" },
          { href: "/buyer/products", label: "Find products" },
          { label: product.productName },
        ]}
        title={product.productName}
        meta={
          <>
            <span className="meta font-mono break-all text-ink">
              {product.partNumber ?? "No part number"}
            </span>
            {example ? <span className="meta text-muted">Example data</span> : null}
          </>
        }
      />
      <section className="max-w-3xl">
        <h2 className="section-title">Declared by supplier</h2>
        {product.profile ? (
          <ProfileFacts profile={product.profile} />
        ) : (
          <p className="mt-3 max-w-prose text-muted">The supplier has not declared a profile.</p>
        )}
      </section>
      <section className="max-w-xl">
        <h2 className="section-title">Evidence</h2>
        <div className="mt-4">
          {product.myConnection ? (
            <ExistingConnection
              connectionId={product.myConnection.connectionId}
              status={product.myConnection.status}
            />
          ) : (
            <EvidenceForm productId={product.productId} />
          )}
        </div>
      </section>
    </div>
  );
}

function ProfileFacts({ profile }: { profile: SupplierProfile }) {
  const facts = [
    ["Company", profile.companyName],
    ["Country", profile.country],
    ["Category", profile.productCategory],
    ["Capabilities", profile.capabilities.join(", ") || "—"],
    ["Target market", profile.targetMarket],
  ] as const;
  return (
    <dl className="mt-4 divide-y divide-line border-y border-line">
      {facts.map(([term, value]) => (
        <div key={term} className="grid gap-1 py-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4">
          <dt className="meta text-muted">{term}</dt>
          <dd className="min-w-0 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ExistingConnection({
  connectionId,
  status,
}: {
  connectionId: string;
  status: BuyerConnectionStatus;
}) {
  return (
    <div className="space-y-3">
      <ConnectionStatus status={status} />
      <p className="max-w-prose text-sm text-muted">
        Evidence has already been requested for this product.
      </p>
      {status === "shared" ? (
        <Button href={`/connections/${connectionId}`} variant="secondary" size="sm">
          View report
        </Button>
      ) : null}
    </div>
  );
}
