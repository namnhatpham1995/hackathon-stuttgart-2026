import type { Metadata } from "next";

import { WorkspaceHome } from "@/components/workspace/workspace-home";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Products" };

export default async function WorkspacePage() {
  await requireSession();
  return <WorkspaceHome />;
}
