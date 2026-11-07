import Lozenge from "@atlaskit/lozenge";
import {
  DocumentedIcon,
  ExpiredIcon,
  MismatchIcon,
  ReviewIcon,
} from "@/components/workspace/icons";
import type { BuyerConnectionStatus } from "@/lib/buyer/service";

const labels: Record<BuyerConnectionStatus, string> = {
  requested: "Requested",
  in_progress: "In progress",
  shared: "Shared",
  declined: "Declined",
};

/** Same readiness colours as the supplier report: review, expired, documented, mismatch. */
const styles: Record<BuyerConnectionStatus, { backgroundColor: string; color: string }> = {
  requested: { backgroundColor: "var(--review)", color: "var(--review-ink)" },
  in_progress: { backgroundColor: "var(--expired)", color: "var(--expired-ink)" },
  shared: { backgroundColor: "var(--documented)", color: "var(--documented-ink)" },
  declined: { backgroundColor: "var(--mismatch)", color: "var(--mismatch-ink)" },
};

const appearances = {
  requested: "information",
  in_progress: "warning",
  shared: "success",
  declined: "danger",
} as const;

const icons = {
  requested: ReviewIcon,
  in_progress: ExpiredIcon,
  shared: DocumentedIcon,
  declined: MismatchIcon,
} as const;

export function ConnectionStatus({ status }: { status: BuyerConnectionStatus }) {
  const Icon = icons[status];
  return (
    <Lozenge
      appearance={appearances[status]}
      iconBefore={Icon}
      style={styles[status]}
      maxWidth={200}
    >
      {labels[status]}
    </Lozenge>
  );
}
