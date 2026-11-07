import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StatesGallery } from "@/components/workspace/states-gallery";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Interface states" };

/** Dev-only gallery of the six states. Production answers 404. */
export default async function StatesPage() {
  if (process.env.NODE_ENV === "production") notFound();
  await requireSession();
  return <StatesGallery />;
}
