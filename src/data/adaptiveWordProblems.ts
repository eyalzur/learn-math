import type { Question } from "./curriculum";
import { type Rng, randInt, pick, makeFreshId } from "./adaptiveHelpers";

/**
 * "בעיות מילוליות" (עומר, כיתה ח׳), built at runtime — see
 * docs/features/levels-as-practice/architecture.md.
 *
 * Five patterns read directly off the 30 written questions in `grade8.ts`: average speed,
 * price times quantity, "sum known, find the other addend", percent change, and reversing
 * a discount to find the original price.
 */

const freshId = makeFreshId("g8-word-adaptive");

const ITEM_NOUNS: [string, string][] = [
  ["חולצה", "חולצות"],
  ["ספר", "ספרים"],
  ["כרטיס", "כרטיסים"],
];

function makeQuestion(
  prompt: string,
  answer: number,
  hints: [string, string],
  steps: { label: string; math?: string }[],
  analogy: string,
  rng: Rng,
): Question {
  return { id: freshId(rng), topic: "בעיות מילוליות", prompt, answer, hints, steps, analogy };
}

/** Pattern 1 — average speed: distance ÷ time, distance a multiple of time. */
function averageSpeed(rng: Rng): Question {
  const hours = randInt(2, 6, rng);
  const speed = randInt(20, 90, rng);
  const distance = speed * hours;
  return makeQuestion(
    `מכונית נסעה ${distance} קילומטר ב-${hours} שעות. מה המהירות הממוצעת?`,
    speed,
    ["מהירות היא מרחק חלקי זמן", `\`${distance}\` חלקי \`${hours}\``],
    [{ label: "מהירות זה מרחק חלקי זמן" }, { label: "", math: `${distance} ÷ ${hours} = ${speed}` }],
    `נסיעה של ${distance} קילומטר שנמשכה ${hours} שעות`,
    rng,
  );
}

/** Pattern 2 — price times quantity. */
function priceTimesQuantity(rng: Rng): Question {
  const [singular, plural] = pick(ITEM_NOUNS, rng);
  const price = randInt(15, 80, rng);
  const count = randInt(2, 6, rng);
  const answer = price * count;
  return makeQuestion(
    `${singular} עולה ${price} שקל. כמה עולות ${count} ${plural}?`,
    answer,
    ["מחיר של כמה פריטים הוא מחיר אחד כפול הכמות", `\`${price}\` כפול \`${count}\``],
    [{ label: "מכפילים את המחיר בכמות" }, { label: "", math: `${price} × ${count} = ${answer}` }],
    `${count} ${plural} זהות בקופה`,
    rng,
  );
}

/** Pattern 3 — sum known, one addend known, find the other. */
function sumMinusOne(rng: Rng): Question {
  const b = randInt(3, 30, rng);
  const total = b + randInt(3, 30, rng);
  const answer = total - b;
  return makeQuestion(
    `סכום שני מספרים הוא ${total} ואחד מהם ${b}. מה השני?`,
    answer,
    ["אם ידוע הסכום ואחד המספרים, מחסרים אותו מהסכום", `\`${total}\` פחות \`${b}\``],
    [{ label: "מחסרים מהסכום את המספר הידוע" }, { label: "", math: `${total} − ${b} = ${answer}` }],
    `ידוע כמה כסף יש בסך הכל ובכיס אחד - כמה בשני`,
    rng,
  );
}

/** Pattern 4 — percent change (increase or decrease), kept clean by construction: `base`
 *  is always a multiple of `100 / percent`, so the change is a whole number of shekels. */
function percentChange(rng: Rng): Question {
  const percent = pick([10, 20, 25, 50] as const, rng);
  const base = randInt(2, 20, rng) * (100 / percent);
  const isIncrease = rng() < 0.5;
  const delta = (base * percent) / 100;
  const newPrice = isIncrease ? base + delta : base - delta;
  const verb = isIncrease ? "עלה" : "ירד";
  const nounForm = isIncrease ? "העלייה" : "הירידה";
  return makeQuestion(
    `מחיר ${verb} מ-${base} ל-${newPrice} שקלים. בכמה אחוזים הוא ${verb}?`,
    percent,
    ["מחשבים את גודל השינוי ומחלקים אותו במחיר המקורי", `${nounForm} היא \`${delta}\` שקלים, מתוך מחיר של \`${base}\``],
    [
      { label: `כמה ${verb}:`, math: isIncrease ? `${newPrice} − ${base} = ${delta}` : `${base} − ${newPrice} = ${delta}` },
      { label: "ביחס למחיר המקורי:", math: `${delta} ÷ ${base} = ${delta / base}` },
    ],
    `מחיר שה${isIncrease ? "תייקר" : "וזל"} ב-${percent} אחוזים`,
    rng,
  );
}

/** Pattern 5 — reverse a discount to find the original price. */
function reverseDiscount(rng: Rng): Question {
  const percent = pick([20, 25, 50] as const, rng);
  const remaining = 100 - percent;
  const divisor = percent === 25 ? 4 : percent === 50 ? 2 : 5;
  const original = randInt(2, 30, rng) * divisor;
  const paid = (original * remaining) / 100;
  return makeQuestion(
    `מוצר עולה ${paid} שקל אחרי הנחה של ${percent}%. כמה עלה לפני ההנחה?`,
    original,
    [`אחרי הנחה של \`${percent}%\` המחיר ששולם הוא \`${remaining}%\` מהמקורי`, `\`${paid}\` הם \`${remaining}%\`. כמה זה \`100%\`?`],
    [
      { label: `אחרי הנחה של ${percent}% משלמים ${remaining}% מהמחיר` },
      { label: `אחוז אחד:`, math: `${paid} ÷ ${remaining} = ${paid / remaining}` },
      { label: "ומאה אחוז:", math: `${paid / remaining} × 100 = ${original}` },
    ],
    `לחשב מחיר מקורי כשרואים רק את המחיר אחרי ההנחה`,
    rng,
  );
}

export function generateWordProblemsQuestion(difficulty: number, rng: Rng = Math.random): Question {
  switch (Math.min(5, Math.max(1, Math.round(difficulty)))) {
    case 1:
      return averageSpeed(rng);
    case 2:
      return priceTimesQuantity(rng);
    case 3:
      return sumMinusOne(rng);
    case 4:
      return percentChange(rng);
    default:
      return reverseDiscount(rng);
  }
}

export const WORD_PROBLEMS_MIN_DIFFICULTY = 1;
export const WORD_PROBLEMS_MAX_DIFFICULTY = 5;
export const WORD_PROBLEMS_INITIAL_DIFFICULTY = 1;
export const WORD_PROBLEMS_QUESTION_COUNT = 20;

export function nextWordProblemsDifficulty(current: number, wasCorrect: boolean, streak: number): number {
  if (!wasCorrect) return Math.max(WORD_PROBLEMS_MIN_DIFFICULTY, current - 1);
  return streak >= 2 ? Math.min(WORD_PROBLEMS_MAX_DIFFICULTY, current + 1) : current;
}
