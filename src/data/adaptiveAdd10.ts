import type { Question } from "./curriculum";

/**
 * "חיבור עד 10", built at runtime instead of written 30 questions deep — same idea as
 * `adaptiveAdd100.ts`, but for the much smaller range this topic actually covers.
 *
 * Three patterns, not five: the written content (30 questions, three levels) only ever
 * groups by the *sum*, not by a mechanic like carrying — `1`–`10` is too small a range to
 * support five meaningfully different tiers without duplicating a group. Read straight off
 * `grade1.ts`'s three levels (see docs/features/mika-adaptive-difficulty/design.md).
 *
 * No `steps` here, matching the written questions this replaces: bare single-digit
 * addition already gets a correct, hint-consistent explanation from `explain.ts`'s
 * generic computation, so writing `steps` would only duplicate it.
 */

type Rng = () => number;

function randInt(min: number, max: number, rng: Rng): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

function freshId(rng: Rng): string {
  return `g1-add10-adaptive-${Math.floor(rng() * 1e9)}`;
}

const ANALOGIES = [
  (a: number, b: number) => `היו לך ${a} סוכריות וקיבלת עוד ${b}`,
  (a: number, b: number) => `${a} בלונים בקופסה, שמים עוד ${b}`,
  (a: number, b: number) => `על השולחן ${a} עוגיות, מוסיפים עוד ${b}`,
  (a: number, b: number) => `${a} מדבקות ביד אחת ועוד ${b} בשנייה`,
  (a: number, b: number) => `אספת ${a} קוביות ואחר כך עוד ${b}`,
];

function makeQuestion(prompt: string, answer: number, hints: [string, string], analogy: string, rng: Rng): Question {
  return {
    id: freshId(rng),
    topic: "חיבור עד 10",
    style: "add10",
    prompt,
    answer,
    hints,
    analogy,
  };
}

function countHint(a: number, b: number): string {
  const max = Math.max(a, b);
  const min = Math.min(a, b);
  return `תתחילי מ-\`${max}\` ותספרי \`${min}\` צעדים קדימה`;
}

/** Tier 1 — sum 2–5, matching the written "easy" level's own small operands. */
function lowSum(rng: Rng): Question {
  const sum = randInt(2, 5, rng);
  const a = randInt(0, sum, rng);
  const b = sum - a;
  return makeQuestion(
    `${a} + ${b}`,
    sum,
    ["לחבר זה להוסיף: מתחילים ממספר אחד וסופרים קדימה", countHint(a, b)],
    pick(ANALOGIES, rng)(a, b),
    rng,
  );
}

/** Tier 2 — sum 6–8, both operands at least 1, matching the written "medium" level. */
function midSum(rng: Rng): Question {
  const sum = randInt(6, 8, rng);
  const a = randInt(1, sum - 1, rng);
  const b = sum - a;
  return makeQuestion(
    `${a} + ${b}`,
    sum,
    ["כדי לספור פחות, מתחילים מהמספר הגדול וסופרים קדימה את הקטן", countHint(a, b)],
    pick(ANALOGIES, rng)(a, b),
    rng,
  );
}

/** Tier 3 — sum 9–10, both operands at least 1. A sum of exactly 10 gets the "round
 *  number" hint the written "hard" level already uses for its 5+5/4+6/7+3 questions. */
function highSum(rng: Rng): Question {
  const sum = randInt(9, 10, rng);
  const a = randInt(1, sum - 1, rng);
  const b = sum - a;
  const hint2 = sum === 10 ? `\`${a}\` ועוד \`${b}\` מגיע בדיוק למספר עגול` : countHint(a, b);
  return makeQuestion(
    `${a} + ${b}`,
    sum,
    ["שווה לזכור זוגות שחוזרים הרבה, במיוחד כאלה שמשלימים למספר עגול", hint2],
    pick(ANALOGIES, rng)(a, b),
    rng,
  );
}

export function generateAdd10Question(difficulty: number, rng: Rng = Math.random): Question {
  switch (Math.min(3, Math.max(1, Math.round(difficulty)))) {
    case 1:
      return lowSum(rng);
    case 2:
      return midSum(rng);
    default:
      return highSum(rng);
  }
}

export const ADD10_MIN_DIFFICULTY = 1;
export const ADD10_MAX_DIFFICULTY = 3;
export const ADD10_INITIAL_DIFFICULTY = 1;
export const ADD10_QUESTION_COUNT = 20;

export function nextAdd10Difficulty(current: number, wasCorrect: boolean, streak: number): number {
  if (!wasCorrect) return Math.max(ADD10_MIN_DIFFICULTY, current - 1);
  return streak >= 2 ? Math.min(ADD10_MAX_DIFFICULTY, current + 1) : current;
}
