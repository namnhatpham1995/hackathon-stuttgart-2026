"use client";

import { useActionState } from "react";

import { setListedAction } from "@/app/connections/actions";

type State = { error?: string; listed?: boolean } | null;

/** Visibility of one product to buyers: the state, what listing shows, and one button to change it. */
export function ListingStatus({
  productId,
  listed,
  onChanged,
}: {
  productId: string;
  listed: boolean;
  onChanged: (listed: boolean) => void;
}) {
  const [state, action, pending] = useActionState(
    async (_previous: State, formData: FormData): Promise<State> => {
      const next = formData.get("listed") === "true";
      const result = await setListedAction(null, formData);
      if (result?.error) return { error: result.error };
      onChanged(next);
      return { listed: next };
    },
    null,
  );

  return (
    <section
      aria-label="Listing for buyers"
      className="rounded-md border border-line bg-card px-4 py-3"
    >
      <form action={action} className="flex flex-wrap items-center justify-between gap-3">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="listed" value={listed ? "false" : "true"} />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium">
            {listed ? "Listed for buyers" : "Buyers can't see this product yet"}
          </p>
          {listed ? null : (
            <p className="meta text-muted">
              Listing shows only the name, part number and declared supplier profile. Your
              documents and reports stay private.
            </p>
          )}
        </div>
        <button className="btn-secondary active:scale-[0.98]" type="submit" disabled={pending}>
          {pending ? "Saving…" : listed ? "Remove from directory" : "List for buyers"}
        </button>
      </form>
      {state?.error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
    </section>
  );
}
