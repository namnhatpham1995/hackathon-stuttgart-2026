import Link from "next/link";

import { MarkReadForm } from "@/components/connections/forms";
import { listInbox } from "@/lib/connections/service";
import { requireSession } from "@/lib/session";

const groups = [
  { type: "request_received", title: "Requests for you" },
  { type: "report_shared", title: "Reports shared with you" },
  { type: "assessment_completed", title: "Assessments" },
] as const;

export default async function InboxPage() {
  const { user } = await requireSession();
  const notices = await listInbox(user.id);

  return (
    <div className="min-w-0 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
        <p className="mt-1 text-sm text-muted">
          Notices name an organisation or a declared company. They do not include an email address.
        </p>
      </header>
      {notices.length === 0 ? (
        <p>No notices yet. A request or a shared report will show up here.</p>
      ) : (
        groups.map((group) => {
          const rows = notices.filter((notice) => notice.type === group.type);
          if (rows.length === 0) return null;
          return (
            <section key={group.type} className="space-y-3" aria-label={group.title}>
              <h2 className="text-sm font-semibold">{group.title}</h2>
              <ul className="space-y-3">
                {rows.map((notice) => (
                  <li key={notice.id} className="min-w-0 rounded-xl border border-line p-4">
                    <p className="font-medium [overflow-wrap:anywhere]">{notice.title}</p>
                    <p className="text-sm text-muted">
                      {notice.createdAt.slice(0, 16).replace("T", " ")} UTC
                      {notice.readAt ? " · Read" : " · Unread"}
                    </p>
                    {notice.connectionId ? (
                      <p className="mt-2">
                        <Link className="underline" href={`/connections/${notice.connectionId}`}>
                          Open the connection
                        </Link>
                      </p>
                    ) : null}
                    {notice.readAt ? null : (
                      <div className="mt-3">
                        <MarkReadForm notificationId={notice.id} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
