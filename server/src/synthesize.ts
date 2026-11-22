/**
 * Calls Google Cloud Text-to-Speech for one already-normalized piece of Hebrew text.
 * Pure-ish: takes text, returns an MP3 Buffer — no Express/HTTP here, same separation the
 * old `server/src/renderMatrix.ts` kept from `index.ts` (see git history, PR #55).
 *
 * Auth: the official `@google-cloud/text-to-speech` client library picks up Application
 * Default Credentials on its own. On Cloud Run that means the identity of whichever service
 * account this service is deployed with (see README.md) — no key file, no WIF dance, and
 * nothing to configure here at all. This is simpler than the old notebook-server's
 * Anthropic call (see git history, `anthropicAuth.ts`), which needed Workload Identity
 * Federation specifically because Anthropic is a *different* cloud than the one running
 * this service. Google-to-Google needs none of that.
 */

import textToSpeech from "@google-cloud/text-to-speech";

const client = new textToSpeech.TextToSpeechClient();

/**
 * The exact voice to use — he-IL, Chirp 3: HD, the newest and most natural-sounding tier
 * Google offers that is still inside the Cloud TTS free monthly quota (1,000,000 characters
 * at this tier; verified against the live pricing/voice-list pages on 2026-11-21 — see
 * docs/features/hebrew-math-tts/architecture.md for the other tiers considered and why this
 * one won). Overridable via env var without a redeploy of this file, since the ideal
 * *persona* for a specific voice name is a product/content taste call, not an engineering
 * one — see this feature's architecture doc for that specific open call.
 */
const VOICE_NAME = process.env.TTS_VOICE_NAME ?? "he-IL-Chirp3-HD-Leda";

/** A text well past anything a real explanation or question could need (the whole app's
 *  longest spoken explanation is a few sentences). Rejecting past this protects the free
 *  quota from a single malformed or abusive request, cheaply, before it ever reaches
 *  Google's API. */
const MAX_TEXT_LENGTH = 2000;

export class TextTooLongError extends Error {}

export async function synthesizeSpeech(text: string): Promise<Buffer> {
  if (text.length > MAX_TEXT_LENGTH) throw new TextTooLongError(`text exceeds ${MAX_TEXT_LENGTH} characters`);

  const [response] = await client.synthesizeSpeech({
    input: { text },
    voice: { languageCode: "he-IL", name: VOICE_NAME },
    audioConfig: {
      audioEncoding: "MP3",
      // Slightly slower than Google's own default, for the same reason the device voice
      // this app already has (src/data/speech.ts) is deliberately slowed to 0.82: a
      // seven-year-old following along needs a touch more time than the flat default
      // gives. Not as slow as the device voice's value — this voice tier already sounds
      // considerably less rushed at its own default pace.
      speakingRate: 0.92,
    },
  });

  const audio = response.audioContent;
  if (!audio) throw new Error("Text-to-Speech returned no audio content");
  return Buffer.isBuffer(audio) ? audio : Buffer.from(audio as Uint8Array);
}
