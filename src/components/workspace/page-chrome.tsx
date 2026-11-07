"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  crumbs,
  title,
  meta,
  actions,
}: {
  crumbs: { href?: string; label: string }[];
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header space-y-4">
      <nav aria-label="Breadcrumb" className="meta flex flex-wrap items-center gap-1.5 text-muted">
        {crumbs.map((crumb, index) => (
          <span key={crumb.label} className="inline-flex items-center gap-1">
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {crumb.href ? (
              <Link href={crumb.href} className="text-accent hover:underline">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-ink">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="page-title break-words">{title}</h1>
          {meta ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">{meta}</div>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function MetaItem({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="meta inline-flex items-center gap-1.5 text-muted">
      {icon}
      <span className="text-ink">{children}</span>
    </span>
  );
}

export function ProductNav({
  productId,
  current,
}: {
  productId: string;
  current: "documents" | "report";
}) {
  return (
    <nav className="product-nav" aria-label="Product">
      <Link
        href={`/workspace/${productId}`}
        aria-current={current === "documents" ? "page" : undefined}
      >
        Documents
      </Link>
      <Link
        href={`/workspace/${productId}/report`}
        aria-current={current === "report" ? "page" : undefined}
      >
        Evidence report
      </Link>
    </nav>
  );
}
