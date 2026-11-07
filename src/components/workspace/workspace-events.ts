import type { WorkspaceDirective } from "./contract";

type Listener = (directive: WorkspaceDirective) => void;

const listeners = new Set<Listener>();

/** Client event bus. The assistant panel publishes; workspace views subscribe. */
export function publishWorkspaceDirective(directive: WorkspaceDirective) {
  for (const listener of listeners) listener(directive);
}

export function subscribeWorkspaceDirective(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
