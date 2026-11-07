import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";

import { SpeakReply, speakOrStayText } from "./speak-reply";

const reply = "Why did R3 fail?";

function audioResponse() {
  return new Response(Uint8Array.from([0x49, 0x44, 0x33, 0x04]), {
    status: 200,
    headers: { "content-type": "audio/mpeg" },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("spoken reply playback", () => {
  test("an unavailable speech response leaves the reply as text", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ available: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const player = { play: vi.fn(async () => {}) };

    await expect(speakOrStayText(reply, player)).resolves.toBe("text");

    expect(player.play).not.toHaveBeenCalled();
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe("/api/speech");
    expect(JSON.parse(String(init?.body))).toEqual({ text: reply });
  });

  test("a failed speech request leaves the reply as text", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "speech failed" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    );
    const player = { play: vi.fn(async () => {}) };

    await expect(speakOrStayText(reply, player)).resolves.toBe("text");

    expect(player.play).not.toHaveBeenCalled();
  });

  test("a network failure leaves the reply as text", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("offline"));
    const player = { play: vi.fn(async () => {}) };

    await expect(speakOrStayText(reply, player)).resolves.toBe("text");

    expect(player.play).not.toHaveBeenCalled();
  });

  test("audio from the speech route is played", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(audioResponse());
    const played: string[] = [];

    const result = await speakOrStayText(
      reply,
      {
        play: async (url) => {
          played.push(url);
        },
      },
      () => "blob:spoken-reply",
    );

    expect(result).toBe("audio");
    expect(played).toEqual(["blob:spoken-reply"]);
  });

  test("playback failure stays text and does not throw", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(audioResponse());

    await expect(
      speakOrStayText(reply, {
        play: () => Promise.reject(new Error("autoplay blocked")),
      }),
    ).resolves.toBe("text");
  });

  test("the reply is shown with a mute toggle and no error dialog", () => {
    const html = renderToStaticMarkup(<SpeakReply text={reply} />);

    expect(html).toContain(reply);
    expect(html).toContain("Speech on");
    expect(html).toContain('aria-pressed="false"');
    expect(html).not.toContain("<dialog");
    expect(html).not.toContain('role="alert"');
    expect(html.toLowerCase()).not.toContain("error");
  });
});
