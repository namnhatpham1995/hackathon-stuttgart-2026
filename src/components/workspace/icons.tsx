import { type SVGProps, useId } from "react";

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

export function DocumentIcon() {
  return (
    <Icon>
      <path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6L9 2Z" />
      <path d="M9 2v4h4M5.5 9h5M5.5 11.5h3" />
    </Icon>
  );
}

export function ProductIcon() {
  return (
    <Icon>
      <path d="m8 2 5.5 3v6L8 14l-5.5-3V5L8 2Z" />
      <path d="m2.5 5 5.5 3 5.5-3M8 8v6M5.25 3.5l5.5 3" />
    </Icon>
  );
}

export function PanelIcon() {
  return (
    <Icon>
      <rect x="2" y="2.5" width="12" height="11" rx="1" />
      <path d="M9.5 2.5v11M5 6l1.5 2L5 10" />
    </Icon>
  );
}

export function ArrowIcon() {
  return (
    <Icon>
      <path d="M3 8h10M9 4l4 4-4 4" />
    </Icon>
  );
}

export function CloseIcon() {
  return (
    <Icon>
      <path d="m4 4 8 8M12 4l-8 8" />
    </Icon>
  );
}

export function ThemeIcon() {
  const maskId = useId();
  return (
    <Icon className="theme-icon size-4 shrink-0">
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="16" height="16">
          <rect width="16" height="16" fill="white" stroke="none" />
          <circle className="theme-cutout" cx="11" cy="5" r="4" fill="black" stroke="none" />
        </mask>
      </defs>
      <circle className="theme-disc" cx="8" cy="8" r="3.25" mask={`url(#${maskId})`} />
      <g className="theme-rays">
        <path d="M8 1v1.25M8 13.75V15M1 8h1.25M13.75 8H15M3.05 3.05l.9.9M12.05 12.05l.9.9M3.05 12.95l.9-.9M12.05 3.95l.9-.9" />
      </g>
    </Icon>
  );
}

export function SignOutIcon() {
  return (
    <Icon>
      <path d="M6 2.5H3v11h3M6 8h8M11 5l3 3-3 3" />
    </Icon>
  );
}
