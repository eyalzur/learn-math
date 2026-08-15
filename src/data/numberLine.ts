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
  /** Marked ● — the numbers counted through, or the number that was not chosen. */
  from: number[];
  /** Marked ★ — the answer. */
  to: number;
  /**
   * The caption, as lines: what the line *is*, then what this question shows on it.
   *
   * Three consumers want it three ways — rendered as lines, joined into one
   * `aria-label` because the picture is one picture, and spoken as separate parts so a
   * listener gets a pause. `string[]` is what lets all three be right; `speechParts`
   * already takes an array, so the pause comes for free.
   */
  caption: string[];
}

const LOWEST = 0;
const HIGHEST = 20;
const MIN_TICKS = 5;
/** Above this the ticks stop being readable at 280px on a phone. */
const MAX_TICKS = 11;
/** How many numbers a counting question walks through before the answer. */
const RUN = 3;

/**
 * The sentence that says what a number line is, chosen from the ticks that are actually
 * drawn.
 *
 * Two wordings, because the window moves with the question: "מה גדול יותר, 13 או 18"
 * draws `11`–`20` and there is no `0` anywhere on it. A caption that says the line
 * "starts at 0 here on the left" when no `0` is on the screen teaches a seven-year-old
 * that the words need not match the picture, which is the opposite of the lesson.
 */
function ruleLine(ticks: number[]): string {
  return ticks.includes(LOWEST)
    ? "זהו ציר המספרים. הוא מתחיל ב-`0` כאן משמאל, וכל צעד ימינה מוסיף `1`"
    : "זהו ציר המספרים. הוא מתחיל ב-`0` שנמצא עוד שמאלה, מחוץ לתמונה, וכל צעד ימינה מוסיף `1`";
}

/**
 * The numbers a counting question walks through, ending on the number in the question.
 *
 * Runs away from the answer — "after 12" counts up to 12, "before 14" counts down to 14 —
 * and **shortens rather than overflowing**. "איזה מספר בא לפני 20" appears twice in the
 * data and would count `22`, `21`, `20`; those two numbers are outside everything Mika
 * has been taught, so there the run collapses to the single `20`. Less than we wanted
 * beats showing her a number she does not know for the sake of a tidy pattern.
 */
function countingRun(n: number, step: number): number[] {
  const run: number[] = [];
  for (let i = RUN - 1; i >= 0; i--) {
    const value = n + step * i;
    if (value >= LOWEST && value <= HIGHEST) run.push(value);
  }
  return run;
}

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

/**
 * A run reads as a list — "`16`, `15`, `14`, ואחריהם בא" — in the order it is counted.
 *
 * The pronoun agrees with the run's length, because a run can collapse to one number:
 * "איזה מספר בא לפני 20" would count off the end of the line, so it marks `20` alone,
 * and "ואחריהם" over a single number is simply wrong Hebrew in front of a child who is
 * learning to read it.
 */
const listed = (run: number[]) =>
  `${run.map((n) => `\`${n}\``).join(", ")}, ${run.length > 1 ? "ואחריהם" : "ואחריו"} בא`;

/**
 * The shape of the question, what the line marks for it, and the one sentence that
 * describes *this* question.
 *
 * Deliberately **not** the whole caption. The rule line depends on which ticks end up
 * drawn, and the ticks are not known until the marks are. Returning a finished caption
 * here would mean guessing at whether `0` is on screen — which is exactly the mistake
 * the review caught.
 */
function marks(prompt: string): { from: number[]; to: number; sentence: string } | null {
  const nums = prompt.match(/\d+/g)?.map(Number) ?? [];

  // The three counting forms show a run into the answer rather than pointing at it. A
  // child stuck on "what comes before 14" does not need to be told 13 is there; she
  // needs to see that you count.
  if (/בא אחרי/.test(prompt) && nums.length === 1) {
    const n = nums[0];
    const run = countingRun(n, -1);
    return {
      from: run,
      to: n + 1,
      sentence: `סופרים קדימה — ${listed(run)} \`${n + 1}\``,
    };
  }

  if (/בא לפני/.test(prompt) && nums.length === 1) {
    const n = nums[0];
    const run = countingRun(n, 1);
    return {
      from: run,
      to: n - 1,
      sentence: `סופרים אחורה — ${listed(run)} \`${n - 1}\``,
    };
  }

  if (/נמצא בין/.test(prompt) && nums.length === 2) {
    const lo = Math.min(...nums);
    const hi = Math.max(...nums);
    if (hi - lo !== 2) return null;
    const run = countingRun(lo, -1);
    // The far end stays marked alongside the run: the question is about a place between
    // two bounds, and a picture that only counts upwards loses the upper one.
    return {
      from: [...run, hi],
      to: lo + 1,
      sentence: `סופרים קדימה — ${listed(run)} \`${lo + 1}\` — והוא עדיין לפני \`${hi}\``,
    };
  }

  // The two comparisons. Here ● is the number that was *not* chosen: both candidates sit
  // on the line and the answer is starred, so the child sees which one is further along
  // rather than being told which is bigger. No run — these are not counting questions,
  // and the two candidates are exactly what wants marking.
  //
  // "ימינה" and "שמאלה" rather than "רחוק יותר": a direction is something she can check
  // against the picture, and "far" needs a starting point nobody gave her.
  if (/גדול יותר/.test(prompt) && nums.length === 2) {
    const bigger = Math.max(...nums);
    const smaller = Math.min(...nums);
    return {
      from: [smaller],
      to: bigger,
      sentence: `\`${bigger}\` נמצא ימינה מ-\`${smaller}\`, ולכן הוא הגדול`,
    };
  }

  if (/קטן יותר/.test(prompt) && nums.length === 2) {
    const bigger = Math.max(...nums);
    const smaller = Math.min(...nums);
    return {
      from: [bigger],
      to: smaller,
      sentence: `\`${smaller}\` נמצא שמאלה מ-\`${bigger}\`, ולכן הוא הקטן`,
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
  if (found.from.length === 0) return null;
  if (found.from.some((n) => n < LOWEST || n > HIGHEST)) return null;

  // Ticks first, then the rule line read off them. The order matters: the wording turns
  // on whether `0` is genuinely drawn, and that is knowable only once the window is.
  const ticks = window([...found.from, found.to]);

  return {
    ticks,
    from: found.from,
    to: found.to,
    caption: [ruleLine(ticks), found.sentence],
  };
}
