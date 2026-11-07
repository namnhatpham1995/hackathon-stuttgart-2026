"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ProductDocument, WorkspaceProduct } from "./contract";
import { classifyFile, packFromFilenames, rejectionForFile } from "./documents";
import { DraftForm } from "./draft-form";
import { buildResult, type EvidencePack } from "./fixtures";
import { askAssistant, MetaItem, OverflowMenu, PageHeader } from "./page-chrome";
import { ProductConnections } from "./product-connections";
import { ProgressView } from "./progress-view";
import { readProduct, writeProduct } from "./store";
import { UploadCard } from "./upload-card";
import { subscribeWorkspaceDirective } from "./workspace-events";

type LiveJob = { id: string; startedAt: number; pack: EvidencePack };

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
  const [product, setProduct] = useState<WorkspaceProduct | null>(initial);
  const [ready, setReady] = useState(Boolean(initial));
  const [replacingId, setReplacingId] = useState<string | null>(replaceDocumentId ?? null);
  const [highlighted, setHighlighted] = useState(Boolean(replaceDocumentId));
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [assessing, setAssessing] = useState(false);
  const [job, setJob] = useState<LiveJob | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const files = useRef(new Map<string, File>());

  useEffect(() => {
    const saved = readProduct(productId);
    if (saved) setProduct(saved);
    setReady(true);
    const stored = readJob(productId);
    if (stored) setJob(stored);
  }, [productId]);

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
    return subscribeWorkspaceDirective((directive) => {
      if (directive.action === "navigate_workspace") {
        if (directive.view === "report") router.push(reportHref(productId, job?.pack));
        if (directive.view === "uploads") revealUpload();
        if (directive.view === "product") {
          document.getElementById("product-draft")?.scrollIntoView({ block: "start" });
        }
        return;
      }
      if (directive.action === "show_upload_card") {
        revealUpload();
        return;
      }
      if (directive.action === "show_report") {
        router.push(reportHref(productId, job?.pack));
        return;
      }
      if (directive.action === "request_replacement") {
        setReplacingId(directive.documentId);
        revealUpload();
      }
    });
  }, [job?.pack, productId, revealUpload, router]);

  function update(next: WorkspaceProduct) {
    setProduct(next);
    writeProduct(next);
  }

  function addFiles(selected: File[]) {
    if (!product) return;
    if (replacingId && selected.length !== 1) {
      setUploadError("Choose one file to replace this document. The batch was not changed.");
      return;
    }
    const messages: string[] = [];
    const documents = [...product.documents];
    for (const file of selected) {
      const message = rejectionForFile(file, documents, replacingId);
      if (message) {
        messages.push(message);
        continue;
      }
      const classified = classifyFile(file);
      if (!classified.ok) continue;
      const id = crypto.randomUUID();
      documents.push({
        id,
        filename: file.name,
        mimeType: classified.mimeType,
        kind: classified.kind,
        sizeBytes: file.size,
        state: "pending",
        replacesDocumentId: replacingId,
      });
      files.current.set(id, file);
    }
    setUploadError(messages[0] ?? null);
    if (documents.length !== product.documents.length) {
      update({ ...product, documents });
      setReplacingId(null);
      void postPending(productId, documents, files.current, setUploadError);
    }
  }

  async function assess() {
    if (!product) return;
    const pending = product.documents.filter((document) => document.state === "pending");
    if (pending.length === 0) return;
    setAssessing(true);
    setUploadError(null);
    const promoted = promote(product.documents);
    const names = promoted
      .filter((document) => document.state === "active" && document.kind === "evidence")
      .map((document) => document.filename);
    const pack = packFromFilenames(names);
    let jobId = `demo-${crypto.randomUUID()}`;
    try {
      const response = await fetch(`/api/products/${productId}/assess`, { method: "POST" });
      if (response.ok) {
        const body = (await response.json()) as { id?: string; jobId?: string };
        jobId = body.jobId ?? body.id ?? jobId;
      } else if (response.status !== 404) {
        setUploadError(
          "The assessment could not be started. Check the documents and choose Upload and assess again.",
        );
        setAssessing(false);
        return;
      }
    } catch {
      jobId = `demo-${crypto.randomUUID()}`;
    }
    const next = { ...product, documents: promoted };
    update(next);
    const live = { id: jobId, startedAt: Date.now(), pack };
    writeJob(productId, live);
    setJob(live);
    setAssessing(false);
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
          created in this browser.
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
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        crumbs={[{ href: "/workspace", label: "Products" }, { label: product.name }]}
        title={product.name}
        meta={
          <>
            <span className="rounded-full border border-line bg-card px-2 py-0.5 text-[13px] font-medium">
              {product.result ? "Report stored" : "In progress"}
            </span>
            <MetaItem>
              <span className="font-mono">
                {product.fields.partNumber?.value ?? "No part number"}
              </span>
            </MetaItem>
            {open !== undefined ? (
              <MetaItem>{open === 1 ? "1 open" : `${open} open`}</MetaItem>
            ) : null}
          </>
        }
        actions={
          <>
            <OverflowMenu
              items={[{ label: "Evidence report", href: `/workspace/${product.id}/report` }]}
            />
            <Button type="button" variant="secondary" size="sm" onClick={askAssistant}>
              Ask assistant
            </Button>
          </>
        }
      />
      <UploadCard
        documents={product.documents}
        replacing={replacing}
        highlighted={highlighted}
        pending={assessing}
        error={uploadError}
        onAdd={addFiles}
        findings={product.result?.findings}
        onStartReplace={(id) => {
          setReplacingId(id);
          setHighlighted(true);
          requestAnimationFrame(() => inputRef.current?.click());
        }}
        onCancelReplace={() => setReplacingId(null)}
        onRemovePending={(id) => {
          files.current.delete(id);
          update({
            ...product,
            documents: product.documents.filter((document) => document.id !== id),
          });
        }}
        onAssess={() => void assess()}
        inputRef={inputRef}
      />
      {job ? (
        <ProgressView
          jobId={job.id}
          startedAt={job.startedAt}
          onComplete={() => {
            const withResult = { ...product, result: buildResult(product.id, job.pack) };
            update(withResult);
            clearJob(productId);
            router.push(reportHref(productId, job.pack));
          }}
        />
      ) : null}
      <details className="rounded-md border border-line bg-card px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium">
          Product details, declared by supplier
        </summary>
        <div className="mt-4 space-y-4">
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

function promote(documents: ProductDocument[]): ProductDocument[] {
  const replaced = new Set(
    documents
      .filter((document) => document.state === "pending" && document.replacesDocumentId)
      .map((document) => document.replacesDocumentId),
  );
  return documents.map((document) => {
    if (document.state === "pending") return { ...document, state: "active" as const };
    if (replaced.has(document.id)) return { ...document, state: "inactive" as const };
    return document;
  });
}

async function postPending(
  productId: string,
  documents: ProductDocument[],
  blobs: Map<string, File>,
  setUploadError: (message: string | null) => void,
) {
  for (const document of documents) {
    if (document.state !== "pending") continue;
    const file = blobs.get(document.id);
    if (!file) continue;
    const body = new FormData();
    body.set("file", file);
    if (document.replacesDocumentId) body.set("replacesDocumentId", document.replacesDocumentId);
    try {
      const response = await fetch(`/api/products/${productId}/documents`, {
        method: "POST",
        body,
      });
      if (response.status === 404) return;
      if (!response.ok) {
        const message = await readError(response, file.name);
        setUploadError(message);
        return;
      }
    } catch {
      return;
    }
  }
}

async function readError(response: Response, filename: string) {
  try {
    const payload = (await response.json()) as { message?: string; error?: string };
    if (payload.message) return payload.message;
    if (payload.error) return payload.error;
  } catch {
    // The route may return an empty body.
  }
  if (response.status === 413) {
    return `${filename} is over the 4 MB limit and was not added.`;
  }
  return `${filename} was not accepted. Check the type and size, then try again.`;
}

function reportHref(productId: string, pack: EvidencePack | undefined) {
  if (!pack || pack === "baseline") return `/workspace/${productId}/report`;
  return `/workspace/${productId}/report?evidence=${pack}`;
}

function jobKey(productId: string) {
  return `exportready.job.${productId}`;
}

function readJob(productId: string): LiveJob | null {
  try {
    const raw = sessionStorage.getItem(jobKey(productId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LiveJob;
    if (!parsed.id || !parsed.startedAt || !parsed.pack) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeJob(productId: string, job: LiveJob) {
  sessionStorage.setItem(jobKey(productId), JSON.stringify(job));
}

function clearJob(productId: string) {
  sessionStorage.removeItem(jobKey(productId));
}
