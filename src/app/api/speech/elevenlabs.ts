/** Premade ElevenLabs voice (Rachel). Not a clone. */
const STOCK_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
/** Low-latency stock model for a short assistant reply. */
const MODEL_ID = "eleven_flash_v2_5";
const SPEECH_URL = `https://api.elevenlabs.io/v1/text-to-speech/${STOCK_VOICE_ID}`;
const TIMEOUT_MS = 20_000;

/**
 * Text-to-speech through ElevenLabs. The caller supplies the server key.
 * Failures throw a message with no response body, so a provider error is
 * never forwarded to the browser.
 */
export async function synthesizeSpeech(text: string, apiKey: string): Promise<Uint8Array> {
  let response: Response;
  try {
    response = await fetch(SPEECH_URL, {
      method: "POST",
      redirect: "error",
      headers: {
        accept: "audio/mpeg",
        "content-type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({ text, model_id: MODEL_ID }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error("ElevenLabs request timed out after 20s", { cause: error });
    }
    throw error;
  }

  if (!response.ok) {
    throw new Error(`ElevenLabs rejected the speech request (${response.status})`);
  }

  const audio = new Uint8Array(await response.arrayBuffer());
  if (audio.byteLength === 0) {
    throw new Error("ElevenLabs returned empty audio");
  }
  return audio;
}
