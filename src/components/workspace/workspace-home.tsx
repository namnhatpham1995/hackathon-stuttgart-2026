"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { createProduct } from "@/app/workspace/actions";
import { Button } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";

import type { WorkspaceProduct } from "./contract";
import { listedFixtures } from "./fixtures";
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
    <div className="max-w-4xl space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="max-w-prose text-sm text-muted">
            Describe a product, add the buyer’s documents, and read the evidence report. The sample
            CAP-104 products are the demo. Products you create stay in this browser until the
            product service is connected.
          </p>
        </div>
        {creating ? null : (
          <Button type="button" onClick={() => setCreating(true)}>
            New product
          </Button>
        )}
      </header>

      {creating ? (
        <Onboarding
          onCancel={() => setCreating(false)}
          onCreated={(product) => {
            writeProduct(product);
            setProducts(mergeProducts(listedFixtures()));
          }}
        />
      ) : null}

      {products.length === 0 ? (
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
        <ProductTable products={products} />
      )}
    </div>
  );
}

function ProductTable({ products }: { products: WorkspaceProduct[] }) {
  return (
    <>
      <ul className="divide-y divide-line border-y border-line md:hidden">
        {products.map((product) => (
          <li key={product.id} className="space-y-1 py-3">
            <Button
              href={`/workspace/${product.id}`}
              variant="ghost"
              className="h-auto justify-start px-0"
            >
              {product.name}
            </Button>
            <p className="font-mono text-sm break-all">{product.fields.partNumber?.value ?? "—"}</p>
            <p className="text-sm text-muted">{openItems(product)}</p>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="py-2 pr-4 font-medium">Product</th>
              <th className="py-2 pr-4 font-medium">Part</th>
              <th className="py-2 pr-4 font-medium">Market</th>
              <th className="py-2 font-medium">Open items</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-line">
                <td className="py-3 pr-4">
                  <Button
                    href={`/workspace/${product.id}`}
                    variant="ghost"
                    className="h-auto justify-start px-0"
                  >
                    {product.name}
                  </Button>
                </td>
                <td className="py-3 pr-4 font-mono break-all">
                  {product.fields.partNumber?.value ?? "—"}
                </td>
                <td className="py-3 pr-4 break-words">{product.profile.targetMarket}</td>
                <td className="py-3">{openItems(product)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function openItems(product: WorkspaceProduct) {
  if (!product.result) return "No report yet";
  const open = product.result.findings.filter((finding) => finding.status !== "DOCUMENTED").length;
  return open === 1 ? "1 open" : `${open} open`;
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
  const seenStep = useRef(step);

  useEffect(() => {
    if (seenStep.current === step) return;
    seenStep.current = step;
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
        <h2 ref={heading} tabIndex={-1} className="text-lg font-semibold tracking-tight">
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
