import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

const navigation = vi.hoisted(() => ({ search: "" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
  useSearchParams: () => new URLSearchParams(navigation.search),
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

  test("the sign-in form places the passport mark above its heading", () => {
    const html = renderToStaticMarkup(<AuthForm mode="sign-in" socialProviders={[]} />);
    expect(html).toContain('alt="TradeReady passport"');
    expect(html).toContain("tradeready-passport.png");
    expect(html.indexOf("<img")).toBeLessThan(html.indexOf("<h1"));
  });

  test.each(["/dashboard", "/buyer", "/workspace/product-1"])(
    "the email link retains the chosen destination %s",
    (next) => {
      expect(magicLinkSignInBody("buyer@example.com", next).callbackURL).toBe(next);
    },
  );

  test("an external email-link destination falls back to workspace choice", () => {
    expect(magicLinkSignInBody("buyer@example.com", "//outside.example").callbackURL).toBe(
      "/dashboard",
    );
  });

  test("switching between sign-in and sign-up retains the chosen workspace", () => {
    navigation.search = "next=%2Fbuyer";
    try {
      const signInHtml = renderToStaticMarkup(<AuthForm mode="sign-in" socialProviders={[]} />);
      const signUpHtml = renderToStaticMarkup(<AuthForm mode="sign-up" socialProviders={[]} />);
      expect(signInHtml).toContain('href="/sign-up?next=%2Fbuyer"');
      expect(signUpHtml).toContain('href="/sign-in?next=%2Fbuyer"');
    } finally {
      navigation.search = "";
    }
  });

  test("the sign-in client does not import the Brevo sender", () => {
    const form = readFileSync(new URL("./magic-link-form.tsx", import.meta.url), "utf8");
    const authForm = readFileSync(new URL("./auth-form.tsx", import.meta.url), "utf8");
    expect(form).toContain("magicLinkSignInBody(email, next)");
    expect(authForm).toContain("<MagicLinkForm next={next}");
    expect(form).not.toContain("notify/brevo");
    expect(form).not.toContain("magic-link-email");
    expect(authForm).not.toContain("notify/brevo");
    expect(authForm).not.toContain("NEXT_PUBLIC_");
  });
});
