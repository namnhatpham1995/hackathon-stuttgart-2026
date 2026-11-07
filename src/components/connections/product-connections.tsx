"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { loadProductConnections, setListedAction } from "@/app/connections/actions";
import { connectionStatusLabel } from "@/lib/connections/labels";
import type { ProductConnectionsView } from "@/lib/connections/service";

import { RespondForm } from "./forms";

export function ProductConnections({ productId }: { productId: string }) {
  const [view, setView] = useState<ProductConnectionsView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadKey refetches after listing changes
  useEffect(() => {
    let active = true;
    setLoading(true);
    loadProductConnections(productId)
      .then((result) => {
        if (!active) return;
        if ("error" in result) {
          setError(result.error ?? "The connections for this product could not be loaded.");
          setView(null);
        } else {
          setError(null);
          setView(result.data);
        }
      })
      .catch(() => {
        if (active) setError("The connections for this product could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [productId, reloadKey]);

  return (
    <section className="min-w-0 space-y-4 border-t border-line pt-4" aria-label="Buyer connections">
      <h2 className="text-sm font-semibold">Buyer connections</h2>
      {loading ? <p className="text-sm text-muted">Loading connections…</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {view ? (
        <>
          <ListingToggle
            productId={productId}
            listed={view.listed}
            onChanged={() => setReloadKey((value) => value + 1)}
          />
          {view.connections.length === 0 ? (
            <p className="text-sm text-muted">No buyer is connected to this product yet.</p>
          ) : (
            <ul className="space-y-2">
              {view.connections.map((connection) => (
                <li key={connection.id} className="min-w-0">
                  <Link
                    className="[overflow-wrap:anywhere] underline"
                    href={`/workspace/connections/${connection.id}`}
                  >
                    {connection.buyerOrgName}: {connection.title}
                  </Link>
                  <p className="text-sm text-muted">{connectionStatusLabel[connection.status]}</p>
                </li>
              ))}
            </ul>
          )}
          <div>
            <h3 className="text-sm font-medium">Open board requests</h3>
            {view.openRequests.length === 0 ? (
              <p className="mt-1 text-sm text-muted">
                No open requests. Buyers post them on the board.
              </p>
            ) : (
              <ul className="mt-2 space-y-4">
                {view.openRequests.map((request) => (
                  <li key={request.id} className="min-w-0 rounded-xl border border-line p-3">
                    <p className="font-medium [overflow-wrap:anywhere]">{request.title}</p>
                    <p className="text-sm text-muted [overflow-wrap:anywhere]">
                      {request.buyerOrgName} · {request.partNumber}
                    </p>
                    <RespondForm requestId={request.id} products={[]} fixedProductId={productId} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}

function ListingToggle({
  productId,
  listed,
  onChanged,
}: {
  productId: string;
  listed: boolean;
  onChanged: () => void;
}) {
  const [state, action, pending] = useActionState(setListedAction, null);
  const wasPending = useRef(false);
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) onChangedRef.current();
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <form action={action} className="flex min-w-0 flex-col gap-2">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="listed" value={listed ? "false" : "true"} />
      <button className="btn-secondary active:scale-[0.98]" type="submit" disabled={pending}>
        {pending
          ? "Saving…"
          : listed
            ? "Remove from the directory"
            : "List in the supplier directory"}
      </button>
      {state?.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <p className="text-sm text-muted">
        {listed
          ? "Buyers can see the name, part number and declared profile."
          : "The directory shows the name, part number and declared profile only."}
      </p>
    </form>
  );
}
