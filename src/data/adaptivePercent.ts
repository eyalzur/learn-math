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
  (price: number, rate: number) => `כרטיס שעלה ${price} שקלים והתייקר ב-${rate}% — מה המחיר החדש?`,
  (price: number, rate: number) => `מנוי שעלה ${price} שקלים והתייקר ב-${rate}% — מה המחיר החדש?`,
  (price: number, rate: number) => `מוצר שמחירו היה ${price} שקלים והתייקר ב-${rate}% — מה המחיר החדש?`,
];

const PART_ANALOGIES = [
  (a: number, b: number) => `${a} תלמידים מתוך ${b} בבית הספר שנרשמו לחוג — כמה אחוזים זה?`,
  (a: number, b: number) => `${a} ימי גשם מתוך ${b} ימי חורף — כמה אחוזים מהחורף זה?`,
  (a: number, b: number) => `${a} כרטיסים מתוך ${b} שנמכרו — כמה אחוזים מהכרטיסים נמכרו?`,
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

/** Pattern 1 — 10% of a multiple of 10. Explains itself through the reduced fraction
 *  first (`10%` = `10/100` = `1/10`) rather than just stating the rule — the same wording
 *  docs/features/percent-tenths-teaching gives the written grade6.ts questions. */
function tenPercent(rng: Rng): Question {
  const base = randInt(2, 9, rng) * 10;
  const answer = base / 10;
  return makeQuestion(
    `כמה זה 10% מ-${base}?`,
    answer,
    ["`10%` זה כמו `1/10`", `\`${base}\` חלקי \`10\``],
    [
      { label: "`10%` זה `10/100`" },
      { label: "מצמצמים: `10/100` שווה ל-`1/10` (מחלקים את שני המספרים ב-`10`)" },
      { label: "10% זה עשירית מהמספר" },
      { label: "", math: `${base} ÷ 10 = ${answer}` },
    ],
    `10% הנחה על מוצר שמחירו ${base} שקלים — כמה שקלים ההנחה?`,
    rng,
  );
}

/** Pattern 2 — 50% of an even number. Same reduced-fraction explanation as `tenPercent`. */
function fiftyPercent(rng: Rng): Question {
  const base = randInt(2, 45, rng) * 2;
  const answer = base / 2;
  return makeQuestion(
    `כמה זה 50% מ-${base}?`,
    answer,
    ["`50%` זה כמו `1/2` — בדיוק חצי", `חצי מ-\`${base}\``],
    [
      { label: "`50%` זה `50/100`" },
      { label: "מצמצמים: `50/100` שווה ל-`1/2` (מחלקים את שני המספרים ב-`50`)" },
      { label: "למה זה חצי? כי חצי מ-`100` הוא בדיוק `50` — ולכן `50` מתוך `100` הוא תמיד חצי" },
      { label: "", math: `${base} ÷ 2 = ${answer}` },
    ],
    `כיתה של ${base} תלמידים שחצי מהם יצאו לטיול — כמה תלמידים זה?`,
    rng,
  );
}

/** Pattern 3 — 25%/75% of a multiple of 4. Same reduced-fraction explanation. */
function quarterOrThreeQuarters(rng: Rng): Question {
  const base = randInt(2, 40, rng) * 4;
  const quarter = base / 4;
  const isThree = rng() < 0.5;
  const rate = isThree ? 75 : 25;
  const answer = isThree ? quarter * 3 : quarter;
  const hint1 = isThree ? "`75%` זה כמו `3/4`" : "`25%` זה כמו `1/4`";
  const hint2 = isThree
    ? `רבע מ-\`${base}\` הוא \`${quarter}\`, וצריך \`3\` כאלה`
    : `\`${base}\` חלקי \`4\``;
  const fractionSteps = [
    { label: `\`${rate}%\` זה \`${rate}/100\`` },
    {
      label: isThree
        ? `מצמצמים: \`${rate}/100\` שווה ל-\`3/4\` (מחלקים את שני המספרים ב-\`25\`)`
        : `מצמצמים: \`${rate}/100\` שווה ל-\`1/4\` (מחלקים את שני המספרים ב-\`25\`)`,
    },
  ];
  const steps = isThree
    ? [
        ...fractionSteps,
        { label: "רבע אחד הוא", math: `${base} ÷ 4 = ${quarter}` },
        { label: "שלושה רבעים הם", math: `${quarter} × 3 = ${answer}` },
      ]
    : [...fractionSteps, { label: "25% זה בדיוק רבע" }, { label: "", math: `${base} ÷ 4 = ${answer}` }];
  return makeQuestion(
    `כמה זה ${rate}% מ-${base}?`,
    answer,
    [hint1, hint2],
    steps,
    `קבוצה של ${base} משתתפים ש-${rate}% מהם סיימו את המשימה — כמה משתתפים זה?`,
    rng,
  );
}

/** Pattern 4 — 20%/30% of a multiple of 10, via "find 10% first". Same reduced-fraction
 *  explanation; `30%` reduces by its `gcd` with `100` (`10`), not by `30` itself. `base`
 *  always stays a whole number — only the *answer* (and the intermediate `10%` value) can
 *  land on a decimal, per the review note that a question should never show a decimal
 *  among its own given numbers. */
function tensViaTenPercent(rng: Rng): Question {
  const base = randInt(2, 50, rng) * 10;
  const tenPct = base / 10;
  const factor = pick([2, 3] as const, rng);
  const rate = factor * 10;
  const answer = tenPct * factor;
  const isThirty = rate === 30;
  const hint1 = isThirty ? "`30%` זה כמו `3/10`" : "`20%` זה כמו `1/5`";
  return makeQuestion(
    `כמה זה ${rate}% מ-${base}?`,
    answer,
    [hint1, `\`10%\` מ-\`${base}\` הם \`${tenPct}\`. כמה עשיריות כאלה צריך?`],
    [
      { label: `\`${rate}%\` זה \`${rate}/100\`` },
      {
        label: isThirty
          ? `מצמצמים: \`${rate}/100\` שווה ל-\`3/10\` (מחלקים את שני המספרים ב-\`10\`)`
          : `מצמצמים: \`${rate}/100\` שווה ל-\`1/5\` (מחלקים את שני המספרים ב-\`20\`)`,
      },
      { label: "קודם 10%:", math: `${base} ÷ 10 = ${tenPct}` },
      { label: `${rate}% זה פי ${factor}:`, math: `${tenPct} × ${factor} = ${answer}` },
    ],
    `טיפ של ${rate}% על חשבון של ${base} שקל — כמה שקלים זה?`,
    rng,
  );
}

/** Pattern 5 — one of three word-problem shapes from the hard level. */
function wordProblem(rng: Rng): Question {
  const kind = pick(["discount", "increase", "partOfWhole"] as const, rng);

  if (kind === "discount") {
    // `price` is always a whole number — a question never shows a decimal among its own
    // given numbers, only the answer may land on one. A ~30% share break `price` away
    // from being a clean multiple of the rate's divisor (2/4/5/10, all of which keep the
    // result to at most two decimal digits for any whole price), so the discount comes
    // out non-integer without the price itself ever being anything but whole.
    const rate = pick([10, 20, 25, 50] as const, rng);
    const divisor = rate === 25 ? 4 : rate === 50 ? 2 : 10 / (rate / 10);
    const decimal = wantsDecimal(rng);
    const price = randInt(2, 40, rng) * divisor + (decimal ? randInt(1, divisor - 1, rng) : 0);
    const answer = round2((price * rate) / 100);
    const [item, pronoun] = pick(DISCOUNT_ITEMS, rng);
    return makeQuestion(
      `מחיר ${item} הוא ${price} שקלים, וקיבלת ${pronoun} הנחה של ${rate}%. כמה שקלים הייתה ההנחה?`,
      answer,
      ["הנחה היא אחוז מהמחיר המקורי", `\`${rate}%\` מ-\`${price}\``],
      [{ label: "מחשבים את האחוז מהמחיר", math: `${price} × ${rate} ÷ 100 = ${answer}` }],
      `${item} שעולה ${price} שקלים, עם הנחה של ${rate}% ${pronoun} — כמה שקלים ${pronoun} ההנחה?`,
      rng,
    );
  }

  if (kind === "increase") {
    // Same "price always whole, only the answer may be decimal" rule as the discount
    // case above, and the same divisor-remainder trick to get there.
    const rate = pick([10, 20, 25, 50] as const, rng);
    const divisor = rate === 25 ? 4 : rate === 50 ? 2 : 10 / (rate / 10);
    const decimal = wantsDecimal(rng);
    const price = randInt(2, 40, rng) * divisor + (decimal ? randInt(1, divisor - 1, rng) : 0);
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
      pick(INCREASE_ANALOGIES, rng)(price, rate),
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
