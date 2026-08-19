import type { Question } from "./curriculum";
import { type Rng, randInt, pick, makeFreshId, withoutLeakingHints, wantsDecimal, round2 } from "./adaptiveHelpers";

/**
 * "אחוזים" (רותם, כיתה ו׳), built at runtime — see
 * docs/features/levels-as-practice/architecture.md.
 *
 * Five patterns read directly off the 30 written questions in `grade6.ts`: 10%/50% by
 * simple division, 25%/75% by quarters, 20%/30% via "find 10% first", and the three
 * word-problem shapes from the hard level (discount amount, price increase, part-to-whole).
 */

const freshId = makeFreshId("g6-percent-adaptive");

/** [שם הפריט, כינוי החזרה עליו] — "נעליים" הוא רבים/נקבה ("עליהן"), שאר הפריטים יחיד
 *  זכר ("עליו"). נשמר יחד כדי שהפריט והכינוי בפרומפט תמיד יתאימו זה לזה בדקדוק. */
const DISCOUNT_ITEMS: [string, string][] = [
  ["מעיל", "עליו"],
  ["נעליים", "עליהן"],
  ["תיק", "עליו"],
  ["מכשיר", "עליו"],
];

const INCREASE_ANALOGIES = [
  (price: number) => `כרטיס שעלה ${price} שקלים`,
  (price: number) => `מנוי שעלה ${price} שקלים`,
  (price: number) => `מוצר שמחירו היה ${price} שקלים`,
];

const PART_ANALOGIES = [
  (a: number, b: number) => `${a} תלמידים מתוך ${b} בבית הספר שנרשמו לחוג`,
  (a: number, b: number) => `${a} ימי גשם מתוך ${b} ימי חורף`,
  (a: number, b: number) => `${a} כרטיסים מתוך ${b} שנמכרו`,
];

function makeQuestion(
  prompt: string,
  answer: number,
  hints: [string, string],
  steps: { label: string; math?: string }[],
  analogy: string,
  rng: Rng,
): Question {
  return { id: freshId(rng), topic: "אחוזים", prompt, answer, hints, steps, analogy };
}

/** Pattern 1 — 10% of a multiple of 10. */
function tenPercent(rng: Rng): Question {
  const base = randInt(2, 9, rng) * 10;
  const answer = base / 10;
  return makeQuestion(
    `כמה זה 10% מ-${base}?`,
    answer,
    ["`10%` הם עשירית: מחלקים ב-`10`", `\`${base}\` חלקי \`10\``],
    [{ label: "10% זה עשירית מהמספר" }, { label: "", math: `${base} ÷ 10 = ${answer}` }],
    `10% הנחה על ${base} שקלים`,
    rng,
  );
}

/** Pattern 2 — 50% of an even number. */
function fiftyPercent(rng: Rng): Question {
  const base = randInt(2, 45, rng) * 2;
  const answer = base / 2;
  return makeQuestion(
    `כמה זה 50% מ-${base}?`,
    answer,
    ["`50%` הם בדיוק חצי", `חצי מ-\`${base}\``],
    [{ label: "50% זה בדיוק חצי" }, { label: "", math: `${base} ÷ 2 = ${answer}` }],
    `חצי מכיתה של ${base} תלמידים`,
    rng,
  );
}

/** Pattern 3 — 25%/75% of a multiple of 4. */
function quarterOrThreeQuarters(rng: Rng): Question {
  const base = randInt(2, 40, rng) * 4;
  const quarter = base / 4;
  const isThree = rng() < 0.5;
  const rate = isThree ? 75 : 25;
  const answer = isThree ? quarter * 3 : quarter;
  const hint1 = isThree ? "`75%` הם שלושה רבעים" : "`25%` הם רבע: מחלקים ב-`4`";
  const hint2 = isThree
    ? `רבע מ-\`${base}\` הוא \`${quarter}\`, וצריך \`3\` כאלה`
    : `\`${base}\` חלקי \`4\``;
  const steps = isThree
    ? [
        { label: "רבע אחד הוא", math: `${base} ÷ 4 = ${quarter}` },
        { label: "שלושה רבעים הם", math: `${quarter} × 3 = ${answer}` },
      ]
    : [{ label: "25% זה בדיוק רבע" }, { label: "", math: `${base} ÷ 4 = ${answer}` }];
  return makeQuestion(`כמה זה ${rate}% מ-${base}?`, answer, [hint1, hint2], steps, `רבע מקבוצה של ${base} משתתפים`, rng);
}

/** Pattern 4 — 20%/30% of a multiple of 10, via "find 10% first". A ~30% share of these
 *  questions add a tenths digit to `base`, so `10%` comes out as a one-decimal number
 *  instead of always landing clean — real percentages don't always divide evenly. */
function tensViaTenPercent(rng: Rng): Question {
  const decimal = wantsDecimal(rng);
  const base = randInt(2, 50, rng) * 10 + (decimal ? randInt(1, 9, rng) : 0);
  const tenPct = round2(base / 10);
  const factor = pick([2, 3] as const, rng);
  const rate = factor * 10;
  const answer = round2(tenPct * factor);
  return makeQuestion(
    `כמה זה ${rate}% מ-${base}?`,
    answer,
    ["קודם מוצאים `10%`, ומשם מגיעים לכל אחוז אחר", `\`10%\` מ-\`${base}\` הם \`${tenPct}\`. כמה עשיריות כאלה צריך?`],
    [
      { label: "קודם 10%:", math: `${base} ÷ 10 = ${tenPct}` },
      { label: `${rate}% זה פי ${factor}:`, math: `${tenPct} × ${factor} = ${answer}` },
    ],
    `טיפ של ${rate}% על חשבון של ${base} שקל`,
    rng,
  );
}

/** Pattern 5 — one of three word-problem shapes from the hard level. */
function wordProblem(rng: Rng): Question {
  const kind = pick(["discount", "increase", "partOfWhole"] as const, rng);

  if (kind === "discount") {
    // 25% is excluded from the decimal draw on purpose: dividing a one-decimal price by
    // 4 produces three decimal digits (23.7 ÷ 4 = 5.925), past the two-digit cap.
    const decimal = wantsDecimal(rng);
    const rate = decimal ? pick([10, 20, 50] as const, rng) : pick([10, 20, 25, 50] as const, rng);
    const divisor = rate === 25 ? 4 : rate === 50 ? 2 : 10 / (rate / 10);
    const price = round2(randInt(2, 40, rng) * divisor + (decimal ? randInt(1, 9, rng) / 10 : 0));
    const answer = round2((price * rate) / 100);
    const [item, pronoun] = pick(DISCOUNT_ITEMS, rng);
    return makeQuestion(
      `מחיר ${item} הוא ${price} שקלים, וקיבלת ${pronoun} הנחה של ${rate}%. כמה שקלים הייתה ההנחה?`,
      answer,
      ["הנחה היא אחוז מהמחיר המקורי", `\`${rate}%\` מ-\`${price}\``],
      [{ label: "מחשבים את האחוז מהמחיר", math: `${price} × ${rate} ÷ 100 = ${answer}` }],
      `מחיר ${item} הוא ${price} שקלים`,
      rng,
    );
  }

  if (kind === "increase") {
    // Same 25% exclusion as the discount case above, and for the same reason.
    const decimal = wantsDecimal(rng);
    const rate = decimal ? pick([10, 20, 50] as const, rng) : pick([10, 20, 25, 50] as const, rng);
    const divisor = rate === 25 ? 4 : rate === 50 ? 2 : 10 / (rate / 10);
    const price = round2(randInt(2, 40, rng) * divisor + (decimal ? randInt(1, 9, rng) / 10 : 0));
    const addition = round2((price * rate) / 100);
    const answer = round2(price + addition);
    return makeQuestion(
      `מחיר ${price} שקלים עלה ב-${rate}%. מה המחיר החדש?`,
      answer,
      ["מחשבים את התוספת, ואז מוסיפים אותה למחיר", `\`${rate}%\` מ-\`${price}\` הם \`${addition}\`. מוסיפים למחיר המקורי`],
      [
        { label: "התוספת:", math: `${price} × ${rate} ÷ 100 = ${addition}` },
        { label: "", math: `${price} + ${addition} = ${answer}` },
      ],
      pick(INCREASE_ANALOGIES, rng)(price),
      rng,
    );
  }

  const percent = randInt(1, 19, rng) * 5;
  const whole = randInt(1, 10, rng) * 20;
  const part = (whole * percent) / 100;
  return makeQuestion(
    `${part} מתוך ${whole}. כמה אחוזים זה?`,
    percent,
    ["חלק מתוך שלם הופך לאחוזים בכפל ב-`100`", `\`${part}\` חלקי \`${whole}\`, ואת התוצאה כופלים ב-\`100\``],
    [
      { label: "", math: `${part} ÷ ${whole} = ${part / whole}` },
      { label: "", math: `${part / whole} × 100 = ${percent}` },
    ],
    pick(PART_ANALOGIES, rng)(part, whole),
    rng,
  );
}

export function generatePercentQuestion(difficulty: number, rng: Rng = Math.random): Question {
  return withoutLeakingHints(() => {
    switch (Math.min(5, Math.max(1, Math.round(difficulty)))) {
      case 1:
        return tenPercent(rng);
      case 2:
        return fiftyPercent(rng);
      case 3:
        return quarterOrThreeQuarters(rng);
      case 4:
        return tensViaTenPercent(rng);
      default:
        return wordProblem(rng);
    }
  });
}

export const PERCENT_MIN_DIFFICULTY = 1;
export const PERCENT_MAX_DIFFICULTY = 5;
export const PERCENT_INITIAL_DIFFICULTY = 1;
export const PERCENT_QUESTION_COUNT = 20;

export function nextPercentDifficulty(current: number, wasCorrect: boolean, streak: number): number {
  if (!wasCorrect) return Math.max(PERCENT_MIN_DIFFICULTY, current - 1);
  return streak >= 2 ? Math.min(PERCENT_MAX_DIFFICULTY, current + 1) : current;
}
