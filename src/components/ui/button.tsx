"use client";

import Link, { useLinkStatus } from "next/link";
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent-hover",
  secondary: "border border-line bg-card text-ink hover:bg-paper",
  ghost: "bg-transparent text-ink hover:bg-paper",
};

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium motion-safe:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";

type Common = {
  variant?: Variant;
  pending?: boolean;
  children: ReactNode;
  className?: string;
};

type ButtonProps = Common & {
  href?: undefined;
  ref?: Ref<HTMLButtonElement>;
} & ButtonHTMLAttributes<HTMLButtonElement>;

type LinkButtonProps = Common & { href: string };

export function Button(props: ButtonProps | LinkButtonProps) {
  const { variant = "primary", pending = false, children, className = "" } = props;
  const classes = `${base} ${variants[variant]} ${className}`;

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={classes} aria-disabled={pending || undefined}>
        {children}
        <LinkPending />
      </Link>
    );
  }

  const buttonProps = props as ButtonProps;
  const {
    type = "button",
    disabled,
    ref,
    variant: _variant,
    pending: _pending,
    className: _className,
    children: _children,
    href: _href,
    ...rest
  } = buttonProps;

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...rest}
    >
      {children}
      {pending ? <span className="sr-only">Working</span> : null}
    </button>
  );
}

function LinkPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span>Opening…</span>;
}
