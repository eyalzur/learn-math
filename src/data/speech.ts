import type { Explanation } from "./explain";
import { normalizeMathSpeech } from "./hebrewMathSpeech";
import { cloudSpeechConfigured, fetchCloudAudio } from "./cloudSpeech";

/**
 * Reading aloud runs on the browser's built-in speech synthesis by default, with Google
 * Cloud Text-to-Speech preferred when it is reachable (see `cloudSpeech.ts`) — no API key
 * ever ships to the browser either way, and reading still works fully offline. All access
 * to speech is funnelled through this module because `speechSynthesis` is a global with
 * its own state — spreading calls across components makes "is something still talking?"
 * impossible to reason about.
 */
export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Turns "20 ÷ 2 = 10" into "עשרים חלקי שתיים שווה עשר" — operators *and* numbers as Hebrew
 * words, not just the operators.
 *
 * This used to be this module's own job (symbol swap only, digits left as digits — the
 * actual reading of "20" as a Hebrew word was left entirely to whatever TTS engine got the
 * text). It now delegates to `hebrewMathSpeech.ts`'s `normalizeMathSpeech`, written for
 * this feature (docs/features/hebrew-math-tts/) specifically so every number is spelled out
 * in the correct Hebrew grammatical form and so the exact same normalized text can be sent
 * to either the device engine or a cloud TTS call. Kept here, under the same name, so every
 * existing caller (`speechParts`, `explanationToSpeechParts` below) needed no changes.
 */
export function mathToWords(expression: string): string {
  return normalizeMathSpeech(expression);
}

/**
 * A period that ends a sentence: one followed by whitespace or the end of the string.
 *
 * The lookahead is what protects decimals, and it is the whole guard — in "2.5" the
 * period is followed by a digit, so it never matches. Grade 6 covers decimals, and a
 * naive split on "." would have turned that into "two" … pause … "five". An extra rule
 * about digits *before* the period would be worse than useless: it would refuse to split
 * a real sentence that happens to end in a number.
 */
const SENTENCE_END = /\.(?=\s|$)/;

/**
 * The explanation as the separate units it should be spoken in: one per step, one for the
 * analogy, and a further split at sentence ends.
 *
 * Each step is its own thought, and running them together as one utterance means the
 * second arrives while a seven-year-old is still digesting the first. The boundaries here
 * are where the pauses go.
 */
/**
 * Hebrew sentences carrying backtick-marked arithmetic, as the units they should be
 * spoken in.
 *
 * The question, the hints and the diagnosis all need exactly this, and they all mark
 * their arithmetic the same way. Three copies of the conversion would be three places to
 * drift apart, which is why it lives here — this is a fact about speech, not about any
 * one screen.
 */
export function speechParts(texts: string[]): string[] {
  return texts
    .map((text) => text.replace(/`([^`]+)`/g, (_, expr: string) => mathToWords(expr)))
    .flatMap((text) => text.split(SENTENCE_END))
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function explanationToSpeechParts(explanation: Explanation): string[] {
  const blocks = [
    ...explanation.steps.map((step) =>
      [step.label, step.math ? mathToWords(step.math) : ""].filter(Boolean).join(" "),
    ),
    explanation.analogy,
  ];

  return blocks
    .flatMap((block) => (block ?? "").split(SENTENCE_END))
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

const QUALITY_HINTS = [/enhanced/i, /premium/i, /natural/i, /google/i, /neural/i];

/**
 * Prefers a voice the platform marks as higher quality (name or voiceURI carries a hint
 * like "Enhanced" or "Google") over the generic default. The Web Speech API exposes no
 * real quality score, so this is a best-effort heuristic - if nothing matches, it falls
 * back to the first Hebrew voice, exactly like before this preference existed.
 */
function hebrewVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter((voice) => voice.lang.startsWith("he"));
  const preferred = voices.find((voice) =>
    QUALITY_HINTS.some((hint) => hint.test(voice.name) || hint.test(voice.voiceURI)),
  );
  return preferred ?? voices[0];
}

/**
 * Voices load asynchronously in some browsers, so the first call can find an empty list.
 * Warming it early means the first press is more likely to get a Hebrew voice.
 */
export function primeVoices(): void {
  if (!speechSupported()) return;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener?.("voiceschanged", () => {
    window.speechSynthesis.getVoices();
  });
}

/** A breath between two steps. */
const STEP_PAUSE_MS = 450;
/** Longer, before the analogy — it is a different kind of statement, not one more step.
 *  The same reason the analogy already sits below a horizontal rule on screen. */
const ANALOGY_PAUSE_MS = 800;

/**
 * Two guards, and both are needed.
 *
 * `cancel()` knows nothing about a setTimeout we scheduled, so a pending timer would fire
 * after the user left and read a step of the previous question's explanation over the new
 * one. Hence the timer handle.
 *
 * And `cancel()` makes some browsers fire `onend`/`onerror` on the utterance it cut off.
 * A callback that resumed the chain blindly would turn a stop into an advance. Hence the
 * sequence id: every callback checks it still owns the current run before continuing.
 */
let sequenceId = 0;
let pendingTimer: ReturnType<typeof setTimeout> | undefined;
/** The in-flight Google Cloud Text-to-Speech playback, if any part is currently being
 *  spoken through a cloud voice rather than the device one. Needs the same stop-tracking
 *  as `pendingTimer` above, for the same reason: `speechSynthesis.cancel()` knows nothing
 *  about it. */
let currentAudio: HTMLAudioElement | undefined;

export function stopSpeaking(): void {
  if (!speechSupported()) return;
  sequenceId++;
  clearTimeout(pendingTimer);
  pendingTimer = undefined;
  if (currentAudio) {
    currentAudio.pause();
    URL.revokeObjectURL(currentAudio.src);
    currentAudio = undefined;
  }
  window.speechSynthesis.cancel();
}

function utteranceFor(text: string): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "he-IL";
  const voice = hebrewVoice();
  // With no Hebrew voice installed, let the browser pick — a reading in an imperfect
  // voice still beats silence.
  if (voice) utterance.voice = voice;
  // Slower and slightly higher-pitched than the flat default, so the voice reads as warm
  // and unhurried rather than mechanical - still fast enough to stay comprehensible.
  utterance.rate = 0.82;
  utterance.pitch = 1.05;
  return utterance;
}

/**
 * Speaks one part through the device's own voice — the fallback path, and also the only
 * path before this feature existed. Extracted on its own so `speak()` below can reach it
 * from two places: the normal cloud-unavailable case, and the cloud-call-failed case after
 * already starting to wait on it.
 */
function speakWithDeviceVoice(text: string, onDone: () => void): void {
  const utterance = utteranceFor(text);
  utterance.onend = onDone;
  utterance.onerror = onDone;
  window.speechSynthesis.speak(utterance);
}

/**
 * Speaks the parts in order, with a deliberate pause at each boundary.
 *
 * Each part first tries Google Cloud Text-to-Speech (`cloudSpeech.ts` — cached, and with
 * its own short timeout) for a more natural voice; `fetchCloudAudio` returns `null` for
 * every failure mode (not configured, offline, slow, broken), and that `null` is simply the
 * signal to fall back to the device voice for that exact part instead — never a dead,
 * silent failure, per CLAUDE.md's rule on this.
 *
 * The device voice has no SSML and no <break>, and the gap an engine happens to leave
 * between queued utterances is neither controllable nor guaranteed — so whichever voice
 * spoke a part, the next part is only requested after a deliberate pause scheduled here,
 * never left to whatever gap the engine or the network happened to leave on its own.
 *
 * `onDone` fires exactly once, after the last part — never between parts. That is what
 * keeps the button showing "stop" for the whole reading, pauses included; if it flickered
 * back mid-explanation it would tell a child the reading had finished and invite her to
 * cut it off herself.
 */
export function speak(parts: string[], onDone?: () => void): void {
  if (!speechSupported()) return;

  // Always stop first: a double tap would otherwise queue a second reading behind the
  // first instead of restarting it. This also bumps the sequence id, retiring any
  // callback still in flight from a previous run.
  stopSpeaking();

  const queue = parts.filter(Boolean);
  if (queue.length === 0) {
    onDone?.();
    return;
  }

  const runId = sequenceId;

  const speakFrom = (i: number) => {
    if (runId !== sequenceId) return;

    const text = queue[i];
    const advance = () => {
      if (runId !== sequenceId) return;
      if (i === queue.length - 1) {
        onDone?.();
        return;
      }
      // The last gap is the one before the analogy, which is always the final part.
      const gap = i === queue.length - 2 ? ANALOGY_PAUSE_MS : STEP_PAUSE_MS;
      pendingTimer = setTimeout(() => speakFrom(i + 1), gap);
    };

    // No cloud voice to even try (see `cloudSpeechConfigured`'s docstring for why this
    // stays fully synchronous rather than going through the async branch below and
    // immediately resolving to `null` anyway) — true for every environment today.
    if (!cloudSpeechConfigured()) {
      speakWithDeviceVoice(text, advance);
      return;
    }

    void fetchCloudAudio(text).then((blob) => {
      // A stop (or a restart from a double tap) happened while this part's audio was
      // still being fetched/read from cache — do not speak a part nobody asked for any
      // more, exactly like the existing onend/onerror guards below.
      if (runId !== sequenceId) return;

      if (!blob) {
        speakWithDeviceVoice(text, advance);
        return;
      }

      const audio = new Audio(URL.createObjectURL(blob));
      currentAudio = audio;
      // A failed `play()` call and the audio element's own `error` event can both fire
      // for the same underlying failure — this guard is what keeps that from falling back
      // to the device voice twice (which would advance the queue twice for one part).
      let settled = false;
      const cleanup = () => {
        URL.revokeObjectURL(audio.src);
        if (currentAudio === audio) currentAudio = undefined;
      };
      audio.onended = () => {
        if (settled) return;
        settled = true;
        cleanup();
        advance();
      };
      // A blob that fetched fine but fails to actually play (corrupt audio, a codec the
      // device lacks) falls back to the device voice for this one part rather than just
      // giving up on it.
      const fallBackToDevice = () => {
        if (settled) return;
        settled = true;
        cleanup();
        speakWithDeviceVoice(text, advance);
      };
      audio.onerror = fallBackToDevice;
      void audio.play().catch(fallBackToDevice);
    });
  };

  speakFrom(0);
}
