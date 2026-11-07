// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { AssistantPanel } from "./assistant-panel";
import { subscribeWorkspaceDirective } from "@/components/workspace/workspace-events";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  sessionStorage.clear();
  sessionStorage.setItem("tradeready-speech-muted", "1");
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function send(text: string) {
  const input = container.querySelector("textarea");
  if (!input) throw new Error("Missing message input");
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () =>
    container
      .querySelector("form")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}

test("the upload and R3 conversation applies directives and continues with speech off", async () => {
  const fetchSpy = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      Response.json({
        reply: "Choose the buyer documents.",
        directives: [{ type: "show_upload_card" }],
      }),
    )
    .mockResolvedValueOnce(
      Response.json({
        reply:
          "R3 failed because 03_CAP104_Inspection_RevA.pdf says “Drawing revision: A.” Provide revision B.",
        directives: [{ type: "request_replacement", documentId: "inspection-a" }],
      }),
    );
  const received: unknown[] = [];
  const unsubscribe = subscribeWorkspaceDirective((directive) => received.push(directive));
  try {
    await act(async () => root.render(<AssistantPanel productId="owned-product" />));
    await send("I want to submit my product and documents for this buyer");
    expect(container.textContent).toContain("Choose the buyer documents.");
    await send("Why did R3 fail?");
    expect(container.textContent).toContain("Drawing revision: A.");
    expect(received).toEqual([
      { type: "show_upload_card" },
      { type: "request_replacement", documentId: "inspection-a" },
    ]);
    expect(fetchSpy.mock.calls.map(([url]) => url)).toEqual(["/api/assistant", "/api/assistant"]);
    const secondBody = JSON.parse(String(fetchSpy.mock.calls[1]?.[1]?.body));
    expect(secondBody.productId).toBe("owned-product");
    expect(secondBody.messages.map((message: { role: string }) => message.role)).toEqual([
      "user",
      "model",
      "user",
    ]);
    expect(container.querySelector("textarea")?.disabled).toBe(false);
    expect(container.querySelector('button[aria-label="Enable spoken replies"]')).not.toBeNull();
    expect(refresh).toHaveBeenCalledTimes(2);
  } finally {
    unsubscribe();
  }
});

test("a failed request retains the message and lets the user retry", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("unavailable", { status: 503 }));
  await act(async () => root.render(<AssistantPanel productId="owned-product" />));
  await send("Why did R3 fail?");
  expect(container.querySelector("textarea")?.value).toBe("Why did R3 fail?");
  expect(container.querySelector('[role="alert"]')?.textContent).toContain("Try again");
  expect(container.querySelector('button[type="submit"]')?.hasAttribute("disabled")).toBe(false);
});
