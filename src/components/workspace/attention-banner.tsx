import type { ReactNode } from "react";

/** Amber left-border banner for an expired certificate or processing that did not finish. */
export function AttentionBanner({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      className="border-l-4 border-banner-border bg-banner px-4 py-3 text-banner-ink"
      role="status"
    >
      <p className="font-medium">{title}</p>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}
