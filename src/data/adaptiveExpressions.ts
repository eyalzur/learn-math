import type { Question } from "./curriculum";
import { type Rng, randInt, pick, makeFreshId } from "./adaptiveHelpers";

/**
 * "ביטויים אלגבריים" (עומר, כיתה ח׳), built at runtime — see
 * docs/features/levels-as-practice/architecture.md.
 *
 * Five patterns read directly off the 30 written questions in `grade8.ts`: substituting
 * into a linear expression, combining like terms, opening brackets, substituting into a
 * squared expression, and opening brackets then combining — every algebraic run wrapped
 * in backticks so it renders isolated inside the Hebrew sentence, exactly like the written
 * questions (see the direction note at the top of `grade8.ts`).
 */

const freshId = makeFreshId("g8-expressions-adaptive");
const VARS = ["x", "y"] as const;

function makeQuestion(
  prompt: string,
  answer: number,
  hints: [string, string],
  steps: { label: string; math?: string }[],
  analogy: string,
  rng: Rng,
): Question {
  return { id: freshId(rng), topic: "ביטויים אלגבריים", prompt, answer, hints, steps, analogy };
}

/** Pattern 1 — substitution into `Ax + B`. */
function linearSubstitution(rng: Rng): Question {
  const v = pick(VARS, rng);
  const a = randInt(2, 6, rng);
  const b = randInt(1, 12, rng);
  const x = randInt(2, 9, rng);
  const answer = a * x + b;
  return makeQuestion(
    `כמה זה \`${a}${v} + ${b}\` כאשר \`${v}\` שווה ${x}?`,
    answer,
    ["מציבים את המספר במקום המשתנה ואז מחשבים", `\`${a}\` כפול \`${x}\`, ואז מוסיפים \`${b}\``],
    [{ label: `מציבים ${x} במקום ${v}` }, { label: "", math: `${a} × ${x} + ${b} = ${answer}` }],
    `כרטיס עולה ${a} שקל ליחידה ועוד ${b} שקל דמי טיפול, עבור ${x} יחידות — כמה זה עולה בסך הכל?`,
    rng,
  );
}

/** Pattern 2 — combining like terms, addition or subtraction. */
function combineLikeTerms(rng: Rng): Question {
  const v = pick(VARS, rng);
  const isAdd = rng() < 0.5;
  const a = randInt(2, 9, rng);
  const b = isAdd ? randInt(2, 9, rng) : randInt(1, a - 1, rng);
  const answer = isAdd ? a + b : a - b;
  const op = isAdd ? "+" : "−";
  return makeQuestion(
    `כנסו איברים: \`${a}${v} ${op} ${b}${v}\`. מה המקדם של \`${v}\`?`,
    answer,
    ["אוספים יחד רק איברים עם אותו משתנה", `\`${a}\` ${isAdd ? "ועוד" : "פחות"} \`${b}\` מאותו סוג`],
    [{ label: "איברים מאותו סוג" }, { label: "", math: `${a} ${op} ${b} = ${answer}` }],
    isAdd
      ? `${a} שקיות ועוד ${b} שקיות מאותו סוג — כמה שקיות יש בסך הכל?`
      : `${a} חבילות שמהן הוצאת ${b} מאותו סוג — כמה נשארו?`,
    rng,
  );
}

/** Pattern 3 — opening brackets: `A(x + B)`, asking for the free number. */
function openBrackets(rng: Rng): Question {
  const v = pick(VARS, rng);
  const a = randInt(2, 6, rng);
  const b = randInt(2, 9, rng);
  const answer = a * b;
  return makeQuestion(
    `פתחו סוגריים: \`${a}(${v} + ${b})\`. מה המספר החופשי?`,
    answer,
    ["כופלים את מה שמחוץ לסוגריים בכל אחד מהאיברים שבפנים", `המספר החופשי הוא \`${a}\` כפול \`${b}\``],
    [{ label: "כופלים בכל איבר בסוגריים" }, { label: "המספר:", math: `${a} × ${b} = ${answer}` }],
    `${a} חבילות שבכל אחת אותו פריט ועוד ${b} מדבקות — מה המספר החופשי בביטוי הפתוח?`,
    rng,
  );
}

/** Pattern 4 — substitution into `x² + B` or `Ax² + B`. `x` is always whole — it is
 *  a given number shown directly in the prompt ("כאשר x שווה..."), and a question never
 *  shows a decimal among its own givens, only the answer may land on one. Substituting a
 *  whole `x` into whole `a`/`b` with only `×`/`+` always stays whole too, so this pattern
 *  structurally cannot produce a decimal answer without decimal-izing a given instead. */
function squareSubstitution(rng: Rng): Question {
  const v = pick(VARS, rng);
  const withCoefficient = rng() < 0.5;
  const a = withCoefficient ? randInt(2, 4, rng) : 1;
  const b = randInt(1, 10, rng);
  const x = randInt(2, 8, rng);
  const xSquared = x * x;
  const answer = a * xSquared + b;
  const exprText = withCoefficient ? `${a}${v}² + ${b}` : `${v}² + ${b}`;
  return makeQuestion(
    `כמה זה \`${exprText}\` כאשר \`${v}\` שווה ${x}?`,
    answer,
    ["קודם החזקה, ורק אחריה שאר הפעולות", `\`${x}\` בריבוע הוא \`${xSquared}\`${withCoefficient ? `, כפול \`${a}\`` : ""}, ואז ועוד \`${b}\``],
    [
      { label: `מציבים ${x} במקום ${v}` },
      { label: "החזקה:", math: `${x}² = ${xSquared}` },
      { label: "", math: `${a} × ${xSquared} + ${b} = ${answer}` },
    ],
    `שטח ריבוע בצלע ${x}, ${withCoefficient ? `כפול ${a}, ` : ""}ועוד ${b} — כמה זה בסך הכל?`,
    rng,
  );
}

/** Pattern 5 — opening brackets then combining: `A(x + B) + Cx`. */
function openAndCombine(rng: Rng): Question {
  const v = pick(VARS, rng);
  const a = randInt(2, 5, rng);
  const b = randInt(1, 9, rng);
  const c = randInt(1, 6, rng);
  const answer = a + c;
  const constant = a * b;
  return makeQuestion(
    `פתחו וכנסו: \`${a}(${v} + ${b}) + ${c}${v}\`. מה המקדם של \`${v}\`?`,
    answer,
    ["קודם פותחים את הסוגריים, ורק אז אוספים", `מהסוגריים יוצא \`${a}${v}\`, ויש עוד \`${c}${v}\``],
    [
      { label: "פותחים סוגריים:", math: `${a}${v} + ${constant}` },
      { label: "מוסיפים את מה שבחוץ:", math: `${a}${v} + ${constant} + ${c}${v}` },
      { label: `מכנסים את האיברים עם ${v}:`, math: `${a} + ${c} = ${answer}` },
    ],
    `${a} חבילות זהות ועוד ${c} פריטים בודדים מאותו סוג — מה המקדם אחרי שמכנסים?`,
    rng,
  );
}

export function generateExpressionsQuestion(difficulty: number, rng: Rng = Math.random): Question {
  switch (Math.min(5, Math.max(1, Math.round(difficulty)))) {
    case 1:
      return linearSubstitution(rng);
    case 2:
      return combineLikeTerms(rng);
    case 3:
      return openBrackets(rng);
    case 4:
      return squareSubstitution(rng);
    default:
      return openAndCombine(rng);
  }
}

export const EXPRESSIONS_MIN_DIFFICULTY = 1;
export const EXPRESSIONS_MAX_DIFFICULTY = 5;
export const EXPRESSIONS_INITIAL_DIFFICULTY = 1;
export const EXPRESSIONS_QUESTION_COUNT = 20;

export function nextExpressionsDifficulty(current: number, wasCorrect: boolean, streak: number): number {
  if (!wasCorrect) return Math.max(EXPRESSIONS_MIN_DIFFICULTY, current - 1);
  return streak >= 2 ? Math.min(EXPRESSIONS_MAX_DIFFICULTY, current + 1) : current;
}
