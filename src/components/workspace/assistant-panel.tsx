/**
 * Assistant column. Group 14 owns `src/components/assistant/assistant-panel.tsx`.
 * This shell is what the workspace mounts until that file exists; swap the import
 * in `shell.tsx` and do not change the layout around it.
 */
export function AssistantPanel() {
  return (
    <section className="flex h-full min-h-80 flex-col bg-card xl:min-h-dvh">
      <header className="border-b border-line px-4 py-4">
        <h2 className="text-base font-semibold tracking-tight">Assistant</h2>
        <p className="mt-1 text-sm text-muted">
          Asks use the same actions as the buttons. It cannot send email or start an assessment on
          its own.
        </p>
      </header>
      <div className="flex-1 px-4 py-4">
        <p className="text-sm text-muted">
          No messages yet. The text assistant is not connected in this build. The product form,
          documents, and report all work without it.
        </p>
      </div>
      <form className="border-t border-line px-4 py-4" aria-label="Assistant message">
        <label htmlFor="assistant-message" className="text-sm font-medium">
          Message
        </label>
        <textarea
          id="assistant-message"
          disabled
          rows={3}
          placeholder="Available when the assistant is connected"
          className="field mt-1.5 min-h-20 py-2"
        />
        <p className="mt-2 text-sm text-muted">
          Typed requests will show here. Until then, use the controls in the workspace.
        </p>
      </form>
    </section>
  );
}
