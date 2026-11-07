import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";

export default async function LegacyConnectionsPage() {
  await requireSession();
  redirect("/dashboard");
}
