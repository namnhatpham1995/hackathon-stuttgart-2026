import { ConnectionDetail } from "@/components/connections/connection-detail";

export default async function ConnectionPage({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const { connectionId } = await params;
  return ConnectionDetail({ connectionId, role: "supplier" });
}
