"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { z } from "zod";

import { requestProductEvidence } from "@/app/buyer/actions";
import { createRequestAction, respondAction, shareAction } from "@/app/connections/actions";
import { Button } from "@/components/ui/button";
import { MUTE_KEY, SpeakReply } from "@/components/voice/speak-reply";
import { CloseIcon, PanelIcon, SpeakerIcon } from "@/components/workspace/icons";
import { publishWorkspaceDirective } from "@/components/workspace/workspace-events";
import { type ConfirmDirective, confirmDirectiveSchema } from "@/lib/agent/confirm-action";
import { siteDirectiveSchema } from "@/lib/agent/site-map";
import { workspaceDirectiveSchema } from "@/lib/assessment/types";

import { type AssistantMessage, loadHistory, saveHistory } from "./assistant-history";

const turnSchema = z.object({
  reply: z.string(),
  directives: z.array(
    z.union([workspaceDirectiveSchema, siteDirectiveSchema, confirmDirectiveSchema]),
  ),
});
type Message = AssistantMessage;

type Card = {
  id: string;
  directive: ConfirmDirective;
  status: "waiting" | "sending" | "sent" | "cancelled";
  error: string | null;
};

function formData(values: Record<string, string | number | undefined>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) data.set(key, String(value));
  }
  return data;
}

/** The existing server actions. Validation, ownership and the email stay on the manual path. */
async function sendConfirmed(send: ConfirmDirective["send"]): Promise<string | null> {
  switch (send.action) {
    case "request_evidence": {
      const result = await requestProductEvidence({
        productId: send.productId,
        buyerOrgName: send.buyerOrgName,
        message: send.message,
      });
      return result.ok ? null : (result.error ?? Object.values(result.errors)[0] ?? "Not sent.");
    }
    case "create_board_request": {
      const { action: _action, ...fields } = send;
      return (await createRequestAction(null, formData(fields)))?.error ?? null;
    }
    case "respond_to_request": {
      const { action: _action, ...fields } = send;
      return (await respondAction(null, formData(fields)))?.error ?? null;
    }
    case "share_result": {
      const { action: _action, ...fields } = send;
      return (await shareAction(null, formData(fields)))?.error ?? null;
    }
  }
}

export function AssistantPanel({
  userId,
  path,
  productId,
  onCollapse,
  onNavigated,
}: {
  /** Signed-in user's id. It keys the stored chat. Without it the chat stays in memory. */
  userId?: string;
  /** Current page path, sent so the assistant knows where the user is. */
  path: string;
  productId?: string;
  onCollapse?: () => void;
  /** Called after the assistant has applied a navigation. */
  onNavigated?: () => void;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [restoredFor, setRestoredFor] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [muted, setMuted] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const request = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (!userId) return;
    setMessages(loadHistory(userId));
    setRestoredFor(userId);
  }, [userId]);
  // Saves only after the stored chat was read into state, so a first render
  // with no messages never overwrites it.
  useEffect(() => {
    if (userId && restoredFor === userId) saveHistory(userId, messages);
  }, [userId, restoredFor, messages]);
  useEffect(() => {
    try {
      setMuted(sessionStorage.getItem(MUTE_KEY) === "1");
    } catch {
      /* Speech stays off without storage. */
    }
  }, []);
  function toggleSpeech() {
    const next = !muted;
    setMuted(next);
    try {
      sessionStorage.setItem(MUTE_KEY, next ? "1" : "0");
    } catch {
      /* Keep the in-memory choice. */
    }
  }
  useEffect(() => {
    if (messages.length > 0 || pending) end.current?.scrollIntoView({ block: "nearest" });
  }, [messages, pending]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !text.trim()) return;
    const next: Message[] = [
      ...messages,
      { id: crypto.randomUUID(), role: "user", text: text.trim() },
    ];
    setPending(true);
    setError(null);
    request.current = new AbortController();
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          page: { path, ...(productId ? { productId } : {}) },
          messages: next.slice(-39).map(({ role, text }) => ({ role, text })),
        }),
        signal: request.current.signal,
      });
      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? "This product is a browser-local example. Create a product saved to your account to use the assistant."
            : response.status === 401
              ? "Sign in again to continue the conversation."
              : "The assistant could not reply. Your message is still here. Try again.",
        );
      }
      const turn = turnSchema.parse(await response.json());
      setMessages([...next, { id: crypto.randomUUID(), role: "model", text: turn.reply }]);
      setText((current) => (current.trim() === next.at(-1)?.text ? "" : current));
      for (const directive of turn.directives) {
        if (directive.type === "navigate_site") router.push(directive.route);
        else if (directive.type === "confirm_action")
          setCards((current) => [
            ...current,
            { id: crypto.randomUUID(), directive, status: "waiting", error: null },
          ]);
        else publishWorkspaceDirective(directive);
      }
      if (turn.directives.length > 0) onNavigated?.();
      router.refresh();
    } catch (error) {
      if (!request.current?.signal.aborted)
        setError(
          error instanceof Error ? error.message : "The assistant could not reply. Try again.",
        );
    } finally {
      setPending(false);
    }
  }

  function note(textValue: string) {
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "model", text: textValue },
    ]);
  }

  function updateCard(id: string, patch: Partial<Card>) {
    setCards((current) => current.map((card) => (card.id === id ? { ...card, ...patch } : card)));
  }

  async function confirm(card: Card) {
    if (card.status !== "waiting") return;
    updateCard(card.id, { status: "sending", error: null });
    try {
      const failure = await sendConfirmed(card.directive.send);
      if (failure) {
        updateCard(card.id, { status: "waiting", error: failure });
        return;
      }
      updateCard(card.id, { status: "sent" });
      note(`Sent: ${card.directive.title}.`);
      router.refresh();
    } catch {
      updateCard(card.id, { status: "waiting", error: "It could not be sent. Try again." });
    }
  }

  function cancel(card: Card) {
    if (card.status !== "waiting") return;
    updateCard(card.id, { status: "cancelled" });
    note(`Cancelled. Not sent: ${card.directive.title}.`);
  }

  return (
    <section className="flex h-full min-h-80 flex-col bg-card">
      <header className="flex min-h-16 items-center gap-2 border-b border-line px-5 py-3">
        <PanelIcon />
        <h2 className="flex-1 text-sm font-semibold">Assistant</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={muted ? "Enable spoken replies" : "Mute spoken replies"}
          aria-pressed={!muted}
          title={
            muted ? "Speech off" : "Speech on. The first 600 characters of each reply are spoken."
          }
          onClick={toggleSpeech}
        >
          <SpeakerIcon muted={muted} />
        </Button>
        {onCollapse ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Close assistant"
            onClick={onCollapse}
          >
            <CloseIcon />
          </Button>
        ) : null}
      </header>
      <div
        className="min-h-0 flex-1 overflow-y-auto px-5 py-6"
        role="log"
        aria-label="Conversation"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <p className="text-[13px] leading-relaxed text-muted">
            {productId
              ? "Ask about buyer requirements, add documents, or review a finding. You choose the files and decide when to assess."
              : "Ask how to use TradeReady, or open a product to work on its documents and buyer requirements."}
          </p>
        ) : null}
        <ol className="space-y-5">
          {messages.map((message, index) => (
            <li
              key={message.id}
              className="text-[13px] leading-relaxed whitespace-pre-wrap break-words"
            >
              <p className="mb-1.5 text-xs font-medium text-muted">
                {message.role === "user" ? "You" : "Assistant"}
              </p>
              {message.role === "model" && index === messages.length - 1 ? (
                <SpeakReply text={message.text} muted={muted} />
              ) : (
                <p>{message.text}</p>
              )}
            </li>
          ))}
        </ol>
        {cards.map((card) => (
          <fieldset
            key={card.id}
            className="mt-5 min-w-0 rounded-md border border-line p-4 text-[13px] leading-relaxed"
          >
            <legend className="px-1 font-medium">{card.directive.title}</legend>
            <ul className="mt-2 space-y-1 text-muted">
              {card.directive.details.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            {card.error ? (
              <p role="alert" className="mt-2 text-danger">
                {card.error}
              </p>
            ) : null}
            {card.status === "sent" ? (
              <p className="mt-3 text-muted">Sent.</p>
            ) : card.status === "cancelled" ? (
              <p className="mt-3 text-muted">Cancelled. Nothing was sent.</p>
            ) : (
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  pending={card.status === "sending"}
                  onClick={() => void confirm(card)}
                >
                  Send
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={card.status === "sending"}
                  onClick={() => cancel(card)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </fieldset>
        ))}
        {pending ? (
          <p role="status" className="mt-4 text-[13px] text-muted">
            Working on your request…
          </p>
        ) : null}
        <div ref={end} />
      </div>
      <form onSubmit={(event) => void submit(event)} className="border-t border-line px-5 py-4">
        {error ? (
          <p role="alert" className="mb-3 text-[13px] text-danger">
            {error}
          </p>
        ) : null}
        <label htmlFor="assistant-message" className="sr-only">
          Message
        </label>
        <textarea
          id="assistant-message"
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={8000}
          rows={3}
          placeholder={productId ? "Ask about this product…" : "Ask about the site…"}
          className="field resize-none py-3 text-sm"
        />
        <div className="mt-3 flex items-start justify-between gap-4">
          <p className="text-xs leading-relaxed text-muted">
            The assistant can make mistakes. Verify its output.
          </p>
          <Button type="submit" size="sm" pending={pending} disabled={!text.trim()}>
            Send
          </Button>
        </div>
      </form>
    </section>
  );
}
