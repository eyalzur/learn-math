import type { Question } from "./curriculum";
import { type Rng, randInt, pick, makeFreshId } from "./adaptiveHelpers";

/**
 * "שברים עשרוניים" (רותם, כיתה ו׳), built at runtime — see
 * docs/features/levels-as-practice/architecture.md.
 *
 * Five patterns read directly off the 30 written questions in `grade6.ts`: adding two
 * one-decimal numbers, subtracting two one-decimal numbers, multiplying by 10, multiplying
 * a one-decimal number by a whole number, and dividing a one-decimal number by a whole
 * number that divides it evenly.
 */

const freshId = makeFreshId("g6-decimals-adaptive");

/** A random one-decimal number `whole.tenths`, as a JS number built from integer parts so
 *  it never accumulates floating-point noise (0.1 + 0.2 territory). */
function oneDecimal(maxWhole: number, rng: Rng): { whole: number; tenths: number; value: number } {
  const whole = randInt(0, maxWhole, rng);
  const tenths = randInt(1, 9, rng);
  return { whole, tenths, value: Number(`${whole}.${tenths}`) };
}

function fmt(whole: number, tenths: number): string {
  return `${whole}.${tenths}`;
}

const MONEY_ANALOGIES_ADD = [
  (a: string, b: string) => `${a} שקל ועוד ${b} שקל — כמה יש בסך הכל?`,
  (a: string, b: string) => `בקבוק של ${a} ליטר ועוד אחד של ${b} ליטר — כמה ליטר בסך הכל?`,
];

function makeQuestion(
  prompt: string,
  answer: number,
  hints: [string, string],
  steps: { label: string; math?: string }[],
  analogy: string,
  rng: Rng,
): Question {
  return { id: freshId(rng), topic: "שברים עשרוניים", prompt, answer, hints, steps, analogy };
}

/** Pattern 1 — adding two one-decimal numbers. Most of the time the tenths stay under
 *  10 (no carry); about a third of the time they're built to land on exactly 10,
 *  carrying into a whole number — the one case the written data exercises ("1.5 + 1.5"
 *  = 3), and the one `verticalSum` needs in order to draw its carry mark and explain a
 *  column-honest "3.0" as the plain "3" it actually is. */
function addDecimals(rng: Rng): Question {
  const carries = rng() < 0.35;
  const aWhole = randInt(0, 4, rng);
  const bWhole = randInt(0, 4, rng);
  const aTenths = carries ? randInt(1, 9, rng) : randInt(1, 8, rng);
  const bTenths = carries ? 10 - aTenths : randInt(1, 9 - aTenths, rng);
  const a = fmt(aWhole, aTenths);
  const b = fmt(bWhole, bTenths);
  const answer = Number((Number(a) + Number(b)).toFixed(1));
  return makeQuestion(
    `${a} + ${b}`,
    answer,
    ["מיישרים את הנקודה זו מתחת לזו ומחברים כרגיל", `מחברים קודם את מה שאחרי הנקודה: \`${a}\` ו-\`${b}\``],
    [
      { label: "מחברים עשירית לעשירית", math: `${aTenths / 10} + ${bTenths / 10} = ${(aTenths + bTenths) / 10}` },
      { label: "ואז השלמים", math: `${a} + ${b} = ${answer}` },
    ],
    pick(MONEY_ANALOGIES_ADD, rng)(a, b),
    rng,
  );
}

/** Pattern 2 — subtracting two one-decimal numbers, minuend at least as large. */
function subtractDecimals(rng: Rng): Question {
  const bTenths = randInt(1, 9, rng);
  const aTenths = randInt(bTenths, 9, rng);
  const bWhole = randInt(0, 4, rng);
  const aWhole = randInt(bWhole, bWhole + 5, rng);
  const a = fmt(aWhole, aTenths);
  const b = fmt(bWhole, bTenths);
  const answer = Number((Number(a) - Number(b)).toFixed(1));
  return makeQuestion(
    `${a} − ${b}`,
    answer,
    ["מיישרים את הנקודה זו מתחת לזו ומחסרים כרגיל", `מ-\`${a}\` מורידים \`${b}\`, והנקודה נשארת במקומה`],
    [
      { label: "מחסרים עשירית מעשירית", math: `${aTenths / 10} − ${bTenths / 10} = ${(aTenths - bTenths) / 10}` },
      { label: "ואז השלמים", math: `${a} − ${b} = ${answer}` },
    ],
    `היו לך ${a} שקל, הוצאת ${b} — כמה נשאר לך?`,
    rng,
  );
}

/** Pattern 3 — multiplying a one-decimal number by 10. */
function timesTen(rng: Rng): Question {
  const { whole, tenths } = oneDecimal(9, rng);
  const num = fmt(whole, tenths);
  const answer = whole * 10 + tenths;
  return makeQuestion(
    `${num} × 10`,
    answer,
    ["כפל ב-`10` מזיז את הנקודה מקום אחד ימינה", `ב-\`${num}\` הנקודה זזה צעד אחד ימינה`],
    [{ label: "כפל ב-10 מזיז את הנקודה מקום אחד ימינה" }, { label: "", math: `${num} × 10 = ${answer}` }],
    `מחיר של ${num} שקל ליחידה, וקונים עשרה כאלה — כמה זה עולה בסך הכל?`,
    rng,
  );
}

/** Pattern 4 — a one-decimal number times a small whole number that keeps the tenths
 *  under 10 (no carry into the whole part beyond simple multiplication). */
function timesWhole(rng: Rng): Question {
  const factor = randInt(2, 6, rng);
  const tenths = randInt(1, 9, rng);
  // Whole part chosen so the multiplication stays two-digit-friendly.
  const whole = randInt(0, 3, rng);
  const num = fmt(whole, tenths);
  const answer = Number((Number(num) * factor).toFixed(1));
  return makeQuestion(
    `${num} × ${factor}`,
    answer,
    ["אפשר להתעלם מהנקודה, לכפול כמו מספרים שלמים, ואז להחזיר את הנקודה למקומה", `ל-\`${num}\` יש ספרה אחת אחרי הנקודה — גם בתשובה תהיה ספרה אחת אחרי הנקודה`],
    [{ label: "כופלים בלי הנקודה ומחזירים אותה" }, { label: "", math: `${num} × ${factor} = ${answer}` }],
    `${factor} כוסות שבכל אחת ${num} ליטר — כמה ליטר בסך הכל?`,
    rng,
  );
}

/** Pattern 5 — dividing a one-decimal number by a whole number that divides it evenly. */
function divideByWhole(rng: Rng): Question {
  const divisor = randInt(2, 4, rng);
  const wholeQuot = randInt(1, 4, rng);
  const tenthsQuot = pick([0, 2, 4, 5, 6, 8] as const, rng);
  const quotient = Number(`${wholeQuot}.${tenthsQuot}`);
  const num = Number((quotient * divisor).toFixed(1));
  return makeQuestion(
    `${num} ÷ ${divisor}`,
    quotient,
    ["מחלקים כרגיל, והנקודה נשארת מעל אותו מקום", `מחלקים את \`${num}\` ל-\`${divisor}\` חלקים שווים`],
    [{ label: "מחלקים כרגיל והנקודה נשארת" }, { label: "", math: `${num} ÷ ${divisor} = ${quotient}` }],
    `${num} ק״ג קמח שמתחלקים שווה בשווה בין ${divisor} אנשים — כמה מקבל כל אחד?`,
    rng,
  );
}

export function generateDecimalsQuestion(difficulty: number, rng: Rng = Math.random): Question {
  switch (Math.min(5, Math.max(1, Math.round(difficulty)))) {
    case 1:
      return addDecimals(rng);
    case 2:
      return subtractDecimals(rng);
    case 3:
      return timesTen(rng);
    case 4:
      return timesWhole(rng);
    default:
      return divideByWhole(rng);
  }
}

export const DECIMALS_MIN_DIFFICULTY = 1;
export const DECIMALS_MAX_DIFFICULTY = 5;
export const DECIMALS_INITIAL_DIFFICULTY = 1;
export const DECIMALS_QUESTION_COUNT = 20;

export function nextDecimalsDifficulty(current: number, wasCorrect: boolean, streak: number): number {
  if (!wasCorrect) return Math.max(DECIMALS_MIN_DIFFICULTY, current - 1);
  return streak >= 2 ? Math.min(DECIMALS_MAX_DIFFICULTY, current + 1) : current;
}
