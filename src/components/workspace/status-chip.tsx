import { type FindingStatus, STATUS_LABELS } from "./contract";
import { DocumentedIcon, ExpiredIcon, MismatchIcon, MissingIcon, ReviewIcon } from "./icons";

const styles: Record<FindingStatus, string> = {
  DOCUMENTED: "bg-documented text-documented-ink",
  MISSING: "bg-missing text-missing-ink",
  MISMATCH: "bg-mismatch text-mismatch-ink",
  EXPIRED: "bg-expired text-expired-ink",
  NEEDS_REVIEW: "bg-review text-review-ink",
};

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
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ${styles[status]}`}
    >
      <Icon />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function OriginBadge({ origin }: { origin: "user" | "assistant" | "document" }) {
  const label = origin === "user" ? "You" : origin === "assistant" ? "Assistant" : "From document";
  return (
    <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-xs font-medium text-ink">
      {label}
    </span>
  );
}
