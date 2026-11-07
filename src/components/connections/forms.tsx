"use client";

import { useActionState } from "react";

import {
  type ActionState,
  createRequestAction,
  markReadAction,
  requestEvidenceAction,
  respondAction,
  setListedAction,
  shareAction,
} from "@/app/connections/actions";

function ErrorNote({ state }: { state: ActionState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="text-sm text-danger">
      {state.error}
    </p>
  );
}

export function RequestForm() {
  const [state, action, pending] = useActionState(createRequestAction, null);

  return (
    <form action={action} className="flex min-w-0 flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm" htmlFor="buyerOrgName">
        Organisation
        <input className="field" id="buyerOrgName" name="buyerOrgName" required maxLength={300} />
      </label>
      <label className="flex flex-col gap-1 text-sm" htmlFor="title">
        Title
        <input className="field" id="title" name="title" required maxLength={300} />
      </label>
      <label className="flex flex-col gap-1 text-sm" htmlFor="partNumber">
        Part number
        <input className="field" id="partNumber" name="partNumber" required maxLength={300} />
      </label>
      <label className="flex flex-col gap-1 text-sm" htmlFor="requirementSetKey">
        Checklist
        <select className="field" id="requirementSetKey" name="requirementSetKey" required>
          <option value="neckar-cap-104">neckar-cap-104</option>
        </select>
      </label>
      <input type="hidden" name="requirementSetVersion" value="1" />
      <label className="flex flex-col gap-1 text-sm" htmlFor="message">
        Message
        <textarea
          className="field min-h-28 py-2"
          id="message"
          name="message"
          maxLength={1000}
          placeholder="Optional. 1000 characters at most."
        />
      </label>
      <ErrorNote state={state} />
      <button className="btn-primary active:scale-[0.98]" type="submit" disabled={pending}>
        {pending ? "Posting…" : "Post request"}
      </button>
    </form>
  );
}

export function RespondForm({
  requestId,
  products,
  fixedProductId,
}: {
  requestId: string;
  products: { id: string; name: string }[];
  fixedProductId?: string;
}) {
  const [state, action, pending] = useActionState(respondAction, null);
  const productId = fixedProductId ?? "";

  return (
    <form action={action} className="mt-3 flex min-w-0 flex-col gap-3">
      <input type="hidden" name="requestId" value={requestId} />
      {fixedProductId ? <input type="hidden" name="productId" value={productId} /> : null}
      {fixedProductId ? null : (
        <>
          <label className="flex flex-col gap-1 text-sm" htmlFor={`product-${requestId}`}>
            Existing product
            <select className="field" id={`product-${requestId}`} name="productId" defaultValue="">
              <option value="">Choose a product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm" htmlFor={`new-${requestId}`}>
            Or a new product name
            <input
              className="field"
              id={`new-${requestId}`}
              name="newProductName"
              maxLength={300}
            />
          </label>
        </>
      )}
      <label className="flex flex-col gap-1 text-sm" htmlFor={`message-${requestId}`}>
        Message
        <textarea
          className="field min-h-20 py-2"
          id={`message-${requestId}`}
          name="message"
          maxLength={1000}
        />
      </label>
      <ErrorNote state={state} />
      <button className="btn-primary active:scale-[0.98]" type="submit" disabled={pending}>
        {pending ? "Responding…" : "Respond"}
      </button>
    </form>
  );
}

export function EvidenceForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState(requestEvidenceAction, null);

  return (
    <form action={action} className="mt-3 flex min-w-0 flex-col gap-3">
      <input type="hidden" name="productId" value={productId} />
      <label className="flex flex-col gap-1 text-sm" htmlFor={`org-${productId}`}>
        Your organisation
        <input
          className="field"
          id={`org-${productId}`}
          name="buyerOrgName"
          required
          maxLength={300}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm" htmlFor={`evidence-message-${productId}`}>
        Message
        <textarea
          className="field min-h-20 py-2"
          id={`evidence-message-${productId}`}
          name="message"
          maxLength={1000}
        />
      </label>
      <ErrorNote state={state} />
      <button className="btn-secondary active:scale-[0.98]" type="submit" disabled={pending}>
        {pending ? "Requesting…" : "Request evidence"}
      </button>
    </form>
  );
}

export function ShareForm({
  connectionId,
  results,
  sharedResultId,
}: {
  connectionId: string;
  results: { id: string; assessmentDate: string }[];
  sharedResultId: string | null;
}) {
  const [state, action, pending] = useActionState(shareAction, null);

  if (results.length === 0) {
    return (
      <p className="text-sm text-muted">
        No completed assessment is stored for this product yet. Assess it, then share the result.
      </p>
    );
  }

  return (
    <form action={action} className="flex min-w-0 flex-col gap-3">
      <input type="hidden" name="connectionId" value={connectionId} />
      <label className="flex flex-col gap-1 text-sm" htmlFor={`result-${connectionId}`}>
        Completed result
        <select
          className="field"
          id={`result-${connectionId}`}
          name="resultId"
          defaultValue={sharedResultId ?? results[0]?.id}
        >
          {results.map((result) => (
            <option key={result.id} value={result.id}>
              {result.assessmentDate}
              {result.id === sharedResultId ? " (shared)" : ""}
            </option>
          ))}
        </select>
      </label>
      <ErrorNote state={state} />
      <button className="btn-primary active:scale-[0.98]" type="submit" disabled={pending}>
        {pending ? "Sharing…" : sharedResultId ? "Re-share" : "Share"}
      </button>
    </form>
  );
}

export function ListedForm({ productId, listed }: { productId: string; listed: boolean }) {
  const [state, action, pending] = useActionState(setListedAction, null);

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
      <ErrorNote state={state} />
    </form>
  );
}

export function MarkReadForm({ notificationId }: { notificationId: string }) {
  const [state, action, pending] = useActionState(markReadAction, null);

  return (
    <form action={action}>
      <input type="hidden" name="notificationId" value={notificationId} />
      <ErrorNote state={state} />
      <button className="btn-secondary active:scale-[0.98]" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Mark read"}
      </button>
    </form>
  );
}
