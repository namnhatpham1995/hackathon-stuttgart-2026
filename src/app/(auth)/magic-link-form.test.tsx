import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
}));

import { AuthForm } from "./auth-form";
import { magicLinkSignInBody } from "./magic-link-form";

describe("magic-link sign-in form", () => {
  test("the sign-in page offers the link and the sign-up page does not", () => {
    const signInHtml = renderToStaticMarkup(<AuthForm mode="sign-in" socialProviders={[]} />);
    const signUpHtml = renderToStaticMarkup(<AuthForm mode="sign-up" socialProviders={[]} />);

    expect(signInHtml).toContain("Email me a sign-in link");
    expect(signUpHtml).not.toContain("Email me a sign-in link");
  });

  test("the request sends the address to /workspace", () => {
    expect(magicLinkSignInBody("supplier@example.com")).toEqual({
      email: "supplier@example.com",
      name: "supplier",
      callbackURL: "/workspace",
    });
  });

  test("the sign-in client does not import the Brevo sender", () => {
    const form = readFileSync(new URL("./magic-link-form.tsx", import.meta.url), "utf8");
    const authForm = readFileSync(new URL("./auth-form.tsx", import.meta.url), "utf8");
    expect(form).toContain('callbackURL: "/workspace"');
    expect(form).toContain("magicLinkSignInBody(email)");
    expect(form).not.toContain("notify/brevo");
    expect(form).not.toContain("magic-link-email");
    expect(authForm).not.toContain("notify/brevo");
    expect(authForm).not.toContain("NEXT_PUBLIC_");
  });
});
