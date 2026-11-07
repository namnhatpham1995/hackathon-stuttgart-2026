"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { clearAssistantHistory } from "@/components/assistant/assistant-history";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      className="btn-secondary active:scale-[0.98]"
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        clearAssistantHistory();
        await signOut();
        router.push("/");
        router.refresh();
      }}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
