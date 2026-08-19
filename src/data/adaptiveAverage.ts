import type { Question } from "./curriculum";
import { type Rng, randInt, makeFreshId, withoutLeakingHints, wantsDecimal, round2 } from "./adaptiveHelpers";

/**
 * "ממוצע" (רותם, כיתה ו׳), built at runtime — see
 * docs/features/levels-as-practice/architecture.md.
 *
 * Five patterns read directly off the 30 written questions in `grade6.ts`: the average of
 * two numbers, of three, of four, "the average is M — what's the sum", and "the average is
 * M and one value is known — what's the other".
 */

const freshId = makeFreshId("g6-average-adaptive");

function makeQuestion(
  prompt: string,
  answer: number,
  hints: [string, string],
  steps: { label: string; math?: string }[],
  analogy: string,
  rng: Rng,
): Question {
  return { id: freshId(rng), topic: "ממוצע", prompt, answer, hints, steps, analogy };
}

/** Pattern 1 — average of two numbers (sum kept even for a clean average). */
function averageOfTwo(rng: Rng): Question {
  const answer = randInt(3, 40, rng);
  const gap = randInt(1, answer - 1, rng) * 2;
  const a = answer - gap / 2;
  const b = answer + gap / 2;
  return makeQuestion(
    `הממוצע של ${a} ושל ${b}`,
    answer,
    ["ממוצע הוא הסכום, חלקי כמה מספרים יש", `מחברים את שני המספרים, ואז מחלקים ב-\`2\``],
    [{ label: "מחברים:", math: `${a} + ${b} = ${a + b}` }, { label: "מחלקים:", math: `${a + b} ÷ 2 = ${answer}` }],
    `שני מבחנים, ${a} ו-${b}`,
    rng,
  );
}

/** Pattern 2 — average of three numbers (sum kept divisible by 3). */
function averageOfThree(rng: Rng): Question {
  const answer = randInt(3, 30, rng);
  const d1 = randInt(1, answer - 1, rng);
  const d2 = randInt(1, answer - 1, rng);
  const a = answer - d1;
  const c = answer + d2;
  const b = 3 * answer - a - c;
  return makeQuestion(
    `הממוצע של ${a}, ${b} ו-${c}`,
    answer,
    ["ממוצע הוא הסכום, חלקי כמה מספרים יש", "מחברים את כל `3` המספרים, ואז מחלקים ב-`3`"],
    [
      { label: "מחברים:", math: `${a} + ${b} + ${c} = ${a + b + c}` },
      { label: "מחלקים:", math: `${a + b + c} ÷ 3 = ${answer}` },
    ],
    `שלושה מבחנים: ${a}, ${b} ו-${c}`,
    rng,
  );
}

/** Pattern 3 — average of four numbers (sum kept divisible by 4). */
function averageOfFour(rng: Rng): Question {
  const answer = randInt(3, 25, rng);
  const offsets = [randInt(1, answer - 1, rng), randInt(1, answer - 1, rng), randInt(1, 20, rng)];
  const a = answer - offsets[0];
  const b = answer + offsets[1];
  const c = answer - Math.min(offsets[2], answer - 1);
  const d = 4 * answer - a - b - c;
  return makeQuestion(
    `הממוצע של ${a}, ${b}, ${c} ו-${d}`,
    answer,
    ["ממוצע הוא הסכום, חלקי כמה מספרים יש", "מחברים את כל `4` המספרים, ואז מחלקים ב-`4`"],
    [
      { label: "מחברים:", math: `${a} + ${b} + ${c} + ${d} = ${a + b + c + d}` },
      { label: "מחלקים בארבע:", math: `${a + b + c + d} ÷ 4 = ${answer}` },
    ],
    `ארבעה ימים של אימון: ${a}, ${b}, ${c} ו-${d} סיבובים`,
    rng,
  );
}

/** Pattern 4 — "the average of N numbers is M — what's their sum?" A ~30% share give
 *  `avg` a `.5` — multiplied by the integer `count`, the sum keeps at most one decimal
 *  digit. */
function sumFromAverage(rng: Rng): Question {
  const count = randInt(2, 10, rng);
  const decimal = wantsDecimal(rng);
  const avg = randInt(3, 30, rng) + (decimal ? 0.5 : 0);
  const answer = round2(count * avg);
  return makeQuestion(
    `הממוצע של ${count} מספרים הוא ${avg}. מה הסכום שלהם?`,
    answer,
    ["אם הממוצע הוא הסכום חלקי הכמות, אז הסכום הוא הממוצע כפול הכמות", `\`${avg}\` כפול \`${count}\``],
    [{ label: "הסכום הוא ממוצע כפול כמות" }, { label: "", math: `${avg} × ${count} = ${answer}` }],
    `${count} מבחנים בממוצע ${avg} נקודות - כמה נקודות בסך הכל`,
    rng,
  );
}

/** Pattern 5 — "the average of two numbers is M and one of them is A — what's the other?"
 *  A ~30% share give `a` a `.5` instead of `avg` — that keeps `avg × 2` a clean integer,
 *  so only the final subtraction carries the decimal digit. */
function missingValue(rng: Rng): Question {
  const avg = randInt(4, 30, rng);
  const decimal = wantsDecimal(rng);
  const a = randInt(1, avg * 2 - 1, rng) + (decimal ? 0.5 : 0);
  const answer = round2(avg * 2 - a);
  return makeQuestion(
    `הממוצע של 2 מספרים הוא ${avg} ואחד מהם ${a}. מה השני?`,
    answer,
    ["סכום השניים הוא הממוצע כפול `2`", `\`${avg}\` כפול \`2\` נותן את הסכום. מורידים ממנו \`${a}\``],
    [
      { label: "הסכום:", math: `${avg} × 2 = ${avg * 2}` },
      { label: "השני:", math: `${avg * 2} − ${a} = ${answer}` },
    ],
    `שתי קניות בממוצע ${avg} שקל, כשהאחת הייתה ${a}`,
    rng,
  );
}

export function generateAverageQuestion(difficulty: number, rng: Rng = Math.random): Question {
  return withoutLeakingHints(() => {
    switch (Math.min(5, Math.max(1, Math.round(difficulty)))) {
      case 1:
        return averageOfTwo(rng);
      case 2:
        return averageOfThree(rng);
      case 3:
        return averageOfFour(rng);
      case 4:
        return sumFromAverage(rng);
      default:
        return missingValue(rng);
    }
  });
}

export const AVERAGE_MIN_DIFFICULTY = 1;
export const AVERAGE_MAX_DIFFICULTY = 5;
export const AVERAGE_INITIAL_DIFFICULTY = 1;
export const AVERAGE_QUESTION_COUNT = 20;

export function nextAverageDifficulty(current: number, wasCorrect: boolean, streak: number): number {
  if (!wasCorrect) return Math.max(AVERAGE_MIN_DIFFICULTY, current - 1);
  return streak >= 2 ? Math.min(AVERAGE_MAX_DIFFICULTY, current + 1) : current;
}
