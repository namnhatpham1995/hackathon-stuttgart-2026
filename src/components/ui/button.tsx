"use client";

import AtlaskitButton from "@atlaskit/button/new";
import { setBooleanFeatureFlagResolver } from "@atlaskit/platform-feature-flags";
import Link, { useLinkStatus } from "next/link";
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

// This app uses stable SDK variants without Atlassian’s internal feature-gate service.
setBooleanFeatureFlagResolver(() => false);

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent-hover",
  secondary: "bg-paper text-ink hover:bg-line",
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

  const appearance = variant === "primary" ? "primary" : variant === "ghost" ? "subtle" : "default";
  return (
    <span className={`ads-button ads-button-${size} ${className}`}>
      <AtlaskitButton
        ref={ref}
        type={type}
        appearance={appearance}
        isDisabled={disabled || pending}
        isLoading={pending}
        aria-busy={pending || undefined}
        {...rest}
      >
        <span className="inline-flex items-center justify-center gap-1.5">{children}</span>
      </AtlaskitButton>
    </span>
  );
}

function LinkPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span>Opening…</span>;
}
