// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

vi.mock("@/app/workspace/actions", () => ({ validateDraft: vi.fn(), saveWorkspaceDraft: vi.fn() }));
import { DraftForm } from "./draft-form";
import { baselineProduct } from "./fixtures";

test("an assistant update appears without replacing another unsaved field", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<DraftForm product={baselineProduct} onSaved={vi.fn()} />));
    const packaging = container.querySelector<HTMLInputElement>('input[name="packaging"]');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        packaging,
        "Unsaved packaging",
      );
      packaging?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () =>
      root.render(
        <DraftForm
          product={{
            ...baselineProduct,
            fields: { ...baselineProduct.fields, revision: { value: "C", origin: "assistant" } },
          }}
          onSaved={vi.fn()}
        />,
      ),
    );
    expect(container.querySelector<HTMLInputElement>('input[name="revision"]')?.value).toBe("C");
    expect(container.querySelector<HTMLInputElement>('input[name="packaging"]')?.value).toBe(
      "Unsaved packaging",
    );
    expect(container.querySelector('input[name="revision"]')?.parentElement?.textContent).toContain(
      "Assistant",
    );
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});
