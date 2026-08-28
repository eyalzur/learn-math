import type { Question } from "./curriculum";

/**
 * "חיסור עד 100", built at runtime instead of written 30 questions deep — the subtraction
 * mirror of `adaptiveAdd100.ts`. Five patterns, read straight off the 30 written questions
 * in `grade2.ts` the same way `adaptiveAdd100.ts` read off its own topic's.
 *
 * Every `steps` entry is the literal borrow-column arithmetic, matching the written
 * questions' own method exactly — never "round to the nearest ten" — for the same reason
 * `adaptiveAdd100.ts` writes `steps` explicitly instead of leaving it to `explain.ts`.
 */

type Rng = () => number;

function randInt(min: number, max: number, rng: Rng): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

function freshId(rng: Rng): string {
  return `g2-sub100-adaptive-${Math.floor(rng() * 1e9)}`;
}

const SINGLE_DIGIT_ANALOGIES = [
  (a: number, b: number) => `היו לך ${a} מדבקות ונתת ${b} לחברה`,
  (a: number, b: number) => `היו לך ${a} גולות ואיבדת ${b} — כמה יותר?`,
  (a: number, b: number) => `היו לך ${a} בלונים ו-${b} התפוצצו`,
  (a: number, b: number) => `היו לך ${a} קלפי משחק ונתת ${b} לאח שלך`,
  (a: number, b: number) => `היו ${a} פרחים בגינה ו-${b} קטפו`,
  (a: number, b: number) => `ישבו ${a} ציפורים על הגג ו-${b} עפו`,
  (a: number, b: number) => `היו ${a} כפתורים בקופסה ו-${b} נפלו`,
];

const WHOLE_TENS_ANALOGIES = [
  (a: number, b: number) => `היו ${a} תלמידים בחצר ו-${b} נכנסו לכיתה`,
  (a: number, b: number) => `היו ${a} כיסאות באולם ו-${b} הוצאו החוצה`,
];

const TWO_DIGIT_ANALOGIES = [
  (a: number, b: number) => `היו לך ${a} מדבקות ונתת ${b} לאחות`,
  (a: number, b: number) => `היו לך ${a} גולות ואיבדת ${b} — כמה יותר?`,
  (a: number, b: number) => `היו ${a} בלונים ו-${b} התפוצצו`,
  (a: number, b: number) => `היו ${a} ספרים במחסן ו-${b} נשלחו לספרייה`,
  (a: number, b: number) => `ישבו ${a} ציפורים על העץ ו-${b} עפו`,
  (a: number, b: number) => `היו לך ${a} כרטיסי אספן ונתת ${b} לחבר`,
  (a: number, b: number) => `היו ${a} פרחים בגינה ו-${b} נקטפו לזר`,
  (a: number, b: number) => `חסכת ${a} שקלים והוצאת ${b} על צעצוע`,
];

const BORROW_ANALOGIES = [
  (a: number, b: number) => `היו לך ${a} מדבקות ונתת ${b} לחברה`,
  (a: number, b: number) => `היו לך ${a} גולות ואיבדת ${b} — כמה יותר?`,
  (a: number, b: number) => `היו ${a} בלונים ו-${b} התפוצצו`,
  (a: number, b: number) => `היו ${a} ספרים במדף ו-${b} הושאלו`,
  (a: number, b: number) => `ישבו ${a} ציפורים על הגג ו-${b} עפו`,
  (a: number, b: number) => `היו ${a} כפתורים בקופסה ו-${b} נתפרו`,
  (a: number, b: number) => `חסכת ${a} שקלים והוצאת ${b} על מתנה`,
];

function makeQuestion(prompt: string, answer: number, hints: [string, string], steps: { label: string; math?: string }[], analogy: string, rng: Rng): Question {
  return {
    id: freshId(rng),
    topic: "חיסור עד 100",
    style: "sub100",
    prompt,
    answer,
    hints,
    steps,
    analogy,
  };
}

/** Tier 1 — two whole tens. */
function wholeTens(rng: Rng): Question {
  const aTens = randInt(2, 9, rng);
  const bTens = randInt(1, aTens - 1, rng);
  const a = aTens * 10;
  const b = bTens * 10;
  const answer = a - b;
  const tensWord = (n: number) => (n === 1 ? "עשרה" : "עשרות");
  return makeQuestion(
    `${a} − ${b}`,
    answer,
    [
      "כששני המספרים הן עשרות שלמות, פשוט מחסרים את מספר העשרות",
      `\`${aTens}\` ${tensWord(aTens)} פחות \`${bTens}\` ${tensWord(bTens)}`,
    ],
    [
      { label: "מחסרים את מספרי העשרות:", math: `${aTens} - ${bTens} = ${aTens - bTens}` },
      { label: "אז יוצא", math: `${a} - ${b} = ${answer}` },
    ],
    pick(WHOLE_TENS_ANALOGIES, rng)(a, b),
    rng,
  );
}

/** Tier 2 — a single digit subtracted from a two-digit number, no borrow. */
function singleDigitSub(rng: Rng): Question {
  const tens = randInt(1, 9, rng) * 10;
  const units = randInt(1, 9, rng);
  const b = randInt(1, units, rng);
  const a = tens + units;
  const answer = a - b;
  const hint2 =
    units === 1
      ? `\`${a}\` זה \`${tens / 10}\` עשרות ו-\`1\` יחידה. מורידים \`${b}\` מהיחידה`
      : `\`${a}\` זה \`${tens / 10}\` עשרות ו-\`${units}\` יחידות. מורידים \`${b}\` מהיחידות`;
  return makeQuestion(
    `${a} − ${b}`,
    answer,
    ["מחסרים יחידות מיחידות, ועשרות מעשרות", hint2],
    [
      { label: "מחסרים מהיחידות:", math: `${units} - ${b} = ${units - b}` },
      { label: "העשרות נשארות כמו שהן:", math: `${tens} + ${units - b} = ${answer}` },
    ],
    pick(SINGLE_DIGIT_ANALOGIES, rng)(a, b),
    rng,
  );
}

/** Tier 3 — two two-digit numbers, no borrow (unitsB never exceeds unitsA). */
function twoDigitNoBorrow(rng: Rng): Question {
  const tensA = randInt(2, 9, rng);
  const unitsA = randInt(1, 9, rng);
  const tensB = randInt(1, tensA - 1, rng);
  const unitsB = randInt(0, unitsA, rng);
  const a = tensA * 10 + unitsA;
  const b = tensB * 10 + unitsB;
  const answer = a - b;
  return makeQuestion(
    `${a} − ${b}`,
    answer,
    [
      "מחסרים יחידות מיחידות ועשרות מעשרות בנפרד",
      `\`${unitsA}\`−\`${unitsB}\` ביחידות, ו-\`${tensA}\`−\`${tensB}\` בעשרות`,
    ],
    [
      { label: "מחסרים עשרות מעשרות:", math: `${tensA} - ${tensB} = ${tensA - tensB}` },
      { label: "ומחסרים יחידות מיחידות:", math: `${unitsA} - ${unitsB} = ${unitsA - unitsB}` },
      { label: "ביחד:", math: `${a} - ${b} = ${answer}` },
    ],
    pick(TWO_DIGIT_ANALOGIES, rng)(a, b),
    rng,
  );
}

/** Tiers 4/5 — borrowing. `unitsB` always exceeds `unitsA`, forcing a borrow; `maxTensA`
 *  narrows the range for the easier of the two carry tiers, leaving the full range for the
 *  hardest — the same shape as `adaptiveAdd100.ts`'s `carrying(rng, maxTens)`.
 *
 * `tensA - tensB` is forced to be at least `2` (not just `1`), so the answer's own tens
 * digit is never `0` — otherwise the answer can come out as a single digit (e.g.
 * `46 − 38 = 8`), which then coincidentally matches `unitsA` or `unitsB` spoken aloud in
 * hint 2 ("...אין מספיק כדי להוריד `8`...") and trips the "hint hands over the answer"
 * content rule. A real content bug this rule caught during QA, not a test to relax. */
function borrowing(rng: Rng, maxTensA: number): Question {
  const tensA = randInt(3, maxTensA, rng);
  const tensB = randInt(1, tensA - 2, rng);
  const unitsA = randInt(0, 8, rng);
  const unitsB = randInt(unitsA + 1, 9, rng);
  const a = tensA * 10 + unitsA;
  const b = tensB * 10 + unitsB;
  const answer = a - b;
  const tensAfterBorrow = tensA - 1;
  const unitsAfterBorrow = unitsA + 10;
  return makeQuestion(
    `${a} − ${b}`,
    answer,
    [
      "כשאין מספיק ביחידות, 'שואלים' עשרת אחת מהעשרות",
      `ליחידה \`${unitsA}\` אין מספיק כדי להוריד \`${unitsB}\`, אז שואלים עשר מ-\`${tensA * 10}\``,
    ],
    [
      {
        label: "מפרקים לפי ערך המקום, עם עשרה שאולה ליחידות:",
        math: `${a} = ${tensAfterBorrow * 10} + ${unitsAfterBorrow}`,
      },
      { label: "מחסרים ביחידות:", math: `${unitsAfterBorrow} - ${unitsB} = ${unitsAfterBorrow - unitsB}` },
      { label: "ובעשרות:", math: `${tensAfterBorrow * 10} - ${tensB * 10} = ${(tensAfterBorrow - tensB) * 10}` },
      { label: "ביחד:", math: `${(tensAfterBorrow - tensB) * 10} + ${unitsAfterBorrow - unitsB} = ${answer}` },
    ],
    pick(BORROW_ANALOGIES, rng)(a, b),
    rng,
  );
}

/**
 * Five difficulty tiers, mirroring `generateAdd100Question` exactly except for the
 * subtraction mechanic.
 */
export function generateSub100Question(difficulty: number, rng: Rng = Math.random): Question {
  switch (Math.min(5, Math.max(1, Math.round(difficulty)))) {
    case 1:
      return wholeTens(rng);
    case 2:
      return singleDigitSub(rng);
    case 3:
      return twoDigitNoBorrow(rng);
    case 4:
      return borrowing(rng, 5);
    default:
      return borrowing(rng, 9);
  }
}

export const SUB100_MIN_DIFFICULTY = 1;
export const SUB100_MAX_DIFFICULTY = 5;
export const SUB100_INITIAL_DIFFICULTY = 1;
export const SUB100_QUESTION_COUNT = 20;

/**
 * Same pace as `nextAdd100Difficulty` — two in a row before pushing harder, one wrong
 * answer backs off immediately.
 */
export function nextSub100Difficulty(current: number, wasCorrect: boolean, streak: number): number {
  if (!wasCorrect) return Math.max(SUB100_MIN_DIFFICULTY, current - 1);
  return streak >= 2 ? Math.min(SUB100_MAX_DIFFICULTY, current + 1) : current;
}
