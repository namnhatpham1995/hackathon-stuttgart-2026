import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/workspace/page-chrome";

export default function CatalogProductNotFound() {
  return (
    <div className="workspace-content space-y-4">
      <PageHeader
        crumbs={[
          { href: "/buyer", label: "Buyer workspace" },
          { href: "/buyer/products", label: "Find products" },
          { label: "Not found" },
        ]}
        title="Product not found"
      />
      <p className="max-w-prose text-muted">
        This product is not listed. Your own products are in the{" "}
        <Link href="/workspace" className="text-accent hover:underline">
          supplier workspace
        </Link>
        .
      </p>
      <Button href="/buyer/products" variant="secondary">
        Find products
      </Button>
    </div>
  );
}
