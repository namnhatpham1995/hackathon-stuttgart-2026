"use client";

import { type ReactNode, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type Note = { id: string; role: "user" | "result"; text: string; at: string };

const steps = [
  "Open the product",
  "Check the draft",
  "Add documents",
  "Upload and assess",
  "Read the evidence report",
];

/**
 * Assistant column. Group 14 owns `src/components/assistant/assistant-panel.tsx`.
 * Swap the import in `shell.tsx` when that file exists.
 */
export function AssistantPanel({ onCollapse }: { onCollapse?: () => void }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");
  const [thoughtOpen, setThoughtOpen] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    function focusInput() {
      document.getElementById("assistant-message")?.focus();
    }
    window.addEventListener("exportready:focus-assistant", focusInput);
    return () => window.removeEventListener("exportready:focus-assistant", focusInput);
  }, []);

  function send() {
    const text = draft.trim();
    if (!text) return;
    const at = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(
      new Date(),
    );
    setNotes((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", text, at },
      {
        id: crypto.randomUUID(),
        role: "result",
        text: "The text assistant is not connected. Use the buttons on the page. Nothing was sent.",
        at,
      },
    ]);
    setDraft("");
    setVote(null);
  }

  return (
    <section className="flex h-full min-h-80 flex-col border-accent bg-card xl:min-h-[calc(100dvh-3.25rem)] xl:border-l-2">
      <header className="flex items-center gap-2 border-b border-line px-3 py-2">
        <h2 className="min-w-0 flex-1 text-sm font-semibold tracking-normal">Assistant</h2>
        <IconButton label="History is not stored" disabled>
          <ClockIcon />
        </IconButton>
        <IconButton
          label="Clear this panel"
          onClick={() => {
            setNotes([]);
            setVote(null);
          }}
        >
          <PlusIcon />
        </IconButton>
        {onCollapse ? (
          <IconButton label="Collapse assistant" onClick={onCollapse}>
            <CollapseIcon />
          </IconButton>
        ) : null}
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        <button
          type="button"
          className="meta inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-muted"
          aria-expanded={thoughtOpen}
          onClick={() => setThoughtOpen((value) => !value)}
        >
          Not connected
        </button>
        {thoughtOpen ? (
          <p className="meta rounded-md border border-line bg-paper px-2 py-2 text-muted">
            Typed requests stay in this panel. They do not start an assessment or send email.
          </p>
        ) : null}

        {notes.length === 0 ? (
          <p className="text-sm text-muted">
            No messages yet. The product form, documents, and report work without this panel.
          </p>
        ) : (
          notes.map((note) =>
            note.role === "user" ? (
              <p
                key={note.id}
                className="rounded-md border border-line bg-paper px-2.5 py-2 text-sm"
              >
                {note.text}
              </p>
            ) : (
              <div key={note.id} className="space-y-1">
                <p className="inline-flex rounded-md bg-review px-2 py-1 text-[13px] font-medium text-review-ink">
                  {note.text}
                </p>
                <p className="meta flex items-center gap-2 text-muted">
                  <button type="button" aria-pressed={vote === "up"} onClick={() => setVote("up")}>
                    Helpful
                  </button>
                  <button
                    type="button"
                    aria-pressed={vote === "down"}
                    onClick={() => setVote("down")}
                  >
                    Not helpful
                  </button>
                  <span>{note.at}</span>
                </p>
              </div>
            ),
          )
        )}

        <div className="rounded-md border border-line">
          <p className="meta border-b border-line px-3 py-2 font-medium">
            0 of {steps.length} run from this panel
          </p>
          <ul className="space-y-2 px-3 py-2">
            {steps.map((step) => (
              <li key={step} className="meta flex items-center gap-2 text-ink">
                <span aria-hidden="true" className="size-3.5 rounded-full border border-line" />
                {step}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <form
        className="border-t border-line px-3 py-3"
        aria-label="Assistant message"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <label htmlFor="assistant-message" className="sr-only">
          Message
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id="assistant-message"
            value={draft}
            rows={2}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask about this product"
            className="field min-h-16 flex-1 py-2 text-sm"
          />
          <Button type="submit" size="sm" aria-label="Send message">
            Send
          </Button>
        </div>
        <p className="meta mt-2 text-muted">
          The assistant can make mistakes. Please verify output.
        </p>
      </form>
    </section>
  );
}

function IconButton({
  label,
  children,
  disabled,
  onClick,
}: {
  label: string;
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded border border-line text-muted hover:bg-paper disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function CollapseIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-3.5"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M10 3.5 6.5 8 10 12.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-3.5"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-3.5"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="8" cy="8" r="5" />
      <path d="M8 5.5V8l1.5 1.5" />
    </svg>
  );
}
