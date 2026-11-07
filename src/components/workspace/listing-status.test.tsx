// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

vi.mock("@/app/connections/actions", () => ({ setListedAction: vi.fn() }));
import { ListingStatus } from "./listing-status";

async function render(listed: boolean) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(<ListingStatus productId="p1" listed={listed} onChanged={vi.fn()} />),
  );
  return { container, root };
}

test("an unlisted product explains what listing shows and offers to list it", async () => {
  const { container, root } = await render(false);
  try {
    expect(container.textContent).toContain("Buyers can't see this product yet");
    expect(container.textContent).toContain("name, part number and declared supplier profile");
    expect(container.querySelector("button")?.textContent).toBe("List for buyers");
    expect(container.querySelector<HTMLInputElement>('input[name="listed"]')?.value).toBe("true");
    expect(container.querySelector<HTMLInputElement>('input[name="productId"]')?.value).toBe("p1");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

test("a listed product says so and offers to remove it", async () => {
  const { container, root } = await render(true);
  try {
    expect(container.textContent).toContain("Listed for buyers");
    expect(container.textContent).not.toContain("can't see");
    expect(container.querySelector("button")?.textContent).toBe("Remove from directory");
    expect(container.querySelector<HTMLInputElement>('input[name="listed"]')?.value).toBe("false");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
