import type { Explanation } from "./explain";

/**
 * Reading aloud runs on the browser's built-in speech synthesis: no server, no API key,
 * no cost, and it keeps working offline. All access to it is funnelled through this
 * module because `speechSynthesis` is a global with its own state — spreading calls
 * across components makes "is something still talking?" impossible to reason about.
 */
export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

const SYMBOLS: [RegExp, string][] = [
  [/√/g, " שורש "],
  [/²/g, " בריבוע "],
  [/³/g, " בשלישית "],
  [/\+/g, " ועוד "],
  [/[−-]/g, " פחות "],
  [/×/g, " כפול "],
  [/÷/g, " חלקי "],
  [/=/g, " שווה "],
  [/\bx\b/gi, " איקס "],
];

/**
 * Turns "20 ÷ 2 = 10" into "20 חלקי 2 שווה 10".
 *
 * This is an accessibility requirement rather than a nicety: handed the raw symbols in a
 * Hebrew context, a speech engine either names them in English or skips them, and the
 * central step of the explanation vanishes into thin air.
 */
export function mathToWords(expression: string): string {
  let spoken = expression;
  for (const [pattern, word] of SYMBOLS) spoken = spoken.replace(pattern, word);
  return spoken.replace(/\s+/g, " ").trim();
}

/** The full explanation as one utterance: steps in order, then the analogy. */
export function explanationToSpeech(explanation: Explanation): string {
  const steps = explanation.steps.map((step) =>
    [step.label, step.math ? mathToWords(step.math) : ""].filter(Boolean).join(" "),
  );
  return [...steps, explanation.analogy].filter(Boolean).join(". ");
}

function hebrewVoice(): SpeechSynthesisVoice | undefined {
  return window.speechSynthesis.getVoices().find((voice) => voice.lang.startsWith("he"));
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

export function stopSpeaking(): void {
  if (!speechSupported()) return;
  window.speechSynthesis.cancel();
}

export function speak(text: string, onEnd?: () => void): void {
  if (!speechSupported()) return;

  // Always cancel first: a double tap would otherwise queue a second reading behind the
  // first instead of restarting it.
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "he-IL";
  const voice = hebrewVoice();
  // With no Hebrew voice installed, let the browser pick — a reading in an imperfect
  // voice still beats silence.
  if (voice) utterance.voice = voice;
  utterance.rate = 0.95;
  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }
  window.speechSynthesis.speak(utterance);
}
