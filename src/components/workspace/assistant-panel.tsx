"use client";

import { Button } from "@/components/ui/button";

import { CloseIcon, PanelIcon } from "./icons";

/** The connected text assistant replaces this panel when its service is available. */
export function AssistantPanel({ onCollapse }: { onCollapse?: () => void }) {
  return (
    <section className="flex h-full min-h-80 flex-col bg-card">
      <header className="flex min-h-16 items-center gap-2 border-b border-line px-5 py-3">
        <PanelIcon />
        <h2 className="flex-1 text-sm font-semibold">Assistant</h2>
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
      <div className="min-h-0 flex-1 px-5 py-6">
        <h3 className="text-sm font-medium">Assistant unavailable</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          The text assistant is not connected. Use Product details to edit the draft and the
          document list to add evidence.
        </p>
      </div>
      <div className="border-t border-line px-5 py-4">
        <label htmlFor="assistant-message" className="sr-only">
          Message
        </label>
        <textarea
          id="assistant-message"
          disabled
          rows={3}
          placeholder="Assistant unavailable"
          className="field resize-none py-3 text-sm disabled:cursor-not-allowed disabled:bg-paper"
        />
        <div className="mt-3 flex items-start justify-between gap-4">
          <p className="text-xs leading-relaxed text-muted">
            The assistant can make mistakes. Verify its output.
          </p>
          <Button type="button" size="sm" disabled>
            Send
          </Button>
        </div>
      </div>
    </section>
  );
}
