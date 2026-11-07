// @vitest-environment happy-dom
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { subscribeWorkspaceDirective } from "@/components/workspace/workspace-events";
import { AssistantPanel } from "./assistant-panel";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push }) }));

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
    await act(async () =>
      root.render(<AssistantPanel path="/workspace/owned-product" productId="owned-product" />),
    );
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
    expect(secondBody.page).toEqual({
      path: "/workspace/owned-product",
      productId: "owned-product",
    });
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
  await act(async () =>
    root.render(<AssistantPanel path="/workspace/owned-product" productId="owned-product" />),
  );
  await send("Why did R3 fail?");
  expect(container.querySelector("textarea")?.value).toBe("Why did R3 fail?");
  expect(container.querySelector('[role="alert"]')?.textContent).toContain("Try again");
  expect(container.querySelector('button[type="submit"]')?.hasAttribute("disabled")).toBe(false);
});

test("without a product the panel sends typed text and names the page", async () => {
  const fetchSpy = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(Response.json({ reply: "Use New product.", directives: [] }));
  await act(async () => root.render(<AssistantPanel path="/workspace" />));
  expect(container.querySelector("textarea")?.disabled).toBe(false);
  await send("How do I add a product?");
  const body = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body));
  expect(body.page).toEqual({ path: "/workspace" });
  expect(body.messages).toEqual([{ role: "user", text: "How do I add a product?" }]);
  expect(container.textContent).toContain("Use New product.");
});

test("a site directive navigates to the listed route", async () => {
  push.mockClear();
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    Response.json({
      reply: "Opened the inbox.",
      directives: [{ type: "navigate_site", route: "/connections/inbox" }],
    }),
  );
  const onNavigated = vi.fn();
  await act(async () => root.render(<AssistantPanel path="/buyer" onNavigated={onNavigated} />));
  await send("Open my inbox");
  expect(push).toHaveBeenCalledWith("/connections/inbox");
  expect(onNavigated).toHaveBeenCalledTimes(1);
});

test("the chat is restored after a remount and is not shown to another user", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    Response.json({ reply: "Hello back.", directives: [] }),
  );
  await act(async () => root.render(<AssistantPanel userId="user-a" path="/buyer" />));
  await send("Hello");
  expect(sessionStorage.getItem("tradeready-assistant:history:user-a")).toContain("Hello back.");

  await act(async () => root.unmount());
  root = createRoot(container);
  await act(async () => root.render(<AssistantPanel userId="user-a" path="/connections" />));
  expect(container.textContent).toContain("Hello back.");
  expect(container.textContent).toContain("Hello");

  await act(async () => root.unmount());
  root = createRoot(container);
  await act(async () => root.render(<AssistantPanel userId="user-b" path="/connections" />));
  expect(container.textContent).not.toContain("Hello back.");
});

test("a stored chat survives a strict-mode mount", async () => {
  sessionStorage.setItem(
    "tradeready-assistant:history:user-a",
    JSON.stringify([{ id: "m1", role: "user", text: "Earlier question" }]),
  );
  await act(async () =>
    root.render(
      <StrictMode>
        <AssistantPanel userId="user-a" path="/buyer" />
      </StrictMode>,
    ),
  );
  expect(container.textContent).toContain("Earlier question");
  expect(sessionStorage.getItem("tradeready-assistant:history:user-a")).toContain(
    "Earlier question",
  );
});
