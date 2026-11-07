"use client";

import { useEffect, useRef, useState } from "react";

const MUTE_KEY = "exportready-speech-muted";

/**
 * Asks the server to speak `text`. Returns null when speech is off, the key
 * is unset, or the request fails. It never throws and never returns an error
 * message, so the caller keeps the reply as text.
 */
export async function fetchSpokenReply(text: string): Promise<Blob | null> {
  try {
    const response = await fetch("/api/speech", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? "";
    if (!type.startsWith("audio/")) return null;
    const blob = await response.blob();
    return blob.size > 0 ? blob : null;
  } catch {
    return null;
  }
}

export type SpeechPlayer = {
  play(url: string): Promise<void>;
};

/** Plays the spoken reply, or stays on text when there is no audio. */
export async function speakOrStayText(
  text: string,
  player: SpeechPlayer,
  createUrl: (blob: Blob) => string = (blob) => URL.createObjectURL(blob),
): Promise<"audio" | "text"> {
  const blob = await fetchSpokenReply(text);
  if (!blob) return "text";
  try {
    await player.play(createUrl(blob));
    return "audio";
  } catch {
    return "text";
  }
}

/**
 * One assistant reply, always as text, with a mute toggle. Mount from the
 * assistant panel with `<SpeakReply text={reply} />`. Mute skips the speech
 * request. A missing key or a failed playback does not open an error dialog.
 */
export function SpeakReply({ text }: { text: string }) {
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);
  const [spoken, setSpoken] = useState<"audio" | "text">("text");
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setMuted(sessionStorage.getItem(MUTE_KEY) === "1");
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || muted || text.trim().length === 0) {
      stopRef.current?.();
      return;
    }
    const audio = new Audio();
    let url: string | null = null;
    let cancelled = false;
    stopRef.current = () => {
      cancelled = true;
      audio.pause();
      if (url) URL.revokeObjectURL(url);
    };
    void speakOrStayText(text, {
      play: async (next) => {
        if (cancelled) return;
        url = next;
        audio.src = next;
        await audio.play();
      },
    }).then((result) => {
      if (!cancelled) setSpoken(result);
    });
    return () => {
      stopRef.current?.();
    };
  }, [ready, muted, text]);

  function toggleMute() {
    setMuted((current) => {
      const next = !current;
      sessionStorage.setItem(MUTE_KEY, next ? "1" : "0");
      if (next) {
        stopRef.current?.();
        setSpoken("text");
      }
      return next;
    });
  }

  return (
    <div className="flex min-w-0 items-start gap-2">
      <p className="min-w-0 flex-1" style={{ overflowWrap: "anywhere" }}>
        {text}
      </p>
      <button
        type="button"
        className="btn-secondary shrink-0 active:opacity-70"
        aria-pressed={muted}
        onClick={toggleMute}
      >
        {muted ? "Speech off" : spoken === "audio" ? "Speaking" : "Speech on"}
      </button>
    </div>
  );
}
