// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  useParams: () => ({ productId: "owned-product" }),
  usePathname: () => "/workspace/owned-product/report",
}));
vi.mock("@/app/workspace/actions", () => ({ setTheme: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({ signOut: vi.fn() }));

import { WorkspaceShell } from "./shell";
import { publishWorkspaceDirective } from "./workspace-events";

test("assistant directives navigate from the report and close the dialog", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  Element.prototype.scrollIntoView = vi.fn();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        <WorkspaceShell user={{ name: "Demo", email: "demo@example.com" }} unread={0}>
          <h1>Evidence report</h1>
        </WorkspaceShell>,
      ),
    );
    expect(
      container.querySelector('nav[aria-label="Workspaces"]')?.closest("header"),
    ).not.toBeNull();
    expect(
      container.querySelector('nav[aria-label="Primary"] a')?.getAttribute("aria-current"),
    ).toBe("page");
    const trigger = container.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]');
    await act(async () => trigger?.click());
    expect(container.querySelector("dialog")?.open).toBe(true);
    await act(async () =>
      publishWorkspaceDirective({ type: "request_replacement", documentId: "inspection/a" }),
    );
    expect(push).toHaveBeenLastCalledWith(
      "/workspace/owned-product?replace=inspection%2Fa#upload-card",
    );
    expect(container.querySelector("dialog")?.open).toBe(false);
    await act(async () => publishWorkspaceDirective({ type: "show_upload_card" }));
    expect(push).toHaveBeenLastCalledWith("/workspace/owned-product?view=uploads#upload-card");
    await act(async () =>
      publishWorkspaceDirective({ type: "show_report", resultId: "stored-result" }),
    );
    expect(push).toHaveBeenLastCalledWith("/workspace/owned-product/report?result=stored-result");
    await act(async () =>
      publishWorkspaceDirective({
        type: "navigate",
        view: "product",
        productId: "other-owned-product",
      }),
    );
    expect(push).toHaveBeenLastCalledWith(
      "/workspace/other-owned-product?view=product#product-draft",
    );
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});
