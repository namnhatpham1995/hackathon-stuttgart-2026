"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { closeRequest } from "@/app/buyer/actions";
import { Button } from "@/components/ui/button";

export function CloseRequestButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await closeRequest(requestId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch {
      setError("The request could not be closed. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="shrink-0">
      <Button type="submit" variant="secondary" size="sm" pending={pending}>
        Close request
      </Button>
      {error ? (
        <p role="alert" className="meta mt-2 max-w-xs text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}
