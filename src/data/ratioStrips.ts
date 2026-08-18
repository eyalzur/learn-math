import type { Question } from "./curriculum";

/**
 * Two strips at the same unit size, read off the question itself — a ratio's two terms,
 * reduced to their smallest form, and the real quantity each one stands for.
 *
 * Five sentences in the data ask about a ratio in five different ways — a part given
 * directly, a "for every" phrasing, a total split by ratio, a difference split by ratio,
 * a recipe scaled up — and every one of them reduces to the same pair of numbers: two
 * terms and what one unit of them is worth. Built from the prompt and shown only if it
 * reproduces `question.answer`, the same rule as every other shape here.
 *
 * Type-only import of `Question`: erased at compile time, so it cannot form a runtime
 * cycle. The practice screen is the only caller.
 */
export interface RatioStrips {
  /** Block counts, reduced to lowest terms. */
  ratioA: number;
  ratioB: number;
  /** What one block is worth. valueA = ratioA × unit, valueB = ratioB × unit. */
  unit: number;
  valueA: number;
  valueB: number;
  /** Two lines — one strip each, spoken with a pause between them. */
  caption: [string, string];
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Raw ratio terms, the real quantity each one stands for, and which one the question
 *  is actually asking for — before reduction. Positional convention (first term versus
 *  second) does not reliably say which is asked: "X cats for every dog, N dogs, how many
 *  cats" gives the first term as the answer, while most other phrasings give the second.
 *  Each branch below says so explicitly rather than guessing from position. */
function readShape(
  prompt: string,
): { rawA: number; rawB: number; valueA: number; valueB: number; expected: number } | null {
  let m: RegExpMatchArray | null;

  if (
    (m = prompt.match(/^היחס הוא (\d+) ל-(\d+)\. אם החלק הראשון הוא (\d+), כמה השני\?$/)) ||
    (m = prompt.match(/^ביחס (\d+) ל-(\d+), החלק הראשון הוא (\d+)\. כמה השני\?$/))
  ) {
    const [rawA, rawB, valueA] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const valueB = (rawB * valueA) / rawA;
    return { rawA, rawB, valueA, valueB, expected: valueB };
  }

  if ((m = prompt.match(/^בכיתה יש (\d+) בנים לכל בת\. יש (\d+) בנים\. כמה בנות\?$/))) {
    const [rawA, valueA] = [Number(m[1]), Number(m[2])];
    const valueB = valueA / rawA;
    return { rawA, rawB: 1, valueA, valueB, expected: valueB };
  }

  if ((m = prompt.match(/^על כל כלב יש (\d+) חתולים\. יש (\d+) כלבים\. כמה חתולים\?$/))) {
    const [rawA, valueB] = [Number(m[1]), Number(m[2])];
    const valueA = rawA * valueB;
    return { rawA, rawB: 1, valueA, valueB, expected: valueA };
  }

  if ((m = prompt.match(/^היחס הוא (\d+) ל-(\d+) והסך הכל (\d+)\. כמה בחלק (הגדול|הקטן)\?$/))) {
    const [rawA, rawB, total] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const unit = total / (rawA + rawB);
    const valueA = rawA * unit;
    const valueB = rawB * unit;
    const expected = m[4] === "הגדול" ? Math.max(valueA, valueB) : Math.min(valueA, valueB);
    return { rawA, rawB, valueA, valueB, expected };
  }

  if ((m = prompt.match(/^היחס הוא (\d+) ל-(\d+) וההפרש בין החלקים הוא (\d+)\. כמה בחלק הגדול\?$/))) {
    const [rawA, rawB, diff] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const unit = diff / Math.abs(rawB - rawA);
    const valueA = rawA * unit;
    const valueB = rawB * unit;
    return { rawA, rawB, valueA, valueB, expected: Math.max(valueA, valueB) };
  }

  if ((m = prompt.match(/^מתכון ל-(\d+) אנשים דורש (\d+) כוסות \S+\. כמה כוסות ל-(\d+) אנשים\?$/))) {
    const [peopleOrig, cupsOrig, peopleNew] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const valueB = (cupsOrig * peopleNew) / peopleOrig;
    return { rawA: peopleOrig, rawB: cupsOrig, valueA: peopleNew, valueB, expected: valueB };
  }

  return null;
}

export function ratioStrips(question: Question): RatioStrips | null {
  const shape = readShape(question.prompt);
  if (!shape) return null;

  const { rawA, rawB, valueA, valueB, expected } = shape;
  if (rawA <= 0 || rawB <= 0) return null;
  if (!Number.isInteger(valueA) || !Number.isInteger(valueB) || valueA <= 0 || valueB <= 0) return null;

  // The check with teeth: whichever value the prompt asks for has to reproduce the
  // recorded answer. Everything else is built from the prompt, never from the answer.
  if (expected !== question.answer) return null;

  const g = gcd(rawA, rawB);
  const ratioA = rawA / g;
  const ratioB = rawB / g;
  const unit = valueA / ratioA;
  if (!Number.isInteger(unit)) return null;

  return {
    ratioA,
    ratioB,
    unit,
    valueA,
    valueB,
    caption: [
      `הרצועה הראשונה: \`${ratioA}\` חלקים, ביחד \`${valueA}\``,
      `הרצועה השנייה: \`${ratioB}\` חלקים, ביחד \`${valueB}\`, וכל חלק שווה \`${unit}\``,
    ],
  };
}
