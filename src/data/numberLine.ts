import type { Question } from "./curriculum";

/**
 * Where the numbers of the question sit on a line, read off the question itself.
 *
 * Mika is seven and still learning to read. For her the picture is not an illustration
 * of the explanation — it is the explanation, and "after" becomes a place rather than a
 * word. That is why this topic goes first of the seven.
 *
 * Derived rather than stored, and shown only when the arithmetic reproduces
 * `question.answer` — the rule the fraction circle established. The temptation on a
 * number line is to mark `13` because `13` is the recorded answer; a picture built that
 * way agrees with itself always and is therefore never checked.
 *
 * Type-only import of `Question`: erased at compile time, so it cannot form a runtime
 * cycle. Nothing under src/data imports this module — the practice screen is the only
 * caller, the same guard `diagnose.ts` and `fractionDiagram.ts` use.
 */
export interface NumberLine {
  /** Every tick to draw, ascending. At least five. */
  ticks: number[];
  /** Marked ● — one number, or the two ends of a "between" question. */
  from: number[];
  /** Marked ★ — the answer. */
  to: number;
  /** One line that captions the picture, names it for a screen reader, and is spoken. */
  caption: string;
}

const LOWEST = 0;
const HIGHEST = 20;
const MIN_TICKS = 5;
/** Above this the ticks stop being readable at 280px on a phone. */
const MAX_TICKS = 11;

/**
 * The window of ticks around the marked numbers.
 *
 * Two either side, clipped to the range the topic teaches, then widened **in both
 * directions** until there are five. One-directional widening breaks on "what comes
 * after 19": clipping at 20 leaves four ticks and there is no room to grow rightwards.
 */
function window(marked: number[]): number[] {
  let lo = Math.max(LOWEST, Math.min(...marked) - 2);
  let hi = Math.min(HIGHEST, Math.max(...marked) + 2);
  while (hi - lo + 1 < MIN_TICKS && (lo > LOWEST || hi < HIGHEST)) {
    if (lo > LOWEST) lo--;
    if (hi - lo + 1 < MIN_TICKS && hi < HIGHEST) hi++;
  }
  if (hi - lo + 1 > MAX_TICKS) hi = lo + MAX_TICKS - 1;
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
}

/** The shape of the question, and what the line should mark for it. */
function marks(prompt: string): { from: number[]; to: number; caption: string } | null {
  const nums = prompt.match(/\d+/g)?.map(Number) ?? [];

  if (/בא אחרי/.test(prompt) && nums.length === 1) {
    const n = nums[0];
    return {
      from: [n],
      to: n + 1,
      caption: `על הציר, אחרי \`${n}\` בא \`${n + 1}\``,
    };
  }

  if (/בא לפני/.test(prompt) && nums.length === 1) {
    const n = nums[0];
    return {
      from: [n],
      to: n - 1,
      caption: `על הציר, לפני \`${n}\` בא \`${n - 1}\``,
    };
  }

  if (/נמצא בין/.test(prompt) && nums.length === 2) {
    const [a, b] = nums;
    // Both ends are marked, and the answer is the one tick between them.
    if (Math.abs(a - b) !== 2) return null;
    return {
      from: [Math.min(a, b), Math.max(a, b)],
      to: Math.min(a, b) + 1,
      caption: `על הציר, בין \`${Math.min(a, b)}\` ל-\`${Math.max(a, b)}\` יושב \`${Math.min(a, b) + 1}\``,
    };
  }

  // The two comparisons. Here ● is the number that was *not* chosen: both candidates sit
  // on the line and the answer is starred, so the child sees which one is further along
  // rather than being told which is bigger.
  if (/גדול יותר/.test(prompt) && nums.length === 2) {
    const [a, b] = nums;
    const bigger = Math.max(a, b);
    const smaller = Math.min(a, b);
    return {
      from: [smaller],
      to: bigger,
      caption: `על הציר, \`${bigger}\` נמצא רחוק יותר מ-\`${smaller}\`, ולכן הוא הגדול`,
    };
  }

  if (/קטן יותר/.test(prompt) && nums.length === 2) {
    const [a, b] = nums;
    const bigger = Math.max(a, b);
    const smaller = Math.min(a, b);
    return {
      from: [bigger],
      to: smaller,
      caption: `על הציר, \`${smaller}\` נמצא לפני \`${bigger}\`, ולכן הוא הקטן`,
    };
  }

  return null;
}

export function numberLine(question: Question): NumberLine | null {
  const found = marks(question.prompt);
  if (!found) return null;

  // The check with teeth: the star is where the shape of the question puts it, and it has
  // to land on the recorded answer. Two independent sources that can disagree.
  if (found.to !== question.answer) return null;
  if (found.to < LOWEST || found.to > HIGHEST) return null;
  if (found.from.some((n) => n < LOWEST || n > HIGHEST)) return null;

  return {
    ticks: window([...found.from, found.to]),
    from: found.from,
    to: found.to,
    caption: found.caption,
  };
}
