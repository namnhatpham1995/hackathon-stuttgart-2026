"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { createProduct } from "@/app/workspace/actions";
import { Button } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";

import type { WorkspaceProduct } from "./contract";
import { listedFixtures } from "./fixtures";
import { ArrowIcon, DocumentIcon, PlusIcon } from "./icons";
import { PageHeader } from "./page-chrome";
import { type FieldErrors, fieldErrors, focusFirstInvalid, profileSchema } from "./schemas";
import { mergeProducts, writeProduct } from "./store";

const profileOrder = [
  "companyName",
  "country",
  "productCategory",
  "capabilities",
  "targetMarket",
] as const;

const draftOrder = [
  "name",
  "supplierName",
  "partNumber",
  "revision",
  "material",
  "packaging",
] as const;

export function WorkspaceHome() {
  const [products, setProducts] = useState<WorkspaceProduct[]>(listedFixtures());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setProducts(mergeProducts(listedFixtures()));
  }, []);

  return (
    <div className="workspace-content space-y-7">
      <PageHeader
        crumbs={[{ label: "Workspace" }, { label: "Products" }]}
        title="Products"
        meta={
          <span className="meta text-muted">
            Prepare documents against your buyer’s requirements.
          </span>
        }
        actions={
          creating ? undefined : (
            <Button type="button" onClick={() => setCreating(true)}>
              <PlusIcon /> New product
            </Button>
          )
        }
      />

      {creating ? (
        <Onboarding
          onCancel={() => setCreating(false)}
          onCreated={(product) => {
            writeProduct(product);
            setProducts(mergeProducts(listedFixtures()));
          }}
        />
      ) : null}

      {creating ? null : products.length === 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">No products yet</h2>
          <p className="max-w-prose text-muted">
            Create a product and declare the supplier profile, then add the documents the buyer
            asked for.
          </p>
          <Button type="button" onClick={() => setCreating(true)}>
            New product
          </Button>
        </section>
      ) : (
        <div>
          <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
            <h2 className="text-sm font-medium">
              All products <span className="ml-2 font-normal text-muted">{products.length}</span>
            </h2>
            <span className="meta text-muted">Supplier evidence</span>
          </div>
          <ProductTable products={products} />
          <p className="meta mt-5 max-w-[75ch] text-muted">
            CAP-104 products contain demo data. Products you create are saved in this browser.
          </p>
        </div>
      )}
    </div>
  );
}

function ProductTable({ products }: { products: WorkspaceProduct[] }) {
  return (
    <div className="overflow-hidden rounded-b-md border-x border-b border-line">
      <ul className="divide-y divide-line md:hidden">
        {products.map((product) => (
          <li key={product.id} className="px-4 py-4">
            <div className="flex items-start gap-3">
              <DocumentIcon />
              <div className="min-w-0 flex-1">
                <Button
                  href={`/workspace/${product.id}`}
                  variant="ghost"
                  size="sm"
                  className="h-auto justify-start px-0 text-left"
                >
                  {product.name}
                </Button>
                <p className="meta mt-1 text-muted">{product.profile.companyName}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 pl-7 text-xs text-muted">
              <span className="font-mono">
                {product.fields.partNumber?.value ?? "—"} · Rev{" "}
                {product.fields.revision?.value ?? "—"}
              </span>
              <span>{openItems(product)}</span>
            </div>
          </li>
        ))}
      </ul>
      <table className="hidden w-full table-fixed text-left text-[13px] md:table">
        <thead className="border-b border-line bg-paper text-xs text-muted">
          <tr>
            <th className="w-[36%] px-5 py-3 font-medium">Product</th>
            <th className="w-[18%] px-4 py-3 font-medium">Part / revision</th>
            <th className="w-[18%] px-4 py-3 font-medium">Target market</th>
            <th className="px-4 py-3 font-medium">Evidence review</th>
            <th className="w-10">
              <span className="sr-only">Open product</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-paper">
              <td className="px-5 py-5">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-2 text-muted">
                    <DocumentIcon />
                  </span>
                  <div className="min-w-0">
                    <Button
                      href={`/workspace/${product.id}`}
                      variant="ghost"
                      size="sm"
                      className="h-auto justify-start px-0 text-left"
                    >
                      {product.name}
                    </Button>
                    <p className="mt-0.5 text-xs text-muted">{product.profile.companyName}</p>
                  </div>
                </div>
              </td>
              <td className="break-words px-4 py-5">
                <span className="font-mono">{product.fields.partNumber?.value ?? "—"}</span>
                <p className="mt-1 text-xs text-muted">
                  Revision {product.fields.revision?.value ?? "—"}
                </p>
              </td>
              <td className="break-words px-4 py-5 text-muted">{product.profile.targetMarket}</td>
              <td className="px-4 py-5">
                <p className="font-medium">{openItems(product)}</p>
                <p className="mt-1 text-xs text-muted">
                  {product.result
                    ? `${product.result.findings.filter((finding) => finding.status === "DOCUMENTED").length} documented`
                    : "Add documents to begin"}
                </p>
              </td>
              <td className="pr-4 text-muted">
                <ArrowIcon />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function openItems(product: WorkspaceProduct) {
  if (!product.result) return "No report yet";
  const open = product.result.findings.filter((finding) => finding.status !== "DOCUMENTED").length;
  return open === 1 ? "1 open action" : `${open} open actions`;
}

function Onboarding({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (product: WorkspaceProduct) => void;
}) {
  const router = useRouter();
  const heading = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  const focusedStep = useRef<number | null>(null);
  useEffect(() => {
    if (focusedStep.current === step) return;
    focusedStep.current = step;
    heading.current?.focus();
  }, [step]);

  function read(form: HTMLFormElement) {
    const data = new FormData(form);
    return Object.fromEntries(
      [...profileOrder, ...draftOrder].map((key) => [
        key,
        String(data.get(key) ?? profile[key] ?? ""),
      ]),
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = read(event.currentTarget);
    if (step === 1) {
      const parsed = profileSchema.safeParse(values);
      if (!parsed.success) {
        const next = fieldErrors(parsed.error);
        setErrors(next);
        focusFirstInvalid(next, profileOrder);
        return;
      }
      setProfile(values);
      setErrors({});
      setStep(2);
      return;
    }
    setPending(true);
    const result = await createProduct({ ...profile, ...values });
    setPending(false);
    if (!result.ok) {
      setErrors(result.errors);
      focusFirstInvalid(result.errors, [...profileOrder, ...draftOrder]);
      if (profileOrder.some((key) => result.errors[key])) setStep(1);
      return;
    }
    onCreated(result.product);
    router.push(`/workspace/${result.product.id}`);
  }

  return (
    <form className="max-w-xl space-y-5" onSubmit={(event) => void onSubmit(event)}>
      <div className="space-y-2">
        <p className="text-sm text-muted">Step {step} of 2</p>
        <h2 ref={heading} tabIndex={-1} className="section-title">
          {step === 1 ? "Supplier profile" : "Product draft"}
        </h2>
        <p className="text-sm text-muted">
          {step === 1
            ? "Declared by supplier. The assessment does not use this as evidence. Nothing is saved until you create the product."
            : "These fields start as entered by you. You can change them later."}
        </p>
      </div>
      {step === 1 ? (
        <>
          <Field
            label="Company"
            name="companyName"
            defaultValue={profile.companyName}
            error={errors.companyName}
          />
          <Field
            label="Country"
            name="country"
            defaultValue={profile.country}
            error={errors.country}
          />
          <Field
            label="Product category"
            name="productCategory"
            defaultValue={profile.productCategory}
            error={errors.productCategory}
          />
          <TextArea
            label="Capabilities"
            name="capabilities"
            hint="Separate capabilities with commas."
            defaultValue={profile.capabilities}
            error={errors.capabilities}
          />
          <Field
            label="Target market"
            name="targetMarket"
            defaultValue={profile.targetMarket}
            error={errors.targetMarket}
          />
        </>
      ) : (
        <>
          <Field label="Product name" name="name" error={errors.name} />
          <Field label="Supplier" name="supplierName" error={errors.supplierName} />
          <Field label="Part number" name="partNumber" mono error={errors.partNumber} />
          <Field label="Revision" name="revision" mono error={errors.revision} />
          <Field label="Material" name="material" error={errors.material} />
          <Field label="Packaging" name="packaging" error={errors.packaging} />
        </>
      )}
      <div className="flex flex-wrap gap-3">
        {step === 2 ? (
          <Button type="button" variant="secondary" onClick={() => setStep(1)}>
            Back
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" pending={pending}>
          {step === 1 ? "Continue" : "Create product"}
        </Button>
      </div>
    </form>
  );
}
