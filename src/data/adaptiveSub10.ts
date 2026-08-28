import type { Question } from "./curriculum";

/**
 * "חיסור עד 10", built at runtime instead of written 30 questions deep — the subtraction
 * mirror of `adaptiveAdd10.ts`. Three patterns grouped by minuend, matching the written
 * content's own three levels (see docs/features/mika-adaptive-difficulty/design.md).
 *
 * No `steps` here, matching the written questions this replaces: `explain.ts`'s generic
 * computation for bare subtraction already agrees with these hints.
 */

type Rng = () => number;

function randInt(min: number, max: number, rng: Rng): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

function freshId(rng: Rng): string {
  return `g1-sub10-adaptive-${Math.floor(rng() * 1e9)}`;
}

const ANALOGIES = [
  (a: number, b: number) => `היו ${a} מדבקות, לקחו ${b}`,
  (a: number, b: number) => `${a} בוטנים בצלחת, אכלתם ${b}`,
  (a: number, b: number) => `מתוך ${a} גולות נפלו ${b}`,
  (a: number, b: number) => `היו לך ${a} ענבים ונתת ${b} לחבר`,
  (a: number, b: number) => `${a} עפרונות בשקית, הוצאת ${b}`,
];

function makeQuestion(prompt: string, answer: number, hints: [string, string], analogy: string, rng: Rng): Question {
  return {
    id: freshId(rng),
    topic: "חיסור עד 10",
    style: "sub10",
    prompt,
    answer,
    hints,
    analogy,
  };
}

function countBackHint(a: number, b: number): string {
  return `תתחילי מ-\`${a}\` ותספרי \`${b}\` צעדים אחורה`;
}

/** Tier 1 — minuend 2–5, matching the written "easy" level. */
function lowMinuend(rng: Rng): Question {
  const a = randInt(2, 5, rng);
  const b = randInt(0, a, rng);
  return makeQuestion(
    `${a} − ${b}`,
    a - b,
    ["לחסר זה לקחת: סופרים אחורה מהמספר הגדול", countBackHint(a, b)],
    pick(ANALOGIES, rng)(a, b),
    rng,
  );
}

/** Tier 2 — minuend 6–8, matching the written "medium" level. */
function midMinuend(rng: Rng): Question {
  const a = randInt(6, 8, rng);
  const b = randInt(1, a - 1, rng);
  return makeQuestion(
    `${a} − ${b}`,
    a - b,
    ["אפשר לספור אחורה, ואפשר לשאול מה להוסיף לקטן כדי להגיע לגדול", countBackHint(a, b)],
    pick(ANALOGIES, rng)(a, b),
    rng,
  );
}

/** Tier 3 — minuend 9–10, matching the written "hard" level. A minuend of exactly 10 gets
 *  the "completes the ten" hint the written questions already use for 10−4/10−7/etc. */
function highMinuend(rng: Rng): Question {
  const a = randInt(9, 10, rng);
  const b = randInt(3, a - 2, rng);
  const hint2 =
    a === 10
      ? `מ-\`10\` יורדים \`${b}\` — איזה זוג משלים את ה-\`10\`?`
      : countBackHint(a, b);
  return makeQuestion(
    `${a} − ${b}`,
    a - b,
    ["כשמתחילים מ-`10`, שווה לזכור אילו זוגות משלימים אותו", hint2],
    pick(ANALOGIES, rng)(a, b),
    rng,
  );
}

export function generateSub10Question(difficulty: number, rng: Rng = Math.random): Question {
  switch (Math.min(3, Math.max(1, Math.round(difficulty)))) {
    case 1:
      return lowMinuend(rng);
    case 2:
      return midMinuend(rng);
    default:
      return highMinuend(rng);
  }
}

export const SUB10_MIN_DIFFICULTY = 1;
export const SUB10_MAX_DIFFICULTY = 3;
export const SUB10_INITIAL_DIFFICULTY = 1;
export const SUB10_QUESTION_COUNT = 20;

export function nextSub10Difficulty(current: number, wasCorrect: boolean, streak: number): number {
  if (!wasCorrect) return Math.max(SUB10_MIN_DIFFICULTY, current - 1);
  return streak >= 2 ? Math.min(SUB10_MAX_DIFFICULTY, current + 1) : current;
}
