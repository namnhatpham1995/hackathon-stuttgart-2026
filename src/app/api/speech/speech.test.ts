import { afterEach, describe, expect, test, vi } from "vitest";

const speechKey = vi.hoisted(() => ({ value: undefined as string | undefined }));

vi.mock("@/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/env")>();
  return {
    ...actual,
    env: new Proxy(actual.env, {
      get(target, property, receiver) {
        if (property === "ELEVENLABS_API_KEY") return speechKey.value;
        return Reflect.get(target, property, receiver);
      },
    }),
  };
});

import { POST } from "@/app/api/speech/route";
import { auth } from "@/lib/auth";

const password = "correct-horse-1";
const reply = "Revision A does not match the drawing.";
const serverKey = "xi-test-key-not-real";
const audioBytes = Uint8Array.from([0x49, 0x44, 0x33, 0x04, 0x00, 0x00]);

async function createUser(name: string) {
  const email = `${name.toLowerCase()}-${crypto.randomUUID()}@example.com`;
  const result = await auth.api.signUpEmail({ body: { name, email, password } });
  return { id: result.user.id, email };
}

async function sessionCookie(email: string) {
  const response = await auth.api.signInEmail({
    body: { email, password },
    asResponse: true,
  });
  const parts = response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]);
  if (parts.length === 0) throw new Error("sign-in did not set a session cookie");
  return parts.join("; ");
}

function post(cookie: string | null, body: unknown) {
  const headers = new Headers({ "content-type": "application/json" });
  if (cookie) headers.set("cookie", cookie);
  return POST(
    new Request("http://localhost/api/speech", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
  );
}

function mockAudio() {
  return vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response(audioBytes, { status: 200, headers: { "content-type": "audio/mpeg" } }),
    );
}

afterEach(() => {
  speechKey.value = undefined;
  vi.restoreAllMocks();
});

describe("POST /api/speech", () => {
  test("speech requires a session", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const response = await post(null, { text: reply });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Sign in required" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("an unset speech key leaves the reply as text and does not call ElevenLabs", async () => {
    const user = await createUser("Ada");
    const cookie = await sessionCookie(user.email);
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const response = await post(cookie, { text: reply });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({ available: false });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("a reply is returned as the audio ElevenLabs produced", async () => {
    const user = await createUser("Bea");
    const cookie = await sessionCookie(user.email);
    speechKey.value = serverKey;
    const fetchSpy = mockAudio();

    const response = await post(cookie, { text: reply, apiKey: "client-supplied-key" });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("audio/mpeg");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(Buffer.from(audioBytes));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe("https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM");
    const headers = new Headers(init?.headers);
    expect(headers.get("xi-api-key")).toBe(serverKey);
    expect(headers.get("xi-api-key")).not.toBe("client-supplied-key");
    expect(JSON.parse(String(init?.body))).toEqual({
      text: reply,
      model_id: "eleven_flash_v2_5",
    });
  });

  test("a failed synthesis stays text and hides the provider error", async () => {
    const user = await createUser("Cara");
    const cookie = await sessionCookie(user.email);
    speechKey.value = serverKey;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ detail: "quota exceeded" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );

    const response = await post(cookie, { text: "Why did R3 fail?" });

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(JSON.parse(body)).toEqual({ available: false });
    expect(body).not.toContain("quota");
    expect(body).not.toContain("detail");
  });

  test("600 characters are spoken and 601 are rejected", async () => {
    const user = await createUser("Dora");
    const cookie = await sessionCookie(user.email);
    speechKey.value = serverKey;
    const fetchSpy = mockAudio();
    const accepted = "a".repeat(600);

    const ok = await post(cookie, { text: accepted });

    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toContain("audio/mpeg");
    const sent = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body));
    expect(sent.text).toBe(accepted);
    expect(sent.text).toHaveLength(600);

    fetchSpy.mockClear();
    const rejected = await post(cookie, { text: "a".repeat(601) });

    expect(rejected.status).toBe(400);
    expect(await rejected.json()).toEqual({ error: "Invalid request" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
