"use client";

import { type FormEvent, useState } from "react";
import { validateDraft } from "@/app/workspace/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

import type { ProductFields, WorkspaceProduct } from "./contract";
import { type FieldErrors, focusFirstInvalid } from "./schemas";
import { OriginBadge } from "./status-chip";

const order = ["name", "supplierName", "partNumber", "revision", "material", "packaging"] as const;

export function DraftForm({
  product,
  onSaved,
}: {
  product: WorkspaceProduct;
  onSaved: (product: WorkspaceProduct) => void;
}) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const fields = product.fields;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    const form = new FormData(event.currentTarget);
    const input = Object.fromEntries(order.map((key) => [key, String(form.get(key) ?? "")]));
    setPending(true);
    const result = await validateDraft(input);
    setPending(false);
    if (!result.ok) {
      setErrors(result.errors);
      focusFirstInvalid(result.errors, order);
      return;
    }
    setErrors({});
    const next: WorkspaceProduct = {
      ...product,
      name: result.values.name,
      fields: {
        supplierName: keepOrigin(fields.supplierName, result.values.supplierName),
        partNumber: keepOrigin(fields.partNumber, result.values.partNumber),
        revision: keepOrigin(fields.revision, result.values.revision),
        material: keepOrigin(fields.material, result.values.material),
        packaging: keepOrigin(fields.packaging, result.values.packaging),
      },
    };
    onSaved(next);
    setSaved(true);
  }

  return (
    <form id="product-draft" className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
      <div className="space-y-1">
        <h2 className="section-title">Product draft</h2>
        <p className="text-sm text-muted">
          Each value records who entered it. Assistant and document values stay editable.
        </p>
      </div>
      <Field label="Product name" name="name" defaultValue={product.name} error={errors.name} />
      <Field
        label="Supplier"
        name="supplierName"
        defaultValue={fields.supplierName?.value ?? ""}
        error={errors.supplierName}
        aside={fields.supplierName ? <OriginBadge origin={fields.supplierName.origin} /> : null}
      />
      <Field
        label="Part number"
        name="partNumber"
        mono
        defaultValue={fields.partNumber?.value ?? ""}
        error={errors.partNumber}
        aside={fields.partNumber ? <OriginBadge origin={fields.partNumber.origin} /> : null}
      />
      <Field
        label="Revision"
        name="revision"
        mono
        defaultValue={fields.revision?.value ?? ""}
        error={errors.revision}
        aside={fields.revision ? <OriginBadge origin={fields.revision.origin} /> : null}
      />
      <Field
        label="Material"
        name="material"
        defaultValue={fields.material?.value ?? ""}
        error={errors.material}
        aside={fields.material ? <OriginBadge origin={fields.material.origin} /> : null}
      />
      <Field
        label="Packaging"
        name="packaging"
        defaultValue={fields.packaging?.value ?? ""}
        error={errors.packaging}
        aside={fields.packaging ? <OriginBadge origin={fields.packaging.origin} /> : null}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" pending={pending}>
          Save draft
        </Button>
        {saved ? (
          <p role="status" className="text-sm text-muted">
            Draft saved in this browser.
          </p>
        ) : (
          <p className="text-sm text-muted">Not saved until you choose Save draft.</p>
        )}
      </div>
    </form>
  );
}

function keepOrigin(previous: ProductFields[keyof ProductFields], value: string) {
  if (previous && previous.value === value) return previous;
  return { value, origin: "user" as const };
}
