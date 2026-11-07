import { workspaceDirectiveSchema, type WorkspaceDirective } from "@/lib/assessment/types";

type Listener = (directive: WorkspaceDirective) => void;

const listeners = new Set<Listener>();

/** Client event bus. The assistant panel publishes; workspace views subscribe. */
export function publishWorkspaceDirective(directive: WorkspaceDirective) {
  const validated = workspaceDirectiveSchema.parse(directive);
  for (const listener of listeners) listener(validated);
}

export function subscribeWorkspaceDirective(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
