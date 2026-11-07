"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { requestProductEvidence } from "@/app/buyer/actions";
import { Button } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import { focusFirstInvalid } from "@/components/workspace/schemas";

const fields = ["buyerOrgName", "message"] as const;

export function EvidenceForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [organisation, setOrganisation] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await requestProductEvidence({
      productId,
      buyerOrgName: organisation,
      message,
    });
    setPending(false);
    if (!result.ok) {
      setErrors(result.errors);
      setError(result.error ?? null);
      focusFirstInvalid(result.errors, fields);
      return;
    }
    setSent(true);
    router.refresh();
  }

  if (sent) {
    return (
      <p role="status" className="max-w-prose text-sm">
        Evidence requested. It is listed under{" "}
        <Link href="/buyer#requests" className="text-accent hover:underline">
          My requests
        </Link>
        .
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4" noValidate>
      <fieldset disabled={pending} className="space-y-4">
        <Field
          label="Organisation"
          name="buyerOrgName"
          value={organisation}
          onChange={(event) => setOrganisation(event.target.value)}
          error={errors.buyerOrgName}
          autoComplete="organization"
          required
        />
        <TextArea
          label="Message"
          name="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          hint="Optional. Up to 1000 characters."
          error={errors.message}
        />
      </fieldset>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" pending={pending}>
        Request evidence
      </Button>
    </form>
  );
}
