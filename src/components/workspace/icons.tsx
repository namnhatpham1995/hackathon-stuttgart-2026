import type { SVGProps } from "react";

function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0"
      {...props}
    />
  );
}

export function DocumentedIcon() {
  return (
    <Icon>
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </Icon>
  );
}

export function MissingIcon() {
  return (
    <Icon>
      <path d="M4 8h8" />
    </Icon>
  );
}

export function MismatchIcon() {
  return (
    <Icon>
      <path d="M8 3.5v5" />
      <path d="M8 11.5h.01" />
    </Icon>
  );
}

export function ExpiredIcon() {
  return (
    <Icon>
      <circle cx="8" cy="8" r="5" />
      <path d="M8 5.5V8l1.75 1.5" />
    </Icon>
  );
}

export function ReviewIcon() {
  return (
    <Icon>
      <path d="M2.5 8s2-3.5 5.5-3.5S13.5 8 13.5 8s-2 3.5-5.5 3.5S2.5 8 2.5 8Z" />
      <circle cx="8" cy="8" r="1.25" />
    </Icon>
  );
}

export function ChevronIcon() {
  return (
    <Icon>
      <path d="M4.5 6.5 8 10l3.5-3.5" />
    </Icon>
  );
}

export function UploadIcon() {
  return (
    <Icon>
      <path d="M8 11V4" />
      <path d="M5.5 6.5 8 4l2.5 2.5" />
      <path d="M3.5 12.5h9" />
    </Icon>
  );
}

export function PlusIcon() {
  return (
    <Icon>
      <path d="M8 3.5v9M3.5 8h9" />
    </Icon>
  );
}

export function CollapseIcon() {
  return (
    <Icon>
      <path d="M10 3.5 6.5 8 10 12.5" />
    </Icon>
  );
}
