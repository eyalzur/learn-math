import type { Question } from "./curriculum";
import { type Rng, randInt, pick, makeFreshId, wantsDecimal, round2 } from "./adaptiveHelpers";

/**
 * "משוואות" (עומר, כיתה ח׳), built at runtime — see
 * docs/features/levels-as-practice/architecture.md.
 *
 * Five patterns read directly off the 30 written questions in `grade8.ts`: `x + A = B`,
 * `Ax = B`, `Ax + B = C`, a variable on both sides, and brackets — every generated
 * equation is built from a chosen positive integer solution `x` outward, so it always has
 * a clean answer.
 */

const freshId = makeFreshId("g8-equations-adaptive");

function makeQuestion(
  prompt: string,
  answer: number,
  hints: [string, string],
  steps: { label: string; math?: string }[],
  analogy: string,
  rng: Rng,
): Question {
  return { id: freshId(rng), topic: "משוואות", prompt, answer, hints, steps, analogy };
}

/** Pattern 1 — `x + A = B` or `x − A = B`. */
function additiveEquation(rng: Rng): Question {
  const x = randInt(3, 20, rng);
  const a = randInt(1, 15, rng);
  const isPlus = rng() < 0.5;
  const c = isPlus ? x + a : x - a;
  const prompt = isPlus ? `x + ${a} = ${c}` : `x − ${a} = ${c}`;
  return makeQuestion(
    prompt,
    x,
    [
      "משוואה היא כמו מאזניים מאוזנים: כל פעולה שעושים בצד אחד, חייבים לעשות גם בצד השני",
      isPlus ? `מורידים \`${a}\` משני האגפים` : `מוסיפים \`${a}\` לשני האגפים`,
    ],
    [
      { label: `מעבירים את ה-${a} לצד השני ומשנים סימן` },
      { label: "", math: isPlus ? `x = ${c} − ${a}` : `x = ${c} + ${a}` },
      { label: "", math: `x = ${x}` },
    ],
    isPlus
      ? `חסכת סכום כלשהו, קיבלת עוד ${a} שקל ועכשיו יש לך ${c} — כמה חסכת מלכתחילה?`
      : `היה לך סכום כלשהו, הוצאת ${a} ונשארו לך ${c} — כמה היה לך מלכתחילה?`,
    rng,
  );
}

/** Pattern 2 — `Ax = B`. */
function multiplicativeEquation(rng: Rng): Question {
  const x = randInt(2, 12, rng);
  const a = randInt(2, 9, rng);
  const b = a * x;
  return makeQuestion(
    `${a}x = ${b}`,
    x,
    ["כדי לבודד את `x` מחלקים במקדם שלו", `מחלקים את שני האגפים ב-\`${a}\``],
    [{ label: "מחלקים את שני האגפים:", math: `x = ${b} ÷ ${a}` }, { label: "", math: `x = ${x}` }],
    `${a} כרטיסים באותו מחיר עלו ${b} שקל — כמה עלה כרטיס אחד?`,
    rng,
  );
}

/** Pattern 3 — `Ax + B = C` (two steps). */
function twoStepEquation(rng: Rng): Question {
  const x = randInt(2, 15, rng);
  const a = randInt(2, 8, rng);
  const isPlus = rng() < 0.5;
  const b = randInt(1, 15, rng);
  const c = isPlus ? a * x + b : a * x - b;
  const op = isPlus ? "+" : "−";
  return makeQuestion(
    `${a}x ${op} ${b} = ${c}`,
    x,
    ["קודם מסלקים את המספר החופשי, ורק אז מחלקים במקדם", isPlus ? `מורידים \`${b}\` משני האגפים, ואז מחלקים ב-\`${a}\`` : `מוסיפים \`${b}\` לשני האגפים, ואז מחלקים ב-\`${a}\``],
    [
      { label: `מעבירים את ה-${b}:`, math: isPlus ? `${a}x = ${c} − ${b}` : `${a}x = ${c} + ${b}` },
      { label: `מחלקים ב-${a}:`, math: `x = ${x}` },
    ],
    `${a} חבילות זהות ${isPlus ? "ועוד" : "שמהן הורדת"} ${b} פריטים בודדים, יחד ${c} — כמה פריטים בכל חבילה?`,
    rng,
  );
}

/** Pattern 4 — variable on both sides: `Ax + B = Cx + D`. */
function bothSidesEquation(rng: Rng): Question {
  const x = randInt(2, 12, rng);
  const c = randInt(1, 6, rng);
  const a = c + randInt(1, 5, rng); // a > c so the x-terms don't cancel
  const gap = (a - c) * x;
  const b = randInt(1, 20, rng); // the free term on the A side, kept small and positive
  const d = b + gap; // solved so D = B + (A − C)·x, which makes x the solution
  return makeQuestion(
    `${a}x + ${b} = ${c}x + ${d}`,
    x,
    ["מרכזים את המשתנים באגף אחד ואת המספרים בשני", `מעבירים \`${c}x\` שמאלה ו-\`${b}\` ימינה`],
    [
      { label: "מעבירים את ה-x לצד אחד:", math: `${a}x − ${c}x = ${a - c}x` },
      { label: "ואת המספרים לשני:", math: `${d} − ${b} = ${d - b}` },
      { label: `מחלקים ב-${a - c}:`, math: `x = ${x}` },
    ],
    `שתי תוכניות מחיר שמגיעות לאותו סכום אחרי כמות מסוימת של יחידות — אחרי כמה יחידות זה קורה?`,
    rng,
  );
}

/** Pattern 5 — brackets: `A(x + B) = C`, where the two sides share a common factor. `c` is
 *  always whole — it is a given number shown directly in the prompt, and a question never
 *  shows a decimal among its own givens; only the answer (`x`) may land on one. A ~30%
 *  share give `x` a `.5`, restricted to an even `a` so `a × (x + b)` stays exactly whole
 *  regardless of x's half. */
function bracketsEquation(rng: Rng): Question {
  const decimal = wantsDecimal(rng);
  const x = randInt(2, 12, rng) + (decimal ? 0.5 : 0);
  const a = decimal ? pick([2, 4, 6] as const, rng) : randInt(2, 6, rng);
  const b = randInt(1, 10, rng);
  const c = round2(a * (x + b));
  return makeQuestion(
    `${a}(x + ${b}) = ${c}`,
    x,
    [
      "מחפשים את הדרך הכי פשוטה לפתור: אם שני האגפים מתחלקים באותו מספר, עדיף לחלק קודם — לפני שפותחים סוגריים",
      `מחלקים את שני האגפים ב-\`${a}\`, ואז מורידים \`${b}\``,
    ],
    [
      { label: `מחלקים ב-${a}:`, math: `x + ${b} = ${x + b}` },
      { label: `מעבירים את ה-${b}:`, math: `x = ${x + b} − ${b}` },
      { label: "", math: `x = ${x}` },
    ],
    `${a} חבילות זהות שבכל אחת אותו מספר פריטים ועוד ${b} מתנות, בסך הכל ${c} — כמה פריטים בכל חבילה?`,
    rng,
  );
}

export function generateEquationsQuestion(difficulty: number, rng: Rng = Math.random): Question {
  switch (Math.min(5, Math.max(1, Math.round(difficulty)))) {
    case 1:
      return additiveEquation(rng);
    case 2:
      return multiplicativeEquation(rng);
    case 3:
      return twoStepEquation(rng);
    case 4:
      return bothSidesEquation(rng);
    default:
      return bracketsEquation(rng);
  }
}

export const EQUATIONS_MIN_DIFFICULTY = 1;
export const EQUATIONS_MAX_DIFFICULTY = 5;
export const EQUATIONS_INITIAL_DIFFICULTY = 1;
export const EQUATIONS_QUESTION_COUNT = 20;

export function nextEquationsDifficulty(current: number, wasCorrect: boolean, streak: number): number {
  if (!wasCorrect) return Math.max(EQUATIONS_MIN_DIFFICULTY, current - 1);
  return streak >= 2 ? Math.min(EQUATIONS_MAX_DIFFICULTY, current + 1) : current;
}
