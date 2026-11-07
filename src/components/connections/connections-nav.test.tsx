// @vitest-environment happy-dom
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/workspace" }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({}),
}));

vi.mock("@/lib/auth-client", () => ({
  signOut: vi.fn(),
  useSession: () => ({ data: { user: { id: "qa-user" } } }),
}));

import { BuyerShell } from "@/components/buyer/shell";
import { WorkspaceSwitcher } from "@/components/ui/workspace-switcher";
import { ConnectionsNav } from "./connections-nav";

test("buyer navigation stays vertical while workspace switching stays in the header", () => {
  navigation.pathname = "/buyer/inbox";
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(
    <BuyerShell user={{ name: "Buyer", email: "buyer@example.com" }} unread={2}>
      <h1>Buyer inbox</h1>
    </BuyerShell>,
  );
  expect(container.querySelector('nav[aria-label="Workspaces"]')?.closest("header")).not.toBeNull();
  const buyerNav = container.querySelector('aside nav[aria-label="Buyer"]');
  expect(buyerNav?.classList.contains("flex-col")).toBe(true);
  expect(
    [...container.querySelectorAll('aside nav[aria-label="Buyer"] a')].map((link) =>
      link.getAttribute("href"),
    ),
  ).toEqual(["/buyer", "/buyer#requests", "/buyer/products", "/buyer/inbox"]);
  expect(buyerNav?.querySelector('a[aria-current="page"]')?.getAttribute("href")).toBe(
    "/buyer/inbox",
  );
  expect(buyerNav?.querySelector('a[href="/buyer/inbox"]')?.textContent).toBe("Inbox2");
  expect(container.querySelector('a[href="/buyer/requests/new"]')).not.toBeNull();
});

test("supplier unread counts stay on the supplier inbox link", () => {
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(<ConnectionsNav unread={3} />);
  expect(container.querySelector('a[href="/workspace/inbox"]')?.textContent).toBe("Inbox3");
  expect(container.querySelector('a[href^="/buyer"]')).toBeNull();
});

test("supplier connections stack Board and Inbox without buyer actions", () => {
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(<ConnectionsNav layout="sidebar" />);
  expect(container.querySelector("ul")?.classList.contains("flex-col")).toBe(true);
  expect([...container.querySelectorAll("a")].map((link) => link.textContent)).toEqual([
    "Board",
    "Inbox",
  ]);
  container.innerHTML = renderToStaticMarkup(<ConnectionsNav />);
  expect(container.querySelector("ul")?.classList.contains("flex-wrap")).toBe(true);
  expect(container.querySelector("ul")?.classList.contains("flex-col")).toBe(false);
});

test.each([
  ["/workspace/requests", "/workspace/requests"],
  ["/workspace/inbox", "/workspace/inbox"],
])("connections highlight the active destination on %s", (pathname, href) => {
  navigation.pathname = pathname;
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(<ConnectionsNav />);
  const current = container.querySelectorAll('a[aria-current="page"]');
  expect(current).toHaveLength(1);
  expect(current[0]?.getAttribute("href")).toBe(href);
});

test.each([
  ["/workspace/product-1/report", "/workspace"],
  ["/workspace/connections/connection-1", "/workspace"],
  ["/buyer/products/product-1", "/buyer"],
  ["/buyer/requests/new", "/buyer"],
  ["/buyer/connections/connection-1", "/buyer"],
  ["/buyer/inbox", "/buyer"],
])("workspace switching keeps separate destinations on %s", (pathname, href) => {
  navigation.pathname = pathname;
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(<WorkspaceSwitcher />);
  expect(container.querySelector('nav[aria-label="Workspaces"]')).not.toBeNull();
  expect([...container.querySelectorAll("a")].map((link) => link.getAttribute("href"))).toEqual([
    "/workspace",
    "/buyer",
  ]);
  const current = container.querySelectorAll('a[aria-current="page"]');
  expect(current).toHaveLength(1);
  expect(current[0]?.getAttribute("href")).toBe(href);
});
