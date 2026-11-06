import { redirect } from "next/navigation";
import { Suspense } from "react";

import { enabledSocialProviders } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { AuthForm } from "../auth-form";

export default async function SignInPage() {
  if (await getSession()) redirect("/dashboard");
  return (
    <Suspense>
      <AuthForm mode="sign-in" socialProviders={enabledSocialProviders} />
    </Suspense>
  );
}
