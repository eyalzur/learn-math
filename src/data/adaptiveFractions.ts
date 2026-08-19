import type { Question } from "./curriculum";
import { type Rng, randInt, pick, makeFreshId, withoutLeakingHints } from "./adaptiveHelpers";

/**
 * "שברים פשוטים" (רותם, כיתה ו׳), built at runtime — see
 * docs/features/levels-as-practice/architecture.md.
 *
 * Five patterns read directly off the 30 written questions in `grade6.ts`: a unit
 * fraction (חצי/שליש/רבע/חמישית) of a number that divides evenly, a non-unit fraction
 * (שני שלישים, שלושה רבעים, ...) of a number, and the three "counting parts across
 * whole(s)" shapes from the hard level.
 */

const freshId = makeFreshId("g6-fractions-adaptive");

/** [שם השבר ביחיד, המכנה] — בדיוק המכנים שכבר מופיעים בשאלות הכתובות. */
const UNIT_FRACTIONS: [string, number][] = [
  ["חצי", 2],
  ["שליש", 3],
  ["רבע", 4],
  ["חמישית", 5],
];

/**
 * [הביטוי המלא, מונה, מכנה] — בדיוק שש הצורות שכבר מופיעות בשאלות הכתובות, כולל ניקוד
 * המספר (זכר/נקבה) כפי שהוא שם. עברית הופכת את התאמת המין למספרים 3–10 (שם עצם ברבים
 * זכר לוקח צורת מספר נקבה ולהפך), וזה לא כלל אחיד על פני "רבעים"/"חמישיות"/"שלישים"/
 * "שמיניות"/"שישיות" — קל לטעות אם בונים את זה ממונה+שם בנפרד (`"שני חמישיות"` השגוי
 * במקום `"שתי חמישיות"`), אז הביטוי המלא כתוב פעם אחת, בדיוק כמו שכבר נכתב ונבדק.
 */
const NON_UNIT_FRACTIONS: [string, number, number][] = [
  ["שלושה רבעים", 3, 4],
  ["שתי חמישיות", 2, 5],
  ["שני שלישים", 2, 3],
  ["שלוש שמיניות", 3, 8],
  ["ארבע חמישיות", 4, 5],
  ["חמש שישיות", 5, 6],
];

const UNIT_ANALOGIES = [
  (name: string, whole: number) => `פיצה של ${whole} פרוסות שמחלקים ל${name}`,
  (name: string, whole: number) => `${whole} גולות שמתחלקות ל${name}`,
  (name: string, whole: number) => `חפיסת שוקולד של ${whole} ריבועים שנשברת ל${name}`,
];

function makeQuestion(
  prompt: string,
  answer: number,
  hints: [string, string],
  steps: { label: string; math?: string }[],
  analogy: string,
  rng: Rng,
): Question {
  return { id: freshId(rng), topic: "שברים פשוטים", prompt, answer, hints, steps, analogy };
}

/** Pattern 1 — a unit fraction of a number that divides evenly. */
function unitFraction(rng: Rng): Question {
  const [name, denom] = pick(UNIT_FRACTIONS, rng);
  const answer = randInt(2, 15, rng);
  const whole = answer * denom;
  return makeQuestion(
    `כמה זה ${name} מ-${whole}?`,
    answer,
    [`${name} זה לחלק ל-\`${denom}\` חלקים שווים`, `מחלקים את \`${whole}\` ל-\`${denom}\` חלקים שווים`],
    [{ label: `${name} זה לחלק ל-${denom} חלקים שווים` }, { label: "", math: `${whole} ÷ ${denom} = ${answer}` }],
    pick(UNIT_ANALOGIES, rng)(name, whole),
    rng,
  );
}

/** Pattern 2 — a non-unit fraction of a number. */
function nonUnitFraction(rng: Rng): Question {
  const [name, num, denom] = pick(NON_UNIT_FRACTIONS, rng);
  const unitValue = randInt(2, 15, rng);
  const whole = unitValue * denom;
  const answer = unitValue * num;
  return makeQuestion(
    `כמה זה ${name} מ-${whole}?`,
    answer,
    [`${name} זה לחלק ל-\`${denom}\` חלקים שווים ולקחת \`${num}\` מהם`, `קודם מחלקים את \`${whole}\` ל-\`${denom}\`, ואז לוקחים \`${num}\` כאלה`],
    [
      { label: `קודם חלק אחד:`, math: `${whole} ÷ ${denom} = ${unitValue}` },
      { label: `ואז ${num} כאלה:`, math: `${unitValue} × ${num} = ${answer}` },
    ],
    `${whole} שקל שמחלקים ל-${denom} חלקים, ולוקחים ${num} מהם`,
    rng,
  );
}

/** Pattern 3 — how many parts fit in N whole units (e.g. "כמה רבעים יש בשני שלמים"). */
function partsInWholes(rng: Rng): Question {
  const denom = pick([2, 3, 4, 5], rng);
  const wholes = randInt(2, 5, rng);
  const answer = denom * wholes;
  const partName = denom === 2 ? "חצאים" : denom === 3 ? "שלישים" : denom === 4 ? "רבעים" : "חמישיות";
  return makeQuestion(
    `כמה ${partName} יש ב-${wholes} שלמים?`,
    answer,
    [`קודם סופרים כמה ${partName} יש בשלם אחד`, `בכל שלם יש \`${denom}\` ${partName}, ויש \`${wholes}\` שלמים`],
    [{ label: `בכל שלם יש ${denom} ${partName}` }, { label: "", math: `${denom} × ${wholes} = ${answer}` }],
    `${wholes} עוגות שכל אחת חתוכה ל-${denom} חלקים`,
    rng,
  );
}

/** Pattern 4 — adding two different fractions of the same whole (e.g. "חצי מ-40 ועוד
 *  רבע מ-40"), both dividing the whole evenly. */
function sumOfTwoFractions(rng: Rng): Question {
  const [nameA, denomA] = pick(UNIT_FRACTIONS, rng);
  const [nameB, denomB] = pick(
    UNIT_FRACTIONS.filter(([, d]) => d !== denomA),
    rng,
  );
  const lcm = (denomA * denomB) / gcd(denomA, denomB);
  const whole = lcm * randInt(1, 5, rng);
  const partA = whole / denomA;
  const partB = whole / denomB;
  const answer = partA + partB;
  return makeQuestion(
    `${nameA} מ-${whole} ועוד ${nameB} מ-${whole}. כמה יחד?`,
    answer,
    ["מחשבים כל חלק בנפרד ואז מחברים", `${nameA} מ-\`${whole}\` הוא \`${partA}\`, ו${nameB} מ-\`${whole}\` הוא \`${partB}\``],
    [
      { label: `ה${nameA}:`, math: `${whole} ÷ ${denomA} = ${partA}` },
      { label: `ה${nameB}:`, math: `${whole} ÷ ${denomB} = ${partB}` },
      { label: "ביחד:", math: `${partA} + ${partB} = ${answer}` },
    ],
    `${whole} דקות מסך: ${nameA} בבוקר ו${nameB} אחר הצהריים`,
    rng,
  );
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Pattern 5 — how many parts fit in a whole-and-a-fraction (e.g. "כמה רבעים יש בשני
 *  שלמים וחצי"). */
function partsInWholeAndHalf(rng: Rng): Question {
  const denom = pick([2, 4, 6, 8], rng);
  const wholes = randInt(1, 4, rng);
  const partName = denom === 2 ? "חצאים" : denom === 4 ? "רבעים" : denom === 6 ? "שישיות" : "שמיניות";
  const halfInParts = denom / 2;
  const answer = denom * wholes + halfInParts;
  return makeQuestion(
    `כמה ${partName} יש ב-${wholes} שלמים וחצי?`,
    answer,
    [`קודם סופרים כמה ${partName} יש בשלם אחד`, `בכל שלם יש \`${denom}\` ${partName}, ובחצי יש \`${halfInParts}\``],
    [
      { label: `בכל שלם יש ${denom} ${partName}:`, math: `${wholes} × ${denom} = ${denom * wholes}` },
      { label: `ובחצי יש עוד ${halfInParts}` },
      { label: "ביחד:", math: `${denom * wholes} + ${halfInParts} = ${answer}` },
    ],
    `${wholes} פיצות וחצי שחותכים כל אחת ל-${denom} - כמה פרוסות יצאו`,
    rng,
  );
}

export function generateFractionsQuestion(difficulty: number, rng: Rng = Math.random): Question {
  return withoutLeakingHints(() => {
    switch (Math.min(5, Math.max(1, Math.round(difficulty)))) {
      case 1:
        return unitFraction(rng);
      case 2:
        return nonUnitFraction(rng);
      case 3:
        return partsInWholes(rng);
      case 4:
        return sumOfTwoFractions(rng);
      default:
        return partsInWholeAndHalf(rng);
    }
  });
}

export const FRACTIONS_MIN_DIFFICULTY = 1;
export const FRACTIONS_MAX_DIFFICULTY = 5;
export const FRACTIONS_INITIAL_DIFFICULTY = 1;
export const FRACTIONS_QUESTION_COUNT = 20;

export function nextFractionsDifficulty(current: number, wasCorrect: boolean, streak: number): number {
  if (!wasCorrect) return Math.max(FRACTIONS_MIN_DIFFICULTY, current - 1);
  return streak >= 2 ? Math.min(FRACTIONS_MAX_DIFFICULTY, current + 1) : current;
}
