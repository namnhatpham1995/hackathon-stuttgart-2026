import { ConnectionDetail } from "@/components/connections/connection-detail";

export default async function LegacyConnectionPage({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const { connectionId } = await params;
  return ConnectionDetail({ connectionId });
}
