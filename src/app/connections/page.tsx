import { redirect } from "next/navigation";

import { requireSession } from "@/lib/session";

export default async function ConnectionsIndex() {
  await requireSession();
  redirect("/connections/requests");
}
