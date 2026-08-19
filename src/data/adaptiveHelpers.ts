/**
 * Small helpers shared by every runtime-template generator under `src/data/adaptive*.ts`
 * (see `docs/features/levels-as-practice/architecture.md`). Kept out of `adaptiveAdd100.ts`
 * on purpose — that file is the original pilot and stays untouched except for its question
 * count, per the architecture's Affected Files table.
 */

import type { Question } from "./curriculum";

export type Rng = () => number;

export function randInt(min: number, max: number, rng: Rng): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

/** A fresh id per instance — never reused as a lookup key, only for React keys/aria. */
export function makeFreshId(prefix: string): (rng: Rng) => string {
  return (rng: Rng) => `${prefix}-${Math.floor(rng() * 1e9)}`;
}

/** Unicode superscript digits for exponents 2–6, matching the glyphs already used in
 *  the hand-written `חזקות ושורשים` questions (e.g. `2³`, `2⁴`). */
const SUPERSCRIPTS: Record<number, string> = { 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶" };

export function sup(n: number): string {
  const s = SUPERSCRIPTS[n];
  if (!s) throw new Error(`No superscript glyph for exponent ${n}`);
  return s;
}

function numbersIn(text: string): number[] {
  return (text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
}

/** Same check `content.spec.ts`'s "keeps its hints to exactly two, without giving the
 *  answer away" rule makes: a hint that states the answer's own number, when that number
 *  isn't already sitting in the prompt, hands the question away. A structural number a
 *  pattern's hint states for other reasons (a denominator, a part count, an exponent) can
 *  coincidentally land on the same value as this particular draw's answer — rare, but not
 *  impossible, and the rule can't tell "coincidence" from "leak" apart. */
function hintsLeakAnswer(prompt: string, answer: number, hints: readonly [string, string]): boolean {
  if (numbersIn(prompt).includes(answer)) return false;
  return hints.some((h) => numbersIn(h).includes(answer));
}

/** Wraps a pattern's question-builder so a hint that coincidentally states the answer's
 *  own number never ships — regenerates with fresh random draws instead, the same "check
 *  with teeth, retry rather than lie" approach `adaptiveAdd100.ts`'s own duplicate-avoidance
 *  note already describes for this codebase. Bounded, and falls back to the last draw
 *  rather than looping forever — a pattern whose structural numbers are *always* the
 *  answer (not just coincidentally) needs a wording fix, not more retries, and this cannot
 *  tell the difference either. */
export function withoutLeakingHints(build: () => Question): Question {
  let question = build();
  for (let i = 0; i < 20 && hintsLeakAnswer(question.prompt, question.answer, question.hints); i++) {
    question = build();
  }
  return question;
}
