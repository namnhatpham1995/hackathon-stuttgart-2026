import Lozenge from "@atlaskit/lozenge";
import { type FindingStatus, STATUS_LABELS } from "./contract";
import { DocumentedIcon, ExpiredIcon, MismatchIcon, MissingIcon, ReviewIcon } from "./icons";

const styles: Record<FindingStatus, { backgroundColor: string; color: string }> = {
  DOCUMENTED: { backgroundColor: "var(--documented)", color: "var(--documented-ink)" },
  MISSING: { backgroundColor: "var(--missing)", color: "var(--missing-ink)" },
  MISMATCH: { backgroundColor: "var(--mismatch)", color: "var(--mismatch-ink)" },
  EXPIRED: { backgroundColor: "var(--expired)", color: "var(--expired-ink)" },
  NEEDS_REVIEW: { backgroundColor: "var(--review)", color: "var(--review-ink)" },
};
const appearances = {
  DOCUMENTED: "success",
  MISSING: "accent-orange",
  MISMATCH: "danger",
  EXPIRED: "warning",
  NEEDS_REVIEW: "information",
} as const;

const icons: Record<FindingStatus, typeof DocumentedIcon> = {
  DOCUMENTED: DocumentedIcon,
  MISSING: MissingIcon,
  MISMATCH: MismatchIcon,
  EXPIRED: ExpiredIcon,
  NEEDS_REVIEW: ReviewIcon,
};

export function StatusChip({ status }: { status: FindingStatus }) {
  const Icon = icons[status];
  return (
    <Lozenge
      appearance={appearances[status]}
      iconBefore={Icon}
      style={styles[status]}
      maxWidth={200}
    >
      {STATUS_LABELS[status]}
    </Lozenge>
  );
}

export function OriginBadge({ origin }: { origin: "user" | "assistant" | "document" }) {
  const label = origin === "user" ? "You" : origin === "assistant" ? "Assistant" : "From document";
  return (
    <span className="rounded border border-line bg-paper px-1.5 py-0.5 text-xs font-medium text-muted">
      {label}
    </span>
  );
}
