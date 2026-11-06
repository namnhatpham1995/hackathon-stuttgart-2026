"use client";

import { useRouter } from "next/navigation";

import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="btn-secondary"
      type="button"
      onClick={async () => {
        await signOut();
        router.push("/");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
