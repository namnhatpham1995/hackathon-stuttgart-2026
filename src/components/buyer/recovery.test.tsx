// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const { refresh, requestProductEvidence, closeRequest } = vi.hoisted(() => ({
  refresh: vi.fn(),
  requestProductEvidence: vi.fn(),
  closeRequest: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/app/buyer/actions", () => ({ requestProductEvidence, closeRequest }));

import { EvidenceForm } from "./evidence-form";
import { CloseRequestButton } from "./close-request";

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function submit() {
  await act(async () =>
    container
      .querySelector("form")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}

test("a failed evidence request keeps the entries and permits retry", async () => {
  requestProductEvidence.mockRejectedValueOnce(new TypeError("offline"));
  await act(async () => root.render(<EvidenceForm productId="listed-product" />));
  const organisation = container.querySelector<HTMLInputElement>('input[name="buyerOrgName"]');
  const message = container.querySelector<HTMLTextAreaElement>('textarea[name="message"]');
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
      organisation,
      "Neckar",
    );
    organisation?.dispatchEvent(new Event("input", { bubbles: true }));
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(
      message,
      "Please share the report.",
    );
    message?.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await submit();
  expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);
  expect(organisation?.value).toBe("Neckar");
  expect(message?.value).toBe("Please share the report.");
  expect(container.querySelector('[role="alert"]')?.textContent).toContain("Try again");
  requestProductEvidence.mockResolvedValueOnce({ ok: true, connectionId: "connection" });
  await submit();
  expect(requestProductEvidence).toHaveBeenCalledTimes(2);
  expect(container.querySelector('[role="status"]')?.textContent).toContain("Evidence requested");
});

test("a failed close request shows recovery and permits retry", async () => {
  closeRequest.mockRejectedValueOnce(new TypeError("offline"));
  await act(async () => root.render(<CloseRequestButton requestId="own-request" />));
  await submit();
  expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);
  expect(container.querySelector('[role="alert"]')?.textContent).toContain("Try again");
  closeRequest.mockResolvedValueOnce({ ok: true });
  await submit();
  expect(closeRequest).toHaveBeenCalledTimes(2);
  expect(refresh).toHaveBeenCalledTimes(1);
});
