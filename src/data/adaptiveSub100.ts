import type { Question } from "./curriculum";

/**
 * "חיסור עד 1000", built at runtime instead of written 30 questions deep — the subtraction
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

/** Tiers 6-8 extend the range from "עד 100" to "עד 1000" — one column further, same
 *  column-by-column method as tiers 1-5, never "round to the nearest hundred". */

const HUNDRED_ANALOGIES = [
  (a: number, b: number) => `היו ${a} תלמידים רשומים לבית ספר ו-${b} עברו לבית ספר אחר — כמה נשארו?`,
  (a: number, b: number) => `חסכת ${a} שקלים והוצאת ${b} שקלים על אופניים — כמה נשאר לך?`,
  (a: number, b: number) => `היו ${a} עצים ביער ו-${b} נכרתו — כמה נשארו?`,
];

const THREE_DIGIT_ANALOGIES = [
  (a: number, b: number) => `היו לך ${a} מדבקות באלבום ונתת ${b} לחברה — כמה נשארו לך?`,
  (a: number, b: number) => `חסכת ${a} שקלים והוצאת ${b} שקלים על משחק — כמה נשאר לך?`,
  (a: number, b: number) => `היו ${a} תושבים בעיר ו-${b} עברו לעיר אחרת — כמה נשארו?`,
  (a: number, b: number) => `נמכרו ${a} כרטיסים למופע ו-${b} הוחזרו — כמה כרטיסים נשארו מכורים?`,
];

const HUNDRED_BORROW_ANALOGIES = [
  (a: number, b: number) => `היו לך ${a} מדבקות ונתת ${b} לחברה — כמה נשארו לך?`,
  (a: number, b: number) => `חסכת ${a} שקלים והוצאת ${b} שקלים על אופניים — כמה נשאר לך?`,
  (a: number, b: number) => `היו ${a} ילדים רשומים לחוג ו-${b} עזבו — כמה נשארו?`,
  (a: number, b: number) => `היו ${a} עמודים בספר וקרעת ${b} מהם בטעות — כמה עמודים נשארו שלמים?`,
];

function makeQuestion(prompt: string, answer: number, hints: [string, string], steps: { label: string; math?: string }[], analogy: string, rng: Rng): Question {
  return {
    id: freshId(rng),
    topic: "חיסור עד 1000",
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

/** Tier 6 — two whole hundreds, the exact shape of `wholeTens` one column over. */
function wholeHundreds(rng: Rng): Question {
  const aHundreds = randInt(2, 9, rng);
  const bHundreds = randInt(1, aHundreds - 1, rng);
  const a = aHundreds * 100;
  const b = bHundreds * 100;
  const answer = a - b;
  const hundredWord = (n: number) => (n === 1 ? "מאה" : "מאות");
  return makeQuestion(
    `${a} − ${b}`,
    answer,
    [
      "כששני המספרים הן מאות שלמות, פשוט מחסרים את מספר המאות",
      `\`${aHundreds}\` ${hundredWord(aHundreds)} פחות \`${bHundreds}\` ${hundredWord(bHundreds)}`,
    ],
    [
      { label: "מחסרים את מספרי המאות:", math: `${aHundreds} - ${bHundreds} = ${aHundreds - bHundreds}` },
      { label: "אז יוצא", math: `${a} - ${b} = ${answer}` },
    ],
    pick(HUNDRED_ANALOGIES, rng)(a, b),
    rng,
  );
}

/** Tier 7 — three-digit numbers, no borrow in any column (`hundredsB` strictly under
 *  `hundredsA` guarantees `a > b` regardless of the other two columns, the same way
 *  `twoDigitNoBorrow`'s `tensB` does). */
function threeDigitNoBorrow(rng: Rng): Question {
  const hundredsA = randInt(2, 9, rng);
  const tensA = randInt(0, 9, rng);
  const unitsA = randInt(1, 9, rng);
  const hundredsB = randInt(1, hundredsA - 1, rng);
  const tensB = randInt(0, tensA, rng);
  const unitsB = randInt(0, unitsA, rng);
  const a = hundredsA * 100 + tensA * 10 + unitsA;
  const b = hundredsB * 100 + tensB * 10 + unitsB;
  const answer = a - b;
  return makeQuestion(
    `${a} − ${b}`,
    answer,
    [
      "מחסרים מאות ממאות, עשרות מעשרות, ויחידות מיחידות — כל עמודה בנפרד",
      `\`${hundredsA}\`−\`${hundredsB}\` במאות, \`${tensA}\`−\`${tensB}\` בעשרות, ו-\`${unitsA}\`−\`${unitsB}\` ביחידות`,
    ],
    [
      { label: "מחסרים מאות ממאות:", math: `${hundredsA} - ${hundredsB} = ${hundredsA - hundredsB}` },
      { label: "מחסרים עשרות מעשרות:", math: `${tensA} - ${tensB} = ${tensA - tensB}` },
      { label: "ומחסרים יחידות מיחידות:", math: `${unitsA} - ${unitsB} = ${unitsA - unitsB}` },
      { label: "ביחד:", math: `${a} - ${b} = ${answer}` },
    ],
    pick(THREE_DIGIT_ANALOGIES, rng)(a, b),
    rng,
  );
}

/** Tier 8 (hardest) — borrowing that crosses all the way into the hundreds column, the
 *  subtraction mirror of `hundredCarrying` in `adaptiveAdd100.ts`: the units borrow from
 *  the tens, and the tens column — left short even after that — borrows again from the
 *  hundreds. `hundredsA - hundredsB ≥ 2` keeps a full hundred to lend and still finish
 *  above zero, the same role `tensA - 2` plays in `borrowing` above. */
function hundredBorrowing(rng: Rng): Question {
  const hundredsA = randInt(3, 9, rng);
  const hundredsB = randInt(1, hundredsA - 2, rng);
  const tensA = randInt(0, 8, rng);
  const tensB = randInt(tensA, 9, rng);
  const unitsA = randInt(0, 8, rng);
  const unitsB = randInt(unitsA + 1, 9, rng);
  const a = hundredsA * 100 + tensA * 10 + unitsA;
  const b = hundredsB * 100 + tensB * 10 + unitsB;
  const answer = a - b;
  // Same place-value reconstruction as `hundredCarrying`, in reverse: borrow a ten into
  // the units, then — still short — borrow a hundred into the tens.
  const unitsAfterBorrow = unitsA + 10;
  const unitsDigit = unitsAfterBorrow - unitsB;
  const tensAfterBorrow = tensA - 1 + 10;
  const tensDigit = tensAfterBorrow - tensB;
  const hundredsAfterBorrow = hundredsA - 1;
  return makeQuestion(
    `${a} − ${b}`,
    answer,
    [
      "כשאין מספיק בעמודה, 'שואלים' אחת מהעמודה שמשמאל — וזה יכול לקרות פעמיים ברצף",
      `ליחידה \`${unitsA}\` אין מספיק כדי להוריד \`${unitsB}\`, ואחרי ההשאלה גם לעשרות אין מספיק`,
    ],
    [
      {
        label: "אין מספיק ביחידות — שואלים עשרת אחת מהעשרות:",
        math: `${unitsAfterBorrow} - ${unitsB} = ${unitsDigit}`,
      },
      {
        label: "אחרי ההשאלה, גם בעשרות אין מספיק — שואלים מאה אחת מהמאות:",
        math: `${tensAfterBorrow} - ${tensB} = ${tensDigit}`,
      },
      { label: "מחסרים במאות:", math: `${hundredsAfterBorrow} - ${hundredsB} = ${hundredsAfterBorrow - hundredsB}` },
      {
        label: "ביחד:",
        math: `${(hundredsAfterBorrow - hundredsB) * 100} + ${tensDigit * 10} + ${unitsDigit} = ${answer}`,
      },
    ],
    pick(HUNDRED_BORROW_ANALOGIES, rng)(a, b),
    rng,
  );
}

/**
 * Eight difficulty tiers. Tiers 1-5 are exactly what they always were — a child sitting at
 * difficulty 3 today is unaffected by this extension. Tiers 6-8 repeat the same climb one
 * column over, mirroring `adaptiveAdd100.ts` exactly except for the subtraction mechanic.
 */
export function generateSub100Question(difficulty: number, rng: Rng = Math.random): Question {
  switch (Math.min(8, Math.max(1, Math.round(difficulty)))) {
    case 1:
      return wholeTens(rng);
    case 2:
      return singleDigitSub(rng);
    case 3:
      return twoDigitNoBorrow(rng);
    case 4:
      return borrowing(rng, 5);
    case 5:
      return borrowing(rng, 9);
    case 6:
      return wholeHundreds(rng);
    case 7:
      return threeDigitNoBorrow(rng);
    default:
      return hundredBorrowing(rng);
  }
}

export const SUB100_MIN_DIFFICULTY = 1;
export const SUB100_MAX_DIFFICULTY = 8;
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
