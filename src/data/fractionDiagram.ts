import type { Question } from "./curriculum";

/**
 * The numbers behind a fraction circle, read off the question itself.
 *
 * Deliberately derived rather than stored on the question. A hand-written `visual` field
 * would be explicit and compiler-visible — and it could disagree with the prompt sitting
 * next to it, which is exactly the bug this feature exists to avoid drawing. One analogy
 * in this app already claimed a full box held less than eight marbles.
 *
 * Type-only import of `Question`: erased at compile time, so it cannot form a runtime
 * cycle. Nothing under src/data imports this module — the only caller is the practice
 * screen, the same guard `diagnose.ts` uses.
 */
export interface FractionDiagram {
  /** How many parts are taken. */
  numerator: number;
  /** How many equal parts the whole is cut into. */
  denominator: number;
  whole: number;
  /** What one part is worth. */
  perPart: number;
  /** One line that captions the picture, names it for a screen reader, and is spoken. */
  caption: string;
}

/**
 * Hebrew fraction phrases, longest first.
 *
 * The order is load-bearing: "שליש" is a substring of "שני שלישים", so a shortest-first
 * scan would read "two thirds of 30" as "a third of 30" and quietly draw the wrong
 * picture. (It would not actually reach the screen — the check against the recorded
 * answer would reject it — but it would cost the diagram for no reason.)
 */
const PHRASES: [string, number, number][] = [
  ["ארבע שביעיות", 4, 7],
  ["ארבע חמישיות", 4, 5],
  ["שלוש שמיניות", 3, 8],
  ["שלוש חמישיות", 3, 5],
  ["שלושה רבעים", 3, 4],
  ["שתי חמישיות", 2, 5],
  ["שני שלישים", 2, 3],
  ["חמש שישיות", 5, 6],
  ["חמישית", 1, 5],
  ["שמינית", 1, 8],
  ["שביעית", 1, 7],
  ["שישית", 1, 6],
  ["שליש", 1, 3],
  ["רבע", 1, 4],
  ["חצי", 1, 2],
];

/**
 * The diagram for a question, or null when no honest picture can be drawn.
 *
 * Null is the ordinary outcome — it covers every question that is not a fraction of a
 * number, every whole that does not divide evenly, and any phrase this table does not
 * know. The screen simply shows what it showed before.
 */
export function fractionDiagram(question: Question): FractionDiagram | null {
  const match = question.prompt.match(/^כמה זה (.+) מ-(\d+)\?$/);
  if (!match) return null;

  const [, phrase, wholeText] = match;
  const found = PHRASES.find(([word]) => word === phrase.trim());
  if (!found) return null;

  const [, numerator, denominator] = found;
  const whole = Number(wholeText);
  const perPart = whole / denominator;

  // The check that makes a wrong diagram impossible rather than unlikely.
  //
  // Everything above is text handling, and text handling is where a picture would start
  // lying. Here the numbers have to reproduce the answer the question already carries; if
  // they do not, the reading was wrong and nothing is drawn. The worst outcome available
  // is a missing diagram, never a false one.
  if (!Number.isInteger(perPart) || perPart * numerator !== question.answer) return null;

  const caption =
    numerator === 1
      ? `\`${whole}\` מחולק ל-\`${denominator}\` חלקים שווים, ולוקחים חלק אחד`
      : `\`${whole}\` מחולק ל-\`${denominator}\` חלקים שווים, ומתוכם לוקחים \`${numerator}\``;

  return { numerator, denominator, whole, perPart, caption };
}
