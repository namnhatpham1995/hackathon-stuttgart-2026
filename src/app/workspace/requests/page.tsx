import { RespondForm } from "@/components/connections/forms";
import { Button } from "@/components/ui/button";
import { listOpenBoard } from "@/lib/connections/service";
import { listProducts } from "@/lib/products/service";
import { requireSession } from "@/lib/session";

export default async function RequestsPage() {
  const { user } = await requireSession();
  const [board, products] = await Promise.all([listOpenBoard(user.id), listProducts(user.id)]);
  const choices = products.map((product) => ({ id: product.id, name: product.name }));

  return (
    <div className="min-w-0 space-y-6">
      <Button href="/workspace" variant="secondary">
        Back to supplier workspace
      </Button>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Request board</h1>
          <p className="mt-1 text-sm text-muted">
            Open sourcing requests. Organisation, part number and checklist only.
          </p>
        </div>
      </header>
      {board.length === 0 ? (
        <p>No open buyer requests yet. Check back for sourcing opportunities.</p>
      ) : (
        <ul className="space-y-4">
          {board.map((request) => (
            <li key={request.id} className="min-w-0 rounded-xl border border-line p-4">
              <h2 className="text-lg font-medium [overflow-wrap:anywhere]">{request.title}</h2>
              <p className="mt-1 text-sm [overflow-wrap:anywhere]">
                {request.buyerOrgName} · {request.partNumber}
              </p>
              <p className="text-sm text-muted">
                {request.requirementSetKey} v{request.requirementSetVersion}
              </p>
              {request.own ? (
                <p className="mt-3 text-sm text-muted">You posted this request.</p>
              ) : (
                <RespondForm requestId={request.id} products={choices} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
