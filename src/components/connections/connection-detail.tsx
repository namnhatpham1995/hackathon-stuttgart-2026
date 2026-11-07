import { notFound, redirect } from "next/navigation";
import { ZodError } from "zod";

import { ListedForm, ShareForm } from "@/components/connections/forms";
import { SharedFindings } from "@/components/connections/shared-findings";
import { Button } from "@/components/ui/button";
import { connectionStatusLabel } from "@/lib/connections/labels";
import {
  ConnectionRequestError,
  type ConnectionRole,
  getSharedResult,
  listCompletedResults,
  requireConnection,
} from "@/lib/connections/service";
import { requireSession } from "@/lib/session";

export async function ConnectionDetail({
  connectionId,
  role,
}: {
  connectionId: string;
  role?: ConnectionRole;
}) {
  const { user } = await requireSession();

  let view: Awaited<ReturnType<typeof requireConnection>>;
  try {
    view = await requireConnection(user.id, connectionId);
  } catch (error) {
    if (error instanceof ConnectionRequestError && error.status === 404) notFound();
    if (error instanceof ZodError) notFound();
    throw error;
  }

  const workspace = view.role === "buyer" ? "/buyer" : "/workspace";
  if (!role) redirect(`${workspace}/connections/${encodeURIComponent(view.id)}`);
  if (view.role !== role) notFound();

  const shared = await getSharedResult(user.id, view.id);
  const results = view.role === "supplier" ? await listCompletedResults(user.id, view.id) : [];

  return (
    <div className="min-w-0 space-y-6">
      <Button href={workspace} variant="secondary">
        Back to {role} workspace
      </Button>
      <header>
        <p className="text-sm text-muted">{connectionStatusLabel[view.status]}</p>
        <h1 className="text-2xl font-semibold tracking-tight [overflow-wrap:anywhere]">
          {view.requestTitle}
        </h1>
        <p className="mt-1 [overflow-wrap:anywhere]">
          {view.buyerOrgName} · {view.partNumber}
        </p>
        <p className="text-sm text-muted">{view.requirementSetKey}</p>
        <p className="text-sm text-muted">Product: {view.productName}</p>
        <p className="text-sm text-muted">Supplier: {view.supplierCompany}</p>
      </header>
      {view.requestMessage ? (
        <p className="[overflow-wrap:anywhere]">
          <span className="text-muted">Request: </span>
          {view.requestMessage}
        </p>
      ) : null}
      {view.message ? (
        <p className="[overflow-wrap:anywhere]">
          <span className="text-muted">Message: </span>
          {view.message}
        </p>
      ) : null}
      {view.role === "supplier" ? (
        <section className="space-y-3 rounded-xl border border-line p-4" aria-label="Directory">
          <h2 className="text-sm font-semibold">Supplier directory</h2>
          <ListedForm productId={view.productId} listed={view.listed} />
        </section>
      ) : null}
      {view.role === "supplier" ? (
        <section className="space-y-3 rounded-xl border border-line p-4" aria-label="Share">
          <h2 className="text-sm font-semibold">Share a result</h2>
          <ShareForm
            connectionId={view.id}
            results={results}
            sharedResultId={view.sharedResultId}
          />
        </section>
      ) : null}
      {shared ? (
        <SharedFindings result={shared} />
      ) : (
        <p>No evidence report has been shared on this connection yet.</p>
      )}
    </div>
  );
}
