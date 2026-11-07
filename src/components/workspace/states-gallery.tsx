"use client";

import { useRef } from "react";

import { Button } from "@/components/ui/button";

import { AttentionBanner } from "./attention-banner";
import { FINDING_STATUSES, type ProductDocument } from "./contract";
import { longValueProduct } from "./fixtures";
import { ProgressView } from "./progress-view";
import { ReportView } from "./report-view";
import { StatusChip } from "./status-chip";
import { UploadCard } from "./upload-card";

const cappedDocuments: ProductDocument[] = [
  ...Array.from({ length: 5 }, (_, index) => ({
    id: `pdf-${index}`,
    filename: `evidence-0${index + 1}.pdf`,
    mimeType: "application/pdf" as const,
    kind: "evidence" as const,
    sizeBytes: 200_000,
    state: "active" as const,
    replacesDocumentId: null,
  })),
  ...Array.from({ length: 2 }, (_, index) => ({
    id: `photo-${index}`,
    filename: `photo-0${index + 1}.jpg`,
    mimeType: "image/jpeg" as const,
    kind: "photo" as const,
    sizeBytes: 200_000,
    state: "active" as const,
    replacesDocumentId: null,
  })),
];

export function StatesGallery() {
  const inputRef = useRef<HTMLInputElement>(null);
  const emptyProduct = {
    ...longValueProduct,
    id: "empty-report",
    name: "Empty report",
    result: null,
    documents: [],
  };

  return (
    <div className="max-w-3xl space-y-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Interface states</h1>
        <p className="text-sm text-muted">
          Typical, empty, loading, error, long values, and the file limit. This page is not part of
          the product and is absent in production.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Status chips</h2>
        <div className="flex flex-wrap gap-2">
          {FINDING_STATUSES.map((status) => (
            <StatusChip key={status} status={status} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Empty</h2>
        <p className="text-muted">No products yet. Create one to declare a supplier profile.</p>
        <Button href="/workspace">New product</Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Loading</h2>
        <ProgressView
          jobId="demo-loading"
          startedAt={Date.now()}
          onComplete={() => undefined}
          pausedJob={{
            id: "demo-loading",
            status: "PROCESSING",
            stage: "extracting_facts",
            error: null,
            resultId: null,
          }}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Error</h2>
        <ProgressView
          jobId="demo-error"
          startedAt={Date.now()}
          onComplete={() => undefined}
          pausedJob={{
            id: "demo-error",
            status: "NEEDS_ATTENTION",
            stage: "extracting_text",
            error:
              "03_CAP104_Inspection_RevA.pdf has no readable text. Replace it with a text-based PDF and choose Upload and assess again.",
            resultId: null,
          }}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Long values</h2>
        <p className="break-words">{longValueProduct.name}</p>
        <p className="font-mono text-sm break-all">{longValueProduct.fields.partNumber?.value}</p>
        <p className="break-all text-sm">{longValueProduct.profile.targetMarket}</p>
        <Button href="/workspace/long-values">Open the long-value product</Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Limit reached</h2>
        <UploadCard
          documents={cappedDocuments}
          replacing={null}
          highlighted={false}
          pending={false}
          error="This product already has 5 PDFs. Replace one before adding another. The file was not added."
          onAdd={() => undefined}
          onStartReplace={() => undefined}
          onCancelReplace={() => undefined}
          onRemovePending={() => undefined}
          onAssess={() => undefined}
          inputRef={inputRef}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Processing incomplete</h2>
        <AttentionBanner title="Processing incomplete">
          03_CAP104_Inspection_RevA.pdf could not be read. Replace it and assess again.
        </AttentionBanner>
        <Button href="/workspace/lotus-cap-104/report?evidence=incomplete">
          Open the incomplete report
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Empty report</h2>
        <ReportView product={emptyProduct} />
      </section>
    </div>
  );
}
