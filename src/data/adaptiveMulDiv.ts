import type { Question } from "./curriculum";

/**
 * "כפל וחילוק", built at runtime instead of only the 30 written questions in `grade2.ts`
 * — the same relationship `adaptiveAdd100.ts` has to `add100`'s own written questions.
 * Three difficulty tiers, one per written bucket (easy/medium/hard): small factors,
 * larger factors, and a mix of larger-factor multiplication with basic exact division —
 * read straight off the wording those 30 questions already shipped and passed content
 * review with, not invented here.
 */

type Rng = () => number;

function randInt(min: number, max: number, rng: Rng): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

function freshId(rng: Rng): string {
  return `g2-muldiv-adaptive-${Math.floor(rng() * 1e9)}`;
}

const SMALL_FACTOR_ANALOGIES = [
  (a: number, b: number) => `יש ${a} קופסאות, ובכל קופסה ${b} עוגיות`,
  (a: number, b: number) => `יש ${a} שורות כיסאות, ובכל שורה ${b} כיסאות`,
  (a: number, b: number) => `יש ${a} שקיות, ובכל שקית ${b} קלפים`,
  (a: number, b: number) => `יש ${a} מדפים בספרייה, ובכל מדף ${b} ספרים`,
  (a: number, b: number) => `יש ${a} עציצים, ובכל עציץ ${b} פרחים`,
  (a: number, b: number) => `יש ${a} ילדים, ולכל ילד ${b} מדבקות`,
];

const LARGER_FACTOR_ANALOGIES = [
  (a: number, b: number) => `יש ${a} ארגזים, ובכל ארגז ${b} תפוזים`,
  (a: number, b: number) => `יש ${a} קבוצות טיולים, ובכל קבוצה ${b} מדריכים`,
  (a: number, b: number) => `יש ${a} שולחנות, ועל כל שולחן ${b} צלחות`,
  (a: number, b: number) => `יש ${a} חבילות, ובכל חבילה ${b} מחברות`,
  (a: number, b: number) => `יש ${a} שכנים, ולכל אחד ${b} חתולים`,
  (a: number, b: number) => `יש ${a} כיתות, ובכל כיתה ${b} בנות`,
];

const HARD_MULT_ANALOGIES = [
  (a: number, b: number) => `יש ${a} ארגזים, ובכל ארגז ${b} בקבוקי מים`,
  (a: number, b: number) => `יש ${a} שולחנות בכיתה, ו-${b} ילדים יושבים ליד כל שולחן`,
  (a: number, b: number) => `יש ${a} קופסאות, ו-${b} כדורים בכל קופסה`,
  (a: number, b: number) => `יש ${a} מדפים בספרייה, ו-${b} ספרים בכל מדף`,
];

const DIVISION_ANALOGIES = [
  (n: number, k: number) => `יש לך ${n} מדבקות, וחילקת אותן שווה בשווה בין ${k} חברות`,
  (n: number, k: number) => `יש ${n} עוגיות, וחילקו אותן שווה בשווה ל-${k} ילדים`,
  (n: number, k: number) => `יש ${n} בלונים, וחילקו אותם שווה בשווה בין ${k} מסיבות`,
  (n: number, k: number) => `יש ${n} שקלים, וחילקו אותם שווה בשווה בין ${k} ילדים`,
  (n: number, k: number) => `יש ${n} עפרונות, וחילקו אותם שווה בשווה ל-${k} קלמרים`,
];

function makeQuestion(prompt: string, answer: number, hints: [string, string], steps: { label: string; math?: string }[], analogy: string, rng: Rng): Question {
  return {
    id: freshId(rng),
    topic: "כפל וחילוק",
    style: "muldiv",
    prompt,
    answer,
    hints,
    steps,
    analogy,
  };
}

function repeatedAddition(a: number, b: number): string {
  return Array.from({ length: a }, () => b).join(" + ");
}

/** Tier 1 — small factors (2 to 5), the exact shape of the written `e1..e10`. */
function smallFactors(rng: Rng): Question {
  const a = randInt(2, 5, rng);
  const b = randInt(2, 5, rng);
  const answer = a * b;
  const repeated = repeatedAddition(a, b);
  return makeQuestion(
    `${a} × ${b}`,
    answer,
    ["אפשר לחשוב על כפל כחיבור של אותו מספר כמה פעמים", `יש \`${a}\` קבוצות של \`${b}\` — זה כמו \`${repeated}\``],
    [
      { label: "אפשר לחשוב על זה כחיבור חוזר:", math: `${a} × ${b} = ${repeated}` },
      { label: "וזה יוצא:", math: `${repeated} = ${answer}` },
    ],
    pick(SMALL_FACTOR_ANALOGIES, rng)(a, b),
    rng,
  );
}

/** Tier 2 — larger factors (up to 9), the shape of the written `m1..m10`. */
function largerFactors(rng: Rng): Question {
  const a = randInt(4, 9, rng);
  const b = randInt(2, 9, rng);
  const answer = a * b;
  const repeated = repeatedAddition(a, b);
  return makeQuestion(
    `${a} × ${b}`,
    answer,
    ["גם עם מספרים גדולים יותר, כפל הוא עדיין חיבור חוזר", `יש \`${a}\` קבוצות של \`${b}\` — זה כמו לחבר \`${b}\` \`${a}\` פעמים`],
    [
      { label: "אפשר לחשוב על זה כחיבור חוזר:", math: `${a} × ${b} = ${repeated}` },
      { label: "וזה יוצא:", math: `${repeated} = ${answer}` },
    ],
    pick(LARGER_FACTOR_ANALOGIES, rng)(a, b),
    rng,
  );
}

/** Tier 3 (hardest) — a mix of harder multiplication and basic exact division (no
 *  remainder), the shape of the written `h1..h10`. */
function hardMixed(rng: Rng): Question {
  if (rng() < 0.5) {
    const a = randInt(5, 9, rng);
    const b = randInt(2, 4, rng);
    const answer = a * b;
    const repeated = repeatedAddition(a, b);
    return makeQuestion(
      `${a} × ${b}`,
      answer,
      ["גם מספר גדול יותר של קבוצות הוא עדיין חיבור חוזר", `יש \`${a}\` קבוצות של \`${b}\` — זה כמו לחבר \`${b}\` \`${a}\` פעמים`],
      [
        { label: "אפשר לחשוב על זה כחיבור חוזר:", math: `${a} × ${b} = ${repeated}` },
        { label: "וזה יוצא:", math: `${repeated} = ${answer}` },
      ],
      pick(HARD_MULT_ANALOGIES, rng)(a, b),
      rng,
    );
  }
  const k = randInt(2, 6, rng);
  const m = randInt(2, 6, rng);
  const n = k * m;
  return makeQuestion(
    `${n} ÷ ${k}`,
    m,
    ["חילוק הוא לפזר כמות שווה בשווה בין כמה קבוצות", `מחלקים \`${n}\` ל-\`${k}\` קבוצות שוות`],
    [
      { label: `מחלקים ל-${k} קבוצות שוות:`, math: `${n} ÷ ${k} = ${m}` },
      { label: "בודקים:", math: `${k} × ${m} = ${n}` },
    ],
    pick(DIVISION_ANALOGIES, rng)(n, k),
    rng,
  );
}

/**
 * Three difficulty tiers, one per written bucket. Unlike `adaptiveAdd100.ts`'s five
 * (which extend a mechanic — carrying — that only becomes possible past a certain size),
 * multiplication/division has exactly three distinct patterns in the reviewed content, so
 * three tiers is the honest count rather than a number chosen to match another topic.
 */
export function generateMulDivQuestion(difficulty: number, rng: Rng = Math.random): Question {
  switch (Math.min(3, Math.max(1, Math.round(difficulty)))) {
    case 1:
      return smallFactors(rng);
    case 2:
      return largerFactors(rng);
    default:
      return hardMixed(rng);
  }
}

export const MULDIV_MIN_DIFFICULTY = 1;
export const MULDIV_MAX_DIFFICULTY = 3;
export const MULDIV_INITIAL_DIFFICULTY = 1;
export const MULDIV_QUESTION_COUNT = 20;

/**
 * Same pace as every other adaptive topic — two in a row before pushing harder, one wrong
 * answer backs off immediately.
 */
export function nextMulDivDifficulty(current: number, wasCorrect: boolean, streak: number): number {
  if (!wasCorrect) return Math.max(MULDIV_MIN_DIFFICULTY, current - 1);
  return streak >= 2 ? Math.min(MULDIV_MAX_DIFFICULTY, current + 1) : current;
}
