/**
 * Google Cloud Text-to-Speech, called through the small server in `server/` — never
 * directly from the browser, and never with any API key or credential anywhere in this
 * bundle (see server/README.md for why that call has to go through a server at all).
 *
 * This module is the *only* thing speech.ts's `speak()` needs from here: hand it already-
 * normalized Hebrew text (see `hebrewMathSpeech.ts`), get back a playable audio `Blob`, or
 * `null` when the cloud voice could not be reached for any reason at all — no network, the
 * server down, a slow response, a bad response, the feature not configured. `null` is never
 * an error the caller has to inspect; it is simply "use the device voice for this part
 * instead", which `speak()` already does. That is what satisfies CLAUDE.md's rule that a
 * child is never left listening to silence because a network call failed.
 *
 * Audio already synthesized once is cached (by a hash of the exact text, in the browser's
 * Cache Storage) so the same explanation is never re-fetched, re-waited-for, or re-billed
 * on a second read — including across sessions, since Cache Storage persists like any other
 * browser storage.
 */

/** Empty by default: with no server configured, every call below returns `null` right
 *  away and `speech.ts` falls back to the device voice — exactly as this app behaved before
 *  this feature existed. Set via `.env`/CI, never hard-coded to a real deployment here. */
const SERVER_URL = import.meta.env?.VITE_HEBREW_TTS_SERVER_URL ?? "";

/**
 * Whether there is even a cloud voice to try. `speech.ts` checks this *before* starting
 * any async work for a part, rather than always calling `fetchCloudAudio` and letting it
 * resolve to `null` — with no server configured (true in every environment today: the
 * tests, and the live site until a server is actually deployed and wired in, see
 * server/README.md), that keeps the whole call chain synchronous, exactly as it was before
 * this feature existed. That turned out to matter for a reason sharper than tidiness: a
 * synchronous chain can't be interrupted mid-flight by anything else on the page, while an
 * async one — even one that only awaits a microtask — can. React's StrictMode (dev only)
 * double-invokes effect cleanups right after mount, and this app already has a
 * `useEffect(() => stopSpeaking, [])` (src/components/Practice.tsx) whose *cleanup is*
 * `stopSpeaking` — so that double-invoke calls it for real, synchronously, immediately
 * after the first real mount. Before this feature, that spurious call landed after the
 * utterance had already reached `speechSynthesis.speak()` (all synchronous), so it was
 * harmless. With an `await` in between, it can land *before* — invalidating the run before
 * `fetchCloudAudio`'s promise ever resolves, so the fallback that line 226 of speech.ts
 * ends up never firing, and nothing is ever actually spoken. Caught by
 * `tests/e2e/read-aloud-questions.spec.ts` (three tests) once a server URL was ever even
 * hypothetically in play — this check is what keeps today's real-world case (no server
 * deployed) exactly as synchronous, and exactly as safe, as it always was.
 */
export function cloudSpeechConfigured(): boolean {
  return Boolean(SERVER_URL);
}

/** A slow or hung network call must not make a child wait on "read aloud" far longer than
 *  the device voice would have taken to simply start — past this, give up and fall back. */
const FETCH_TIMEOUT_MS = 4000;

const CACHE_NAME = "hebrew-tts-audio-v1";

function cacheSupported(): boolean {
  return typeof window !== "undefined" && "caches" in window && "crypto" in window && !!window.crypto.subtle;
}

/** SHA-256 of the text, as a hex string — stable across sessions and devices, which a
 *  simple length-based or `btoa`-based key would not be for arbitrary Hebrew text. */
async function hashText(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** A same-origin, never-dereferenced URL used only as a Cache Storage key. */
function cacheKeyFor(hash: string): string {
  return `https://hebrew-tts-cache.invalid/${hash}.mp3`;
}

async function readFromCache(hash: string): Promise<Blob | null> {
  if (!cacheSupported()) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(cacheKeyFor(hash));
    return hit ? await hit.blob() : null;
  } catch {
    // A corrupt or disabled cache (private browsing, storage quota, etc.) is not this
    // call's problem to solve — just behave as a cache miss.
    return null;
  }
}

async function writeToCache(hash: string, blob: Blob): Promise<void> {
  if (!cacheSupported()) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(cacheKeyFor(hash), new Response(blob, { headers: { "Content-Type": "audio/mpeg" } }));
  } catch {
    // Caching is purely an optimization; failing to write one just means paying for (and
    // waiting on) this exact text again next time, never a broken reading right now.
  }
}

/**
 * Fetches (or returns the cached copy of) the spoken audio for already-normalized Hebrew
 * text. Returns `null` — never throws — for every failure mode: no server configured, no
 * network, the request timed out, or the server itself returned an error. The caller
 * (`speech.ts`) treats `null` as "speak this with the device voice instead."
 */
export async function fetchCloudAudio(text: string): Promise<Blob | null> {
  if (!SERVER_URL || !text) return null;

  const hash = await hashText(text).catch(() => null);
  if (hash) {
    const cached = await readFromCache(hash);
    if (cached) return cached;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${SERVER_URL}/synthesize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (hash) await writeToCache(hash, blob);
    return blob;
  } catch {
    // Network error, abort-on-timeout, or a malformed response — all the same outcome
    // from here: no cloud audio this time, fall back silently.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
