import type { ReactNode } from "react";

import { ExpiredIcon } from "./icons";

/** Section message for an expired certificate or processing that did not finish. */
export function AttentionBanner({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      className="flex gap-2 rounded-md border border-banner-border bg-banner px-3 py-2 text-banner-ink"
      role="status"
    >
      <ExpiredIcon />
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <div className="mt-1 text-sm">{children}</div>
      </div>
    </div>
  );
}
