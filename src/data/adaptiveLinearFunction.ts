import type { Question } from "./curriculum";
import { type Rng, randInt, pick, makeFreshId } from "./adaptiveHelpers";

/**
 * "פונקציה קווית" (עומר, כיתה ח׳), built at runtime — see
 * docs/features/levels-as-practice/architecture.md.
 *
 * Five patterns read directly off the 30 written questions in `grade8.ts`: evaluating
 * `y` from `x`, evaluating with a subtraction, reading off the slope, reading off the
 * y-intercept, and solving for `x` given `y` — every expression wrapped in backticks so
 * it renders isolated inside the Hebrew sentence, same as the written questions.
 */

const freshId = makeFreshId("g8-linear-adaptive");

function makeQuestion(
  prompt: string,
  answer: number,
  hints: [string, string],
  steps: { label: string; math?: string }[],
  analogy: string,
  rng: Rng,
): Question {
  return { id: freshId(rng), topic: "פונקציה קווית", prompt, answer, hints, steps, analogy };
}

/** Pattern 1 — evaluate `y = Ax + B` at a given `x`. */
function evaluateAdd(rng: Rng): Question {
  const a = randInt(2, 7, rng);
  const b = randInt(1, 12, rng);
  const x = randInt(2, 9, rng);
  const answer = a * x + b;
  return makeQuestion(
    `בפונקציה \`y = ${a}x + ${b}\`, מה הערך של \`y\`, כאשר \`x\` שווה ל-\`${x}\`?`,
    answer,
    ["מציבים את הערך של `x` ומחשבים", `\`${a}\` כפול \`${x}\`, ועוד \`${b}\``],
    [{ label: `מציבים ${x} במקום x` }, { label: "", math: `${a} × ${x} + ${b} = ${answer}` }],
    `מונית שגובה ${b} שקל דמי פתיחה ועוד ${a} שקלים לקילומטר, ל-${x} קילומטרים`,
    rng,
  );
}

/** Pattern 2 — evaluate `y = Ax − B` at a given `x` (answer kept positive). */
function evaluateSubtract(rng: Rng): Question {
  const a = randInt(2, 7, rng);
  const x = randInt(3, 9, rng);
  const b = randInt(1, a * x - 1, rng);
  const answer = a * x - b;
  return makeQuestion(
    `בפונקציה \`y = ${a}x − ${b}\`, מה הערך של \`y\`, כאשר \`x\` שווה ל-\`${x}\`?`,
    answer,
    ["מציבים את הערך של `x` ומחשבים", `\`${a}\` כפול \`${x}\`, ואז פחות \`${b}\``],
    [
      { label: `מציבים ${x} במקום x` },
      { label: "", math: `${a} × ${x} = ${a * x}` },
      { label: "", math: `${a * x} − ${b} = ${answer}` },
    ],
    `${a} שקל לכל שעת חנייה, פחות ${b} שקל הנחה, ל-${x} שעות`,
    rng,
  );
}

/** Pattern 3 — read the slope off `y = Ax + B`, sometimes negative. */
function readSlope(rng: Rng): Question {
  const negative = rng() < 0.4;
  const magnitude = randInt(2, 9, rng);
  const a = negative ? -magnitude : magnitude;
  const b = randInt(1, 12, rng);
  const slopeText = negative ? `−${magnitude}` : `${magnitude}`;
  return makeQuestion(
    `מה השיפוע של הישר \`y = ${slopeText}x + ${b}\`?`,
    a,
    ["השיפוע הוא המספר שצמוד ל-`x`, כולל הסימן שלפניו", "מסתכלים רק על מה שכופל את `x`"],
    [{ label: "השיפוע הוא המקדם של x, כולל הסימן" }, { label: "", math: `${slopeText}` }],
    negative ? `מדרון שיורד ${magnitude} מטרים על כל מטר קדימה` : `מדרגות שכל אחת מעלה ${magnitude} סנטימטרים`,
    rng,
  );
}

/** Pattern 4 — read the y-intercept off `y = Ax + B`. */
function readIntercept(rng: Rng): Question {
  const a = randInt(2, 9, rng);
  const b = randInt(1, 20, rng);
  return makeQuestion(
    `מה החותך עם ציר \`y\` בישר \`y = ${a}x + ${b}\`?`,
    b,
    ["החותך עם ציר `y` הוא הערך שמתקבל כאשר `x` שווה `0`", "מציבים `0` במקום `x` ורואים מה נשאר"],
    [
      { label: "מציבים אפס במקום x" },
      { label: "", math: `${a} × 0 = 0` },
      { label: "", math: `0 + ${b} = ${b}` },
    ],
    `כמה כסף היה בחשבון עוד לפני שהתחילו לחסוך, אם קצב החיסכון הוא ${a} שקל בשבוע`,
    rng,
  );
}

/** Pattern 5 — solve for `x` given `y`, built from a chosen integer solution outward. */
function solveForX(rng: Rng): Question {
  const a = randInt(2, 6, rng);
  const b = randInt(1, 15, rng);
  const x = randInt(2, 10, rng);
  const isPlus = rng() < 0.5;
  const y = isPlus ? a * x + b : a * x - b;
  const op = isPlus ? "+" : "−";
  return makeQuestion(
    `הישר \`y = ${a}x ${op} ${b}\` עובר בנקודה שבה \`y\` שווה \`${y}\`. מה הערך של \`x\`?`,
    x,
    ["מציבים את הערך של `y` ופותרים את המשוואה שנשארת", isPlus ? `\`${y}\` שווה \`${a}x\` ועוד \`${b}\`. קודם מורידים \`${b}\`` : `\`${y}\` שווה \`${a}x\` פחות \`${b}\`. קודם מוסיפים \`${b}\``],
    [
      { label: `מציבים ${y} במקום y:`, math: isPlus ? `${y} = ${a}x + ${b}` : `${y} = ${a}x − ${b}` },
      { label: "מעבירים:", math: isPlus ? `${a}x = ${y} − ${b}` : `${a}x = ${y} + ${b}` },
      { label: "", math: `x = ${x}` },
    ],
    pick(
      [
        (n: number) => `חיסכון שמתחיל ב-${b} שקל ועולה ב-${a} בכל שבוע, עד שהגיע ל-${n}`,
        (n: number) => `מנוי שגובה ${b} שקל בסיס ועוד ${a} שקל ליחידה, עד שהגיע ל-${n}`,
      ],
      rng,
    )(y),
    rng,
  );
}

export function generateLinearFunctionQuestion(difficulty: number, rng: Rng = Math.random): Question {
  switch (Math.min(5, Math.max(1, Math.round(difficulty)))) {
    case 1:
      return evaluateAdd(rng);
    case 2:
      return evaluateSubtract(rng);
    case 3:
      return readSlope(rng);
    case 4:
      return readIntercept(rng);
    default:
      return solveForX(rng);
  }
}

export const LINEAR_FUNCTION_MIN_DIFFICULTY = 1;
export const LINEAR_FUNCTION_MAX_DIFFICULTY = 5;
export const LINEAR_FUNCTION_INITIAL_DIFFICULTY = 1;
export const LINEAR_FUNCTION_QUESTION_COUNT = 20;

export function nextLinearFunctionDifficulty(current: number, wasCorrect: boolean, streak: number): number {
  if (!wasCorrect) return Math.max(LINEAR_FUNCTION_MIN_DIFFICULTY, current - 1);
  return streak >= 2 ? Math.min(LINEAR_FUNCTION_MAX_DIFFICULTY, current + 1) : current;
}
