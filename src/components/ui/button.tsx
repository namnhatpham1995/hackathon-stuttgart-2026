"use client";

import Link, { useLinkStatus } from "next/link";
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent-hover",
  secondary: "border border-line bg-card text-ink hover:bg-paper",
  ghost: "bg-transparent text-ink hover:bg-paper",
};

const sizes = {
  md: "min-h-11 px-3.5 text-sm",
  sm: "min-h-8 px-2.5 text-[13px]",
};

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-md font-medium tracking-normal motion-safe:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";

type Common = {
  variant?: Variant;
  pending?: boolean;
  size?: "md" | "sm";
  children: ReactNode;
  className?: string;
};

type ButtonProps = Common & {
  href?: undefined;
  ref?: Ref<HTMLButtonElement>;
} & ButtonHTMLAttributes<HTMLButtonElement>;

type LinkButtonProps = Common & { href: string };

export function Button(props: ButtonProps | LinkButtonProps) {
  const { variant = "primary", pending = false, size = "md", children, className = "" } = props;
  const classes = `${base} ${sizes[size]} ${variants[variant]} ${className}`;

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
    size: _size,
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
