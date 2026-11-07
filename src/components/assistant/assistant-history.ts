export type AssistantMessage = { id: string; role: "user" | "model"; text: string };

const PREFIX = "tradeready-assistant:";
const OPEN_KEY = `${PREFIX}open`;

/** The key contains the signed-in user's id, so another account in the tab never reads it. */
export function historyKey(userId: string): string {
  return `${PREFIX}history:${userId}`;
}

function isMessage(value: unknown): value is AssistantMessage {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.text === "string" &&
    (row.role === "user" || row.role === "model")
  );
}

export function loadHistory(userId: string): AssistantMessage[] {
  try {
    const raw = sessionStorage.getItem(historyKey(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isMessage).slice(-100) : [];
  } catch {
    return [];
  }
}

export function saveHistory(userId: string, messages: AssistantMessage[]) {
  try {
    sessionStorage.setItem(historyKey(userId), JSON.stringify(messages.slice(-100)));
  } catch {
    /* The chat stays in memory without storage. */
  }
}

export function loadOpen(): boolean {
  try {
    return sessionStorage.getItem(OPEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveOpen(open: boolean) {
  try {
    sessionStorage.setItem(OPEN_KEY, open ? "1" : "0");
  } catch {
    /* Keep the in-memory choice. */
  }
}

/** Every sign-out button calls this before `signOut()`. It removes every user's chat from this tab. */
export function clearAssistantHistory() {
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith(PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {
    /* Nothing was stored. */
  }
}
