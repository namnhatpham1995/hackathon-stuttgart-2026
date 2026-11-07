import { RequestForm } from "@/components/connections/forms";
import { requireSession } from "@/lib/session";

export default async function NewRequestPage() {
  await requireSession();

  return (
    <div className="min-w-0 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Post a request</h1>
      <p className="text-sm text-muted">
        The board shows your organisation, title, part number and checklist. It does not show your
        email.
      </p>
      <RequestForm />
    </div>
  );
}
