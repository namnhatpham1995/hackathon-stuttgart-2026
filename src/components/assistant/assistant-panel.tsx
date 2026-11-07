"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { MUTE_KEY, SpeakReply } from "@/components/voice/speak-reply";
import { CloseIcon, PanelIcon, SpeakerIcon } from "@/components/workspace/icons";
import { publishWorkspaceDirective } from "@/components/workspace/workspace-events";
import { workspaceDirectiveSchema } from "@/lib/assessment/types";

const turnSchema = z.object({ reply: z.string(), directives: z.array(workspaceDirectiveSchema) });
type Message = { id: string; role: "user" | "model"; text: string };

export function AssistantPanel({
  productId,
  onCollapse,
}: {
  productId?: string;
  onCollapse?: () => void;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [muted, setMuted] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => () => request.current?.abort(), []);
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
    if (!productId || pending || !text.trim()) return;
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
          productId,
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
      for (const directive of turn.directives) publishWorkspaceDirective(directive);
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
              : "Open a product to start a conversation about its documents and buyer requirements."}
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
          disabled={!productId}
          placeholder={productId ? "Ask about this product…" : "Open a product first"}
          className="field resize-none py-3 text-sm disabled:cursor-not-allowed disabled:bg-paper"
        />
        <div className="mt-3 flex items-start justify-between gap-4">
          <p className="text-xs leading-relaxed text-muted">
            The assistant can make mistakes. Verify its output.
          </p>
          <Button type="submit" size="sm" pending={pending} disabled={!productId || !text.trim()}>
            Send
          </Button>
        </div>
      </form>
    </section>
  );
}
