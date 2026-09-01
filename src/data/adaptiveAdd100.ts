import type { Question } from "./curriculum";

/**
 * "חיבור עד 1000", built at runtime instead of written 30 questions deep.
 *
 * Five patterns, not invented here — read straight off the 30 written questions in
 * `grade2.ts` (see `docs/features/mika-grade2-content/tests.md`, "סבב שני", where they
 * were first found by bucketing every question's hint text). Each pattern is the same
 * wording that already shipped, reviewed, and passed content.spec.ts — only the numbers
 * that were typed once are now placeholders filled at generation time. Nothing here is a
 * new sentence a child hasn't effectively already seen.
 *
 * A pattern that drifts from what its own hint promises is exactly the bug this project
 * spent a full review cycle fixing this week (see the same tests.md section) — so every
 * `steps` entry below is the literal column arithmetic, never "round to the nearest ten".
 */

type Rng = () => number;

function randInt(min: number, max: number, rng: Rng): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

/** A fresh id per instance — never reused as a lookup key, only for React keys/aria. */
function freshId(rng: Rng): string {
  return `g2-add100-adaptive-${Math.floor(rng() * 1e9)}`;
}

const SINGLE_DIGIT_ANALOGIES = [
  (a: number, b: number) => `היו לך ${a} מדבקות וקיבלת עוד ${b}`,
  (a: number, b: number) => `יש לך ${a} גולות ומצאת עוד ${b}`,
  (a: number, b: number) => `יש לך ${a} בלונים וניפחת עוד ${b}`,
  (a: number, b: number) => `יש לך ${a} ספרים על המדף וקיבלת עוד ${b}`,
  (a: number, b: number) => `יש לך ${a} קלפי משחק וקיבלת עוד ${b}`,
  (a: number, b: number) => `יש ${a} פרחים בגינה וניטעו עוד ${b}`,
  (a: number, b: number) => `ישבו ${a} ציפורים על העץ והצטרפו עוד ${b}`,
  (a: number, b: number) => `היו ${a} כפתורים בקופסה ושמת עוד ${b}`,
];

const WHOLE_TENS_ANALOGIES = [
  (a: number, b: number) => `${a} תלמידים בכיתה אחת ו-${b} תלמידים בכיתה שנייה — כמה יש בסך הכל?`,
  (a: number, b: number) => `${a} כיסאות בשורה אחת ועוד ${b} כיסאות בשורה שנייה — כמה יש בסך הכל?`,
];

const TWO_DIGIT_ANALOGIES = [
  (a: number, b: number) => `יש לך ${a} מדבקות בחוברת אחת ו-${b} בחוברת שנייה — כמה יש בסך הכל?`,
  (a: number, b: number) => `יש לך ${a} גולות בשקית אחת ו-${b} בשקית שנייה — כמה יש בסך הכל?`,
  (a: number, b: number) => `יש ${a} בלונים כחולים ו-${b} בלונים אדומים — כמה יש בסך הכל?`,
  (a: number, b: number) => `יש ${a} ספרים במדף אחד ו-${b} במדף שני — כמה יש בסך הכל?`,
  (a: number, b: number) => `${a} ציפורים בלהקה אחת ו-${b} בלהקה שנייה — כמה יש בסך הכל?`,
  (a: number, b: number) => `יש לך ${a} כרטיסי אספן ומצאת עוד ${b}`,
  (a: number, b: number) => `יש ${a} כפתורים בקופסה אחת ו-${b} בקופסה שנייה — כמה יש בסך הכל?`,
  (a: number, b: number) => `יש ${a} פרחים אדומים ו-${b} פרחים צהובים — כמה יש בסך הכל?`,
  (a: number, b: number) => `חסכת ${a} שקלים ואז עוד ${b} שקלים — כמה יש בסך הכל?`,
  (a: number, b: number) => `יש לך ${a} עפרונות בקלמר אחד ו-${b} בקלמר שני — כמה יש בסך הכל?`,
];

const CARRY_ANALOGIES = [
  (a: number, b: number) => `יש לך ${a} מדבקות וקיבלת עוד ${b}`,
  (a: number, b: number) => `יש לך ${a} גולות ומצאת עוד ${b}`,
  (a: number, b: number) => `יש ${a} בלונים במסיבה אחת ו-${b} במסיבה שנייה — כמה יש בסך הכל?`,
  (a: number, b: number) => `יש ${a} ספרים במדף אחד ו-${b} במדף שני — כמה יש בסך הכל?`,
  (a: number, b: number) => `ישבו ${a} ציפורים על הגדר והצטרפו עוד ${b}`,
  (a: number, b: number) => `יש לך ${a} כרטיסי אספן ומצאת עוד ${b}`,
  (a: number, b: number) => `יש ${a} כפתורים בקופסה אחת ו-${b} בקופסה שנייה — כמה יש בסך הכל?`,
  (a: number, b: number) => `יש ${a} פרחים אדומים ו-${b} פרחים צהובים — כמה יש בסך הכל?`,
];

/** Tiers 6-8 extend the range from "עד 100" to "עד 1000" — one column further, same
 *  column-by-column method as tiers 1-5, never "round to the nearest hundred". */

const HUNDRED_ANALOGIES = [
  (a: number, b: number) => `יש ${a} תלמידים בבית ספר אחד ו-${b} תלמידים בבית ספר שני — כמה יש בסך הכל?`,
  (a: number, b: number) => `חסכת ${a} שקלים, ואז חסכת עוד ${b} שקלים — כמה יש לך בסך הכל?`,
  (a: number, b: number) => `יש ${a} עצים ביער אחד ו-${b} עצים ביער שני — כמה יש בסך הכל?`,
];

const THREE_DIGIT_ANALOGIES = [
  (a: number, b: number) => `יש לך ${a} מדבקות באלבום אחד ו-${b} באלבום שני — כמה יש בסך הכל?`,
  (a: number, b: number) => `חסכת ${a} שקלים וקיבלת עוד ${b} שקלים ליום הולדת — כמה יש לך עכשיו?`,
  (a: number, b: number) => `יש ${a} תושבים בכפר אחד ו-${b} תושבים בכפר שני — כמה יש בסך הכל?`,
  (a: number, b: number) => `יש ${a} כרטיסים שנמכרו למופע אחד ו-${b} למופע שני — כמה נמכרו בסך הכל?`,
];

const HUNDRED_CARRY_ANALOGIES = [
  (a: number, b: number) => `יש לך ${a} מדבקות וקיבלת עוד ${b} — כמה יש לך עכשיו?`,
  (a: number, b: number) => `חסכת ${a} שקלים וקיבלת עוד ${b} שקלים במתנה — כמה יש לך בסך הכל?`,
  (a: number, b: number) => `יש ${a} ילדים רשומים לחוג אחד ו-${b} לחוג שני — כמה רשומים בסך הכל?`,
  (a: number, b: number) => `יש ${a} עמודים בספר אחד ו-${b} עמודים בספר שני — כמה עמודים בסך הכל?`,
];

function makeQuestion(prompt: string, answer: number, hints: [string, string], steps: { label: string; math?: string }[], analogy: string, rng: Rng): Question {
  return {
    id: freshId(rng),
    topic: "חיבור עד 1000",
    style: "add100",
    prompt,
    answer,
    hints,
    steps,
    analogy,
  };
}

/** Pattern 1/2 — a single digit added to a two-digit number, no carry. Two wordings for
 *  the same maths: "יחידה" (singular) only when the tens digit's units happen to be 1,
 *  exactly the grammar split the hand-written questions already make. */
function singleDigitAdd(rng: Rng): Question {
  const tens = randInt(1, 9, rng) * 10;
  const units = randInt(0, 8, rng);
  const gap = 9 - units; // b must leave the sum under 10 to stay carry-free
  const b = randInt(1, Math.max(1, gap), rng);
  const a = tens + units;
  const answer = a + b;
  const hint2 =
    units === 1
      ? `\`${a}\` זה \`${tens / 10}\` עשרות ו-\`1\` יחידה. מוסיפים \`${b}\` ליחידה`
      : `\`${a}\` זה \`${tens / 10}\` עשרות ו-\`${units}\` יחידות. מוסיפים \`${b}\` ליחידות`;
  return makeQuestion(
    `${a} + ${b}`,
    answer,
    ["מחברים עשרות עם עשרות, ויחידות עם יחידות", hint2],
    [
      { label: "מחברים את היחידות:", math: `${units} + ${b} = ${units + b}` },
      { label: "העשרות נשארות כמו שהן:", math: `${tens} + ${units + b} = ${answer}` },
    ],
    pick(SINGLE_DIGIT_ANALOGIES, rng)(a, b),
    rng,
  );
}

/** Pattern 3 — two whole tens. */
function wholeTens(rng: Rng): Question {
  const aTens = randInt(1, 8, rng);
  const bTens = randInt(1, 9 - aTens, rng);
  const a = aTens * 10;
  const b = bTens * 10;
  const answer = a + b;
  // "עשרות" (plural) only fits a count above 1 — a tens digit of exactly 1 needs the
  // singular "עשרה", same distinction the written e6/e7 never had to make because
  // neither of their tens digits happened to be 1.
  const tensWord = (n: number) => (n === 1 ? "עשרה" : "עשרות");
  return makeQuestion(
    `${a} + ${b}`,
    answer,
    [
      "כששני המספרים הן עשרות שלמות, פשוט מחברים את מספר העשרות",
      `\`${aTens}\` ${tensWord(aTens)} ועוד \`${bTens}\` ${tensWord(bTens)}`,
    ],
    [
      { label: "מחברים את מספרי העשרות:", math: `${aTens} + ${bTens} = ${aTens + bTens}` },
      { label: "אז יוצא", math: `${a} + ${b} = ${answer}` },
    ],
    pick(WHOLE_TENS_ANALOGIES, rng)(a, b),
    rng,
  );
}

/** Pattern 4 — two two-digit numbers, no carry. */
function twoDigitNoCarry(rng: Rng): Question {
  const tensA = randInt(1, 8, rng);
  const unitsA = randInt(0, 9, rng);
  const tensB = randInt(1, 9 - tensA, rng);
  const unitsB = randInt(0, 9 - unitsA, rng);
  const a = tensA * 10 + unitsA;
  const b = tensB * 10 + unitsB;
  const answer = a + b;
  return makeQuestion(
    `${a} + ${b}`,
    answer,
    [
      "מחברים עשרות עם עשרות בנפרד, ויחידות עם יחידות בנפרד",
      `\`${tensA}\`+\`${tensB}\` עשרות, ו-\`${unitsA}\`+\`${unitsB}\` יחידות`,
    ],
    [
      { label: "מחברים עשרות עם עשרות:", math: `${tensA} + ${tensB} = ${tensA + tensB}` },
      { label: "ומחברים יחידות עם יחידות:", math: `${unitsA} + ${unitsB} = ${unitsA + unitsB}` },
      { label: "ביחד:", math: `${a} + ${b} = ${answer}` },
    ],
    pick(TWO_DIGIT_ANALOGIES, rng)(a, b),
    rng,
  );
}

/** Pattern 5 — carrying past a ten. `maxTens` narrows the range for the easier of the two
 *  carry tiers (4), leaving the full range for the hardest tier (5). */
function carrying(rng: Rng, maxTens: number): Question {
  // The units alone can carry the answer past 90 (up to 18), so the tens are capped one
  // lower than the general range — tensA + tensB = 9 combined with a unit carry would push
  // the answer to 100 or past it, outside "עד 100".
  const tensCap = Math.min(maxTens, 8);
  const tensA = randInt(1, tensCap, rng);
  const tensB = randInt(0, tensCap - tensA, rng);
  // Units that sum to 10 or more — the whole point of this pattern.
  const unitsA = randInt(1, 9, rng);
  const unitsB = randInt(10 - unitsA, 9, rng);
  const a = tensA * 10 + unitsA;
  const b = tensB * 10 + unitsB;
  const answer = a + b;
  const unitSum = unitsA + unitsB;
  const carriedTens = tensA * 10 + tensB * 10 + 10;
  return makeQuestion(
    `${a} + ${b}`,
    answer,
    [
      "כשסכום היחידות עובר `10`, 'שואלים' עשרת אחת נוספת לעמודת העשרות",
      `\`${unitsA}\`+\`${unitsB}\` ביחידות הן \`${unitSum}\` — עשרת אחת ועוד \`${unitSum - 10}\``,
    ],
    [
      { label: "מחברים יחידות עם יחידות:", math: `${unitsA} + ${unitsB} = ${unitSum}` },
      {
        label: "עוברים עשר — מעבירים עשרת אחת לעמודת העשרות:",
        math: `${tensA * 10} + ${tensB * 10} + 10 = ${carriedTens}`,
      },
      { label: "והתוצאה:", math: `${carriedTens} + ${unitSum - 10} = ${answer}` },
    ],
    pick(CARRY_ANALOGIES, rng)(a, b),
    rng,
  );
}

/** Pattern 6 — two whole hundreds, the exact shape of `wholeTens` one column over. */
function wholeHundreds(rng: Rng): Question {
  const aHundreds = randInt(1, 8, rng);
  const bHundreds = randInt(1, 9 - aHundreds, rng);
  const a = aHundreds * 100;
  const b = bHundreds * 100;
  const answer = a + b;
  const hundredWord = (n: number) => (n === 1 ? "מאה" : "מאות");
  return makeQuestion(
    `${a} + ${b}`,
    answer,
    [
      "כששני המספרים הן מאות שלמות, פשוט מחברים את מספר המאות",
      `\`${aHundreds}\` ${hundredWord(aHundreds)} ועוד \`${bHundreds}\` ${hundredWord(bHundreds)}`,
    ],
    [
      { label: "מחברים את מספרי המאות:", math: `${aHundreds} + ${bHundreds} = ${aHundreds + bHundreds}` },
      { label: "אז יוצא", math: `${a} + ${b} = ${answer}` },
    ],
    pick(HUNDRED_ANALOGIES, rng)(a, b),
    rng,
  );
}

/** Pattern 7 — three-digit numbers, no column carries anywhere — the exact shape of
 *  `twoDigitNoCarry` with a hundreds column added. */
function threeDigitNoCarry(rng: Rng): Question {
  const hundredsA = randInt(1, 8, rng);
  const tensA = randInt(0, 9, rng);
  const unitsA = randInt(0, 9, rng);
  const hundredsB = randInt(1, 9 - hundredsA, rng);
  const tensB = randInt(0, 9 - tensA, rng);
  const unitsB = randInt(0, 9 - unitsA, rng);
  const a = hundredsA * 100 + tensA * 10 + unitsA;
  const b = hundredsB * 100 + tensB * 10 + unitsB;
  const answer = a + b;
  return makeQuestion(
    `${a} + ${b}`,
    answer,
    [
      "מחברים מאות עם מאות, עשרות עם עשרות, ויחידות עם יחידות — כל עמודה בנפרד",
      `\`${hundredsA}\`+\`${hundredsB}\` מאות, \`${tensA}\`+\`${tensB}\` עשרות, ו-\`${unitsA}\`+\`${unitsB}\` יחידות`,
    ],
    [
      { label: "מחברים מאות עם מאות:", math: `${hundredsA} + ${hundredsB} = ${hundredsA + hundredsB}` },
      { label: "מחברים עשרות עם עשרות:", math: `${tensA} + ${tensB} = ${tensA + tensB}` },
      { label: "ומחברים יחידות עם יחידות:", math: `${unitsA} + ${unitsB} = ${unitsA + unitsB}` },
      { label: "ביחד:", math: `${a} + ${b} = ${answer}` },
    ],
    pick(THREE_DIGIT_ANALOGIES, rng)(a, b),
    rng,
  );
}

/** Pattern 8 (hardest) — carrying that crosses all the way into the hundreds column, the
 *  same "מעבר מאה" the product spec calls out (`247 + 68`): the units carry into the tens,
 *  and the tens column — forced to sum to 9 or more — then carries again into the
 *  hundreds. `hundredsCap` keeps the total at or under 900 before that final +1, mirroring
 *  how `carrying`'s own `tensCap` keeps its sum under 100. */
function hundredCarrying(rng: Rng): Question {
  const hundredsCap = 8;
  const hundredsA = randInt(1, hundredsCap, rng);
  const hundredsB = randInt(0, hundredsCap - hundredsA, rng);
  const tensA = randInt(1, 9, rng);
  const tensB = randInt(9 - tensA, 9, rng);
  const unitsA = randInt(1, 9, rng);
  const unitsB = randInt(10 - unitsA, 9, rng);
  const a = hundredsA * 100 + tensA * 10 + unitsA;
  const b = hundredsB * 100 + tensB * 10 + unitsB;
  const answer = a + b;
  // Three place-value columns, each carrying into the next: units first (forced ≥ 10 by
  // construction), which adds 1 to the tens column and forces *that* past 10 too, which
  // adds 1 to the hundreds. `hundredsSum` never reaches double digits (≤ 9, by
  // `hundredsCap`), so the carry stops there — the answer stays a three-digit number.
  const unitSum = unitsA + unitsB;
  const unitsDigit = unitSum - 10;
  const tensSum = tensA + tensB + 1;
  const tensDigit = tensSum - 10;
  const hundredsSum = hundredsA + hundredsB + 1;
  return makeQuestion(
    `${a} + ${b}`,
    answer,
    [
      "כשסכום עמודה עובר `10`, 'שואלים' אחת נוספת לעמודה שמשמאל — וזה יכול לקרות פעמיים ברצף",
      `\`${unitsA}\`+\`${unitsB}\` ביחידות הן \`${unitSum}\`, אז גם בעמודת העשרות יש עשרת נוספת לחבר`,
    ],
    [
      { label: "מחברים יחידות עם יחידות:", math: `${unitsA} + ${unitsB} = ${unitSum}` },
      {
        label: "עוברים עשר — מעבירים עשרת אחת לעמודת העשרות:",
        math: `${tensA} + ${tensB} + 1 = ${tensSum}`,
      },
      {
        label: "העשרות עוברות מאה — מעבירים מאה אחת לעמודת המאות:",
        math: `${hundredsA} + ${hundredsB} + 1 = ${hundredsSum}`,
      },
      { label: "והתוצאה:", math: `${hundredsSum * 100} + ${tensDigit * 10} + ${unitsDigit} = ${answer}` },
    ],
    pick(HUNDRED_CARRY_ANALOGIES, rng)(a, b),
    rng,
  );
}

/**
 * Eight difficulty tiers. Tiers 1-5 are exactly what they always were — a child sitting at
 * difficulty 3 today is unaffected by this extension. Tiers 6-8 repeat the same climb one
 * column over: whole hundreds, three digits with no carry, then carrying all the way
 * across the hundreds boundary — the actual new skill "עד 1000" adds over "עד 100".
 */
export function generateAdd100Question(difficulty: number, rng: Rng = Math.random): Question {
  switch (Math.min(8, Math.max(1, Math.round(difficulty)))) {
    case 1:
      return wholeTens(rng);
    case 2:
      return singleDigitAdd(rng);
    case 3:
      return twoDigitNoCarry(rng);
    case 4:
      return carrying(rng, 5);
    case 5:
      return carrying(rng, 9);
    case 6:
      return wholeHundreds(rng);
    case 7:
      return threeDigitNoCarry(rng);
    default:
      return hundredCarrying(rng);
  }
}

export const ADD100_MIN_DIFFICULTY = 1;
export const ADD100_MAX_DIFFICULTY = 8;
export const ADD100_INITIAL_DIFFICULTY = 1;
export const ADD100_QUESTION_COUNT = 20;

/**
 * Two in a row before pushing harder — one lucky guess should not ramp difficulty up.
 * One wrong answer is enough to back off immediately — a real struggle gets a lighter
 * question right away, not after a run of misses.
 */
export function nextAdd100Difficulty(current: number, wasCorrect: boolean, streak: number): number {
  if (!wasCorrect) return Math.max(ADD100_MIN_DIFFICULTY, current - 1);
  return streak >= 2 ? Math.min(ADD100_MAX_DIFFICULTY, current + 1) : current;
}
