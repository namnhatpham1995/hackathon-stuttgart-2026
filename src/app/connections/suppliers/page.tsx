import { EvidenceForm } from "@/components/connections/forms";
import type { StoredSupplierProfile } from "@/lib/assessment/types";
import { listDirectory } from "@/lib/connections/service";
import { requireSession } from "@/lib/session";

export default async function SuppliersPage() {
  const { user } = await requireSession();
  const listings = await listDirectory(user.id);

  return (
    <div className="min-w-0 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Supplier directory</h1>
        <p className="mt-1 text-sm text-muted">
          Listed products show the name, part number and the profile the supplier declared. No
          documents or reports.
        </p>
      </header>
      {listings.length === 0 ? (
        <p>No products are listed yet. A supplier lists a product from their workspace.</p>
      ) : (
        <ul className="space-y-4">
          {listings.map((listing) => (
            <li key={listing.productId} className="min-w-0 rounded-xl border border-line p-4">
              <h2 className="text-lg font-medium [overflow-wrap:anywhere]">{listing.name}</h2>
              <p className="text-sm [overflow-wrap:anywhere]">
                Part number: {listing.partNumber ?? "Not declared"}
              </p>
              <Profile profile={listing.profile} />
              {listing.own ? (
                <p className="mt-3 text-sm text-muted">This is your listing.</p>
              ) : (
                <EvidenceForm productId={listing.productId} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Profile({ profile }: { profile: StoredSupplierProfile }) {
  if (!("companyName" in profile)) {
    return <p className="mt-2 text-sm text-muted">No declared supplier profile yet.</p>;
  }

  return (
    <dl className="mt-3 space-y-1 text-sm">
      <div>
        <dt className="text-muted">Declared by supplier</dt>
        <dd className="[overflow-wrap:anywhere]">{profile.companyName}</dd>
      </div>
      <div>
        <dt className="text-muted">Country</dt>
        <dd className="[overflow-wrap:anywhere]">{profile.country}</dd>
      </div>
      <div>
        <dt className="text-muted">Product category</dt>
        <dd className="[overflow-wrap:anywhere]">{profile.productCategory}</dd>
      </div>
      <div>
        <dt className="text-muted">Capabilities</dt>
        <dd className="[overflow-wrap:anywhere]">
          {profile.capabilities.length > 0 ? profile.capabilities.join(", ") : "None declared"}
        </dd>
      </div>
      <div>
        <dt className="text-muted">Target market</dt>
        <dd className="[overflow-wrap:anywhere]">{profile.targetMarket}</dd>
      </div>
    </dl>
  );
}
