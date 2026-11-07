// @vitest-environment happy-dom
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/workspace" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

import { WorkspaceSwitcher } from "@/components/ui/workspace-switcher";
import { ConnectionsNav } from "./connections-nav";

test("sidebar connections stack all three links vertically", () => {
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(<ConnectionsNav layout="sidebar" />);
  expect(container.querySelector("ul")?.classList.contains("flex-col")).toBe(true);
  expect([...container.querySelectorAll("a")].map((link) => link.textContent)).toEqual([
    "Board",
    "Directory",
    "Inbox",
  ]);
  container.innerHTML = renderToStaticMarkup(<ConnectionsNav />);
  expect(container.querySelector("ul")?.classList.contains("flex-wrap")).toBe(true);
  expect(container.querySelector("ul")?.classList.contains("flex-col")).toBe(false);
});

test.each([
  ["/connections/requests/new", "/connections/requests"],
  ["/connections/suppliers", "/connections/suppliers"],
  ["/connections/inbox", "/connections/inbox"],
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
  ["/buyer/products/product-1", "/buyer"],
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
