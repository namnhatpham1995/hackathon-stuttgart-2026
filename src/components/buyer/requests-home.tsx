import { CloseRequestButton } from "@/components/buyer/close-request";
import { ConnectionStatus } from "@/components/buyer/status-chip";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/workspace/page-chrome";
import type { BuyerOverview, BuyerRequestSummary } from "@/lib/buyer/service";

const postedOn = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function RequestsHome({
  overview,
  requests,
  example,
}: {
  overview: BuyerOverview;
  requests: BuyerRequestSummary[];
  example: boolean;
}) {
  return (
    <div className="workspace-content space-y-7">
      <PageHeader
        crumbs={[{ label: "Buyer workspace" }, { label: "Overview" }]}
        title="Overview"
        meta={<span className="meta text-muted">{overviewLine(overview)}</span>}
      />
      {example ? (
        <p className="meta text-muted">Example data until the buyer service is connected.</p>
      ) : null}
      {requests.length === 0 ? <EmptyRequests /> : <RequestList requests={requests} />}
    </div>
  );
}

function EmptyRequests() {
  return (
    <section id="requests" className="scroll-mt-6 space-y-3">
      <h2 className="section-title">My requests</h2>
      <p className="max-w-prose text-muted">
        No requests yet. Post a request for a part, or ask a listed supplier for evidence.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button href="/connections/requests/new">New request</Button>
        <Button href="/buyer/products" variant="secondary">
          Find products
        </Button>
      </div>
    </section>
  );
}

function RequestList({ requests }: { requests: BuyerRequestSummary[] }) {
  return (
    <section id="requests" className="scroll-mt-6">
      <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
        <h2 className="text-sm font-medium">
          My requests <span className="ml-2 font-normal text-muted">{requests.length}</span>
        </h2>
      </div>
      <ul className="overflow-hidden rounded-b-md border-x border-b border-line">
        {requests.map((request) => (
          <li key={request.requestId} className="px-4 py-5 md:px-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="break-words font-medium">{request.title}</h3>
                <p className="meta mt-1 break-words text-muted">
                  {request.buyerOrgName}
                  <span aria-hidden="true"> · </span>
                  <span className="font-mono text-ink">{request.partNumber}</span>
                  <span aria-hidden="true"> · </span>
                  {request.visibility === "direct" ? "Direct" : "On the board"}
                  <span aria-hidden="true"> · </span>
                  {request.status === "open" ? "Open" : "Closed"}
                  <span aria-hidden="true"> · </span>
                  {postedOn.format(request.createdAt)}
                </p>
                <p className="meta mt-1 break-words text-muted">
                  Requirement set{" "}
                  <span className="font-mono text-ink">{request.requirementSetKey}</span>
                </p>
              </div>
              {request.status === "open" ? (
                <CloseRequestButton requestId={request.requestId} />
              ) : null}
            </div>
            {request.connections.length === 0 ? (
              <p className="meta mt-4 text-muted">No supplier has responded.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line border-t border-line">
                {request.connections.map((connection) => (
                  <li
                    key={connection.connectionId}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-medium">
                        {connection.supplierCompany ?? "Supplier not named"}
                      </p>
                      <p className="meta mt-0.5 break-words text-muted">
                        {connection.productName}
                        {connection.partNumber ? (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span className="font-mono">{connection.partNumber}</span>
                          </>
                        ) : null}
                        <span aria-hidden="true"> · </span>
                        {connection.initiatedBy === "buyer" ? "You asked" : "Supplier responded"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <ConnectionStatus status={connection.status} />
                      {connection.status === "shared" ? (
                        <Button
                          href={`/connections/${connection.connectionId}`}
                          variant="secondary"
                          size="sm"
                        >
                          View report
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function overviewLine(overview: BuyerOverview) {
  return [
    count(overview.openRequests, "open request", "open requests"),
    count(overview.connectedSuppliers, "connected supplier", "connected suppliers"),
    count(overview.sharedReports, "shared report", "shared reports"),
  ].join(" · ");
}

function count(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}
