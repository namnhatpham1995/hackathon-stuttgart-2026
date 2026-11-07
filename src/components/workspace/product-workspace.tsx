"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  finaliseWorkspaceDocuments,
  readWorkspace,
  undoWorkspaceUpload,
} from "@/app/workspace/actions";
import { ProductConnections } from "@/components/connections/product-connections";
import { Button } from "@/components/ui/button";
import { checklistFor } from "./checklists";
import type { WorkspaceProduct } from "./contract";
import { rejectionForFile } from "./documents";
import { DraftForm } from "./draft-form";
import { ListingStatus } from "./listing-status";
import { MetaItem, PageHeader, ProductNav } from "./page-chrome";
import { ProgressView } from "./progress-view";
import { UploadCard } from "./upload-card";
import { startAssessmentRequest, uploadDocumentRequest } from "./workspace-api";
import { subscribeWorkspaceDirective } from "./workspace-events";

type LiveJob = { id: string; startedAt: number };

export function ProductWorkspace({
  productId,
  initial,
  replaceDocumentId,
}: {
  productId: string;
  initial: WorkspaceProduct | null;
  replaceDocumentId?: string;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const [uploading, setUploading] = useState(false);
  const [product, setProduct] = useState<WorkspaceProduct | null>(initial);
  const [ready, setReady] = useState(Boolean(initial));
  const [replacingId, setReplacingId] = useState<string | null>(replaceDocumentId ?? null);
  const [highlighted, setHighlighted] = useState(Boolean(replaceDocumentId));
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [assessing, setAssessing] = useState(false);
  const [job, setJob] = useState<LiveJob | null>(initial?.job ?? null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProduct(initial);
    setJob(initial?.job ?? null);
    setReady(true);
  }, [initial]);

  useEffect(() => {
    if (!replaceDocumentId) return;
    setReplacingId(replaceDocumentId);
    setHighlighted(true);
    document.getElementById("upload-card")?.scrollIntoView({ block: "start" });
  }, [replaceDocumentId]);

  const revealUpload = useCallback(() => {
    setHighlighted(true);
    document.getElementById("upload-card")?.scrollIntoView({ block: "start" });
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const view = search.get("view");
    if (view === "uploads") revealUpload();
    if (view === "product") {
      const draft = document.getElementById("product-draft");
      const details = draft?.closest("details");
      if (details) details.open = true;
      draft?.scrollIntoView({ block: "start" });
    }
    return subscribeWorkspaceDirective((directive) => {
      if (
        directive.type === "show_upload_card" &&
        (!directive.productId || directive.productId === productId)
      )
        revealUpload();
    });
  }, [search, revealUpload, productId]);

  function update(next: WorkspaceProduct) {
    setProduct(next);
  }

  async function addFiles(selected: File[], requirementId?: string) {
    if (!product) return;
    if (replacingId && selected.length !== 1) {
      setUploadError("Choose one file to replace this document. The batch was not changed.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    const documents = [...product.documents];
    try {
      for (const file of selected) {
        const rejection = rejectionForFile(file, documents, replacingId);
        if (rejection) throw new Error(rejection);
        const document = await uploadDocumentRequest(productId, file, replacingId);
        documents.push({ ...document, requirementId });
        update({ ...product, documents: [...documents] });
      }
      setReplacingId(null);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "The file could not be uploaded. Try again.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function assess() {
    if (!product) return;
    setAssessing(true);
    setUploadError(null);
    try {
      const documents = await finaliseWorkspaceDocuments(productId);
      update({ ...product, documents });
      const started = await startAssessmentRequest(productId);
      setJob({ id: started.id, startedAt: Date.now() });
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "The assessment could not start. Try again.",
      );
    } finally {
      setAssessing(false);
    }
  }

  if (!ready) {
    return (
      <p className="text-sm text-muted" role="status">
        Loading the product…
      </p>
    );
  }

  if (!product) {
    return (
      <section className="max-w-xl space-y-3">
        <h1 className="page-title">Product not found</h1>
        <p className="text-muted">
          This product is not in your workspace. It may belong to someone else, or it was never
          created.
        </p>
        <Button href="/workspace" variant="secondary">
          Back to products
        </Button>
      </section>
    );
  }

  const replacing = product.documents.find((document) => document.id === replacingId) ?? null;

  const open = product.result?.findings.filter((finding) => finding.status !== "DOCUMENTED").length;

  return (
    <div className="workspace-content space-y-6">
      <PageHeader
        crumbs={[{ href: "/workspace", label: "Products" }, { label: product.name }]}
        title={product.name}
        meta={
          <>
            <MetaItem>{product.profile.companyName}</MetaItem>
            <MetaItem>
              <span className="font-mono">
                {product.fields.partNumber?.value ?? "No part number"} · Rev{" "}
                {product.fields.revision?.value ?? "—"}
              </span>
            </MetaItem>
            <MetaItem>Buyer requirements v{product.requirementSetVersion}</MetaItem>
            {open !== undefined ? (
              <MetaItem>
                {job ? "Assessment in progress" : open === 1 ? "1 open" : `${open} open`}
              </MetaItem>
            ) : null}
          </>
        }
        actions={
          product.result ? (
            <Button href={`/workspace/${product.id}/report`} variant="secondary">
              View report
            </Button>
          ) : null
        }
      />
      <ProductNav productId={product.id} current="documents" />
      <ListingStatus
        productId={product.id}
        listed={product.listed}
        onChanged={(listed) => update({ ...product, listed })}
      />
      <UploadCard
        checklist={checklistFor(product.requirementSetKey, product.requirementSetVersion)}
        documents={product.documents}
        replacing={replacing}
        highlighted={highlighted}
        pending={uploading || assessing}
        error={uploadError}
        onAdd={(selected, requirementId) => void addFiles(selected, requirementId)}
        findings={job ? undefined : product.result?.findings}
        onStartReplace={(id) => {
          setReplacingId(id);
          setHighlighted(true);
        }}
        onCancelReplace={() => setReplacingId(null)}
        canAssess={product.documents.some((document) => document.kind === "evidence")}
        onRemovePending={(id) => {
          setUploading(true);
          void undoWorkspaceUpload(productId, id)
            .then(() => {
              update({
                ...product,
                documents: product.documents.filter((document) => document.id !== id),
              });
            })
            .catch(() => setUploadError("The upload could not be undone. Try again."))
            .finally(() => setUploading(false));
        }}
        onAssess={() => void assess()}
        inputRef={inputRef}
      />
      {job ? (
        <ProgressView
          key={`${job.id}-${job.startedAt}`}
          jobId={job.id}
          startedAt={job.startedAt}
          onComplete={() => {
            void readWorkspace(productId)
              .then((stored) => {
                if (stored) update(stored);
                setJob(null);
                router.push(`/workspace/${productId}/report`);
                router.refresh();
              })
              .catch(() =>
                setUploadError("The saved report could not be opened. Refresh this page."),
              );
          }}
        />
      ) : null}
      <details className="rounded-md border border-line bg-card px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium">Product details</summary>
        <div className="mt-4 space-y-4">
          <p className="meta text-muted">Declared by supplier</p>
          <ProfileSummary product={product} />
          <DraftForm product={product} onSaved={update} />
          <ProductConnections productId={product.id} />
        </div>
      </details>
    </div>
  );
}

function ProfileSummary({ product }: { product: WorkspaceProduct }) {
  return (
    <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
      <div className="min-w-0">
        <dt className="text-muted">Company</dt>
        <dd className="break-words">{product.profile.companyName}</dd>
      </div>
      <div>
        <dt className="text-muted">Country</dt>
        <dd>{product.profile.country}</dd>
      </div>
      <div className="min-w-0">
        <dt className="text-muted">Category</dt>
        <dd className="break-words">{product.profile.productCategory}</dd>
      </div>
      <div className="min-w-0">
        <dt className="text-muted">Target market</dt>
        <dd className="break-words">{product.profile.targetMarket}</dd>
      </div>
      <div className="min-w-0 sm:col-span-2">
        <dt className="text-muted">Capabilities</dt>
        <dd className="break-words">{product.profile.capabilities.join(", ")}</dd>
      </div>
    </dl>
  );
}
