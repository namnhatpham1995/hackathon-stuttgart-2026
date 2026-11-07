"use client";

import { useRouter } from "next/navigation";

import { clearAssistantHistory } from "@/components/assistant/assistant-history";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="btn-secondary"
      type="button"
      onClick={async () => {
        clearAssistantHistory();
        await signOut();
        router.push("/");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
