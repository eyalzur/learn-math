import type { Question } from "./curriculum";
import { type Rng, randInt, pick, makeFreshId, sup, withoutLeakingHints } from "./adaptiveHelpers";

/**
 * "חזקות ושורשים" (עומר, כיתה ח׳), built at runtime — see
 * docs/features/levels-as-practice/architecture.md.
 *
 * Five patterns read directly off the 30 written questions in `grade8.ts`: squaring,
 * cubing, a perfect-square root, multiplying two powers of the same base, and a
 * power-of-a-power or dividing two powers of the same base.
 */

const freshId = makeFreshId("g8-powers-adaptive");

function makeQuestion(
  prompt: string,
  answer: number,
  hints: [string, string],
  steps: { label: string; math?: string }[],
  analogy: string,
  rng: Rng,
): Question {
  return { id: freshId(rng), topic: "חזקות ושורשים", prompt, answer, hints, steps, analogy };
}

/** Pattern 1 — squaring a small base. */
function square(rng: Rng): Question {
  const base = randInt(2, 9, rng);
  const answer = base * base;
  return makeQuestion(
    `${base}²`,
    answer,
    ["חזקה היא כפל חוזר של הבסיס בעצמו", `\`${base}\` כפול \`${base}\``],
    [{ label: `${base} בריבוע זה ${base} כפול ${base}` }, { label: "", math: `${base} × ${base} = ${answer}` }],
    `ריבוע שצלעו ${base} משבצות`,
    rng,
  );
}

/** Pattern 2 — cubing a small base. */
function cube(rng: Rng): Question {
  const base = randInt(2, 8, rng);
  const answer = base * base * base;
  return makeQuestion(
    `${base}³`,
    answer,
    ["חזקה היא כפל חוזר של הבסיס בעצמו", `\`${base}\` כפול \`${base}\` כפול \`${base}\``],
    [{ label: "כפל חוזר שלוש פעמים" }, { label: "", math: `${base} × ${base} × ${base} = ${answer}` }],
    `קובייה שצלעה ${base} יחידות`,
    rng,
  );
}

/** Pattern 3 — the root of a perfect square. */
function squareRoot(rng: Rng): Question {
  const answer = randInt(2, 20, rng);
  const n = answer * answer;
  return makeQuestion(
    `√${n}`,
    answer,
    ["שורש שואל איזה מספר כפול עצמו נותן את המספר שבפנים", `מחפשים מספר שכפול עצמו נותן \`${n}\``],
    [{ label: `מחפשים מספר שכפול עצמו נותן ${n}` }, { label: "", math: `${answer} × ${answer} = ${n}` }],
    `ריבוע ששטחו ${n} משבצות`,
    rng,
  );
}

/** Pattern 4 — multiplying two powers of the same base: `Aᵐ × Aⁿ`. */
function multiplySamePowers(rng: Rng): Question {
  const base = randInt(2, 5, rng);
  const m = randInt(2, 3, rng);
  const n = randInt(2, 3, rng);
  const answer = base ** (m + n);
  return makeQuestion(
    `${base}${sup(m)} × ${base}${sup(n)}`,
    answer,
    ["בכפל חזקות של אותו בסיס, מחברים את המעריכים", `\`${m}\` ועוד \`${n}\` מעריכים, על בסיס \`${base}\``],
    [
      { label: "מחברים את המעריכים:", math: `${m} + ${n} = ${m + n}` },
      { label: "", math: `${base}${sup(m + n)} = ${answer}` },
    ],
    `מכפילים פי ${base ** m} ואז פי ${base ** n}`,
    rng,
  );
}

/** Pattern 5 — power-of-a-power or dividing two powers of the same base. */
function powerOfPowerOrDivide(rng: Rng): Question {
  const base = randInt(2, 5, rng);
  const kind = pick(["powerOfPower", "divide"] as const, rng);

  if (kind === "powerOfPower") {
    // Kept so the product m*n never exceeds 6 — the largest exponent this file has a
    // superscript glyph for (see `sup` in adaptiveHelpers.ts).
    const m = randInt(2, 3, rng);
    const n = m === 3 ? 2 : randInt(2, 3, rng);
    const answer = base ** (m * n);
    return makeQuestion(
      `(${base}${sup(m)})${sup(n)}`,
      answer,
      ["חזקה של חזקה — כופלים את המעריכים", `\`${m}\` כפול \`${n}\` מעריכים, על בסיס \`${base}\``],
      [
        { label: "בהעלאת חזקה בחזקה מכפילים את המעריכים" },
        { label: "", math: `(${base}${sup(m)})${sup(n)} = ${base}${sup(m * n)}` },
        { label: "", math: `${base}${sup(m * n)} = ${answer}` },
      ],
      `קופסה של ${base ** m} קוביות, ואז ${base ** m} קופסאות כאלה`,
      rng,
    );
  }

  // n and the difference m−n both appear as exponents in the prompt/steps, so both stay
  // at least 2 — `sup()` only has glyphs for exponents 2–6.
  const n = randInt(2, 3, rng);
  const diff = randInt(2, 3, rng);
  const m = n + diff;
  const answer = base ** diff;
  return makeQuestion(
    `${base}${sup(m)} ÷ ${base}${sup(n)}`,
    answer,
    ["בחילוק חזקות של אותו בסיס, מחסרים את המעריכים", `\`${m}\` פחות \`${n}\` מעריכים, על בסיס \`${base}\``],
    [
      { label: "בחילוק חזקות עם אותו בסיס מחסרים את המעריכים" },
      { label: "", math: `${m} − ${n} = ${m - n}` },
      { label: "", math: `${base}${sup(m - n)} = ${answer}` },
    ],
    `נפח אחסון שמצטמצם בכל פעם לחלק מ-${base}, ${m - n} פעמים`,
    rng,
  );
}

export function generatePowersQuestion(difficulty: number, rng: Rng = Math.random): Question {
  return withoutLeakingHints(() => {
    switch (Math.min(5, Math.max(1, Math.round(difficulty)))) {
      case 1:
        return square(rng);
      case 2:
        return cube(rng);
      case 3:
        return squareRoot(rng);
      case 4:
        return multiplySamePowers(rng);
      default:
        return powerOfPowerOrDivide(rng);
    }
  });
}

export const POWERS_MIN_DIFFICULTY = 1;
export const POWERS_MAX_DIFFICULTY = 5;
export const POWERS_INITIAL_DIFFICULTY = 1;
export const POWERS_QUESTION_COUNT = 20;

export function nextPowersDifficulty(current: number, wasCorrect: boolean, streak: number): number {
  if (!wasCorrect) return Math.max(POWERS_MIN_DIFFICULTY, current - 1);
  return streak >= 2 ? Math.min(POWERS_MAX_DIFFICULTY, current + 1) : current;
}
