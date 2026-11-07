"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { loadShareTargets } from "@/app/connections/actions";
import { connectionStatusLabel } from "@/lib/connections/labels";
import type { ShareTarget } from "@/lib/connections/service";

import { ShareForm } from "./forms";

export function ReportShare({ resultId }: { resultId: string }) {
  const [targets, setTargets] = useState<ShareTarget[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadShareTargets(resultId)
      .then((result) => {
        if (!active) return;
        if ("error" in result) {
          setError(result.error ?? "Sharing could not be loaded.");
          setTargets(null);
        } else {
          setError(null);
          setTargets(result.data);
        }
      })
      .catch(() => {
        if (active) setError("Sharing could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [resultId]);

  return (
    <section className="min-w-0 space-y-3 rounded-xl border border-line p-4" aria-label="Share">
      <h2 className="text-sm font-semibold">Share with a buyer</h2>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {targets === null && !error ? <p className="text-sm text-muted">Loading buyers…</p> : null}
      {targets && targets.length === 0 ? (
        <p className="text-sm text-muted">
          No buyer is connected to this product yet.{" "}
          <Link className="underline" href="/workspace/requests">
            Respond to a request on the board
          </Link>
          .
        </p>
      ) : null}
      {targets && targets.length > 0 ? (
        <ul className="space-y-4">
          {targets.map((target) => (
            <li key={target.connectionId} className="min-w-0">
              <p className="font-medium [overflow-wrap:anywhere]">{target.buyerOrgName}</p>
              <p className="text-sm text-muted [overflow-wrap:anywhere]">
                {target.requestTitle} · {connectionStatusLabel[target.status]}
              </p>
              <div className="mt-2">
                <ShareForm
                  connectionId={target.connectionId}
                  results={[{ id: resultId, assessmentDate: "This result" }]}
                  sharedResultId={target.sharedResultId === resultId ? resultId : null}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
