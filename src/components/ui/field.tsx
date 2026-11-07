import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { useId } from "react";

type Common = {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  aside?: ReactNode;
  mono?: boolean;
};

export function Field({
  label,
  name,
  hint,
  error,
  aside,
  mono = false,
  ...props
}: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldFrame label={label} name={name} hint={hint} error={error} aside={aside}>
      {(id, describedBy) => (
        <input
          id={id}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`field ${mono ? "font-mono" : ""}`}
          {...props}
        />
      )}
    </FieldFrame>
  );
}

export function TextArea({
  label,
  name,
  hint,
  error,
  aside,
  mono = false,
  ...props
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldFrame label={label} name={name} hint={hint} error={error} aside={aside}>
      {(id, describedBy) => (
        <textarea
          id={id}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`field min-h-28 py-2 ${mono ? "font-mono" : ""}`}
          {...props}
        />
      )}
    </FieldFrame>
  );
}

function FieldFrame({
  label,
  hint,
  error,
  aside,
  children,
}: {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  aside?: ReactNode;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {aside}
      </div>
      {children(id, describedBy)}
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
