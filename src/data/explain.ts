import type { Question } from "./curriculum";

/**
 * A single step of a worked solution.
 *
 * `label` (Hebrew prose) and `math` (the arithmetic) stay separate so each can be
 * rendered in its own direction. Letting the browser's bidi algorithm sort out a mixed
 * string is what produced the reversed-equation bug this app already shipped once.
 * `math` is empty for steps that are pure prose.
 */
export interface ExplanationStep {
  label: string;
  math: string;
}

const tensOf = (n: number) => Math.floor(n / 10) * 10;
const unitsOf = (n: number) => n % 10;

function countUp(from: number, steps: number): string {
  const seen: number[] = [];
  for (let i = 1; i <= steps; i++) seen.push(from + i);
  return seen.join(", ");
}

function countDown(from: number, steps: number): string {
  const seen: number[] = [];
  for (let i = 1; i <= steps; i++) seen.push(from - i);
  return seen.join(", ");
}

function explainAddition(a: number, b: number): ExplanationStep[] {
  const total = a + b;

  if (a === 0 || b === 0) {
    return [{ label: `לחבר 0 לא משנה כלום, אז התשובה היא ${total}`, math: "" }];
  }

  if (a < 10 && b < 10) {
    const bigger = Math.max(a, b);
    const smaller = Math.min(a, b);
    return [
      {
        label: `התחל מ-${bigger} וספור ${smaller} קדימה:`,
        math: countUp(bigger, smaller),
      },
    ];
  }

  const tens = tensOf(b);
  const units = unitsOf(b);

  // Adding a single digit to a two-digit number: work off the ten, mirroring how
  // subtraction below stops at the ten. Splitting b into tens/units here would
  // produce a lone "then the units" step with nothing before it.
  if (tens === 0) {
    const gap = 10 - unitsOf(a);
    if (b < gap) {
      return [{ label: "היחידות מתחברות בלי מעבר עשרת:", math: `${a} + ${b} = ${total}` }];
    }
    if (b === gap) {
      return [{ label: "זה בדיוק משלים לעשרת:", math: `${a} + ${b} = ${total}` }];
    }
    const ten = a + gap;
    return [
      { label: "קודם עד העשרת:", math: `${a} + ${gap} = ${ten}` },
      { label: `נשאר להוסיף ${b - gap}:`, math: `${ten} + ${b - gap} = ${total}` },
    ];
  }

  if (units === 0) {
    return [{ label: "חבר את העשרות:", math: `${a} + ${tens} = ${total}` }];
  }

  return [
    { label: "קודם העשרות:", math: `${a} + ${tens} = ${a + tens}` },
    { label: "אחר כך היחידות:", math: `${a + tens} + ${units} = ${total}` },
  ];
}

function explainSubtraction(a: number, b: number): ExplanationStep[] {
  const result = a - b;

  if (b === 0) {
    return [{ label: `להחסיר 0 לא משנה כלום, אז התשובה היא ${result}`, math: "" }];
  }

  if (b >= 10) {
    const tens = tensOf(b);
    const units = unitsOf(b);
    if (units === 0) {
      return [{ label: "החסר את העשרות:", math: `${a} − ${tens} = ${result}` }];
    }
    return [
      { label: "קודם העשרות:", math: `${a} − ${tens} = ${a - tens}` },
      { label: "אחר כך היחידות:", math: `${a - tens} − ${units} = ${result}` },
    ];
  }

  const units = unitsOf(a);
  if (a > 10 && b > units) {
    const ten = a - units;
    const rest = b - units;
    return [
      { label: "קודם עד העשרת:", math: `${a} − ${units} = ${ten}` },
      { label: `נשאר להוריד ${rest}:`, math: `${ten} − ${rest} = ${result}` },
    ];
  }

  return [
    { label: `התחל מ-${a} וספור ${b} אחורה:`, math: countDown(a, b) },
  ];
}

function explainMultiplication(a: number, b: number): ExplanationStep[] {
  const product = a * b;
  const small = Math.min(a, b);
  const large = Math.max(a, b);

  if (small === 10 || large === 10) {
    const other = small === 10 ? large : small;
    return [{ label: "כפל ב-10 מוסיף אפס בסוף:", math: `${other} × 10 = ${product}` }];
  }

  if (small <= 4) {
    return [
      {
        label: "כפל זה חיבור חוזר:",
        math: `${Array(small).fill(large).join(" + ")} = ${product}`,
      },
    ];
  }

  if (small === 5) {
    return [
      { label: "5 זה חצי מ-10, אז קודם כפול 10:", math: `10 × ${large} = ${large * 10}` },
      { label: "וחצי מזה:", math: `${large * 10} ÷ 2 = ${product}` },
    ];
  }

  const rest = small - 5;
  return [
    { label: `פרק את ${small} ל-5 ועוד ${rest}:`, math: `5 × ${large} = ${5 * large}` },
    {
      label: "ואת השאר:",
      math: `${rest} × ${large} = ${rest * large}`,
    },
    {
      label: "ביחד:",
      math: `${5 * large} + ${rest * large} = ${product}`,
    },
  ];
}

function explainDivision(a: number, b: number): ExplanationStep[] {
  const quotient = a / b;
  return [
    { label: "חילוק זה כפל הפוך, אז שאל:", math: `${b} × ? = ${a}` },
    { label: "מלוח הכפל:", math: `${b} × ${quotient} = ${a}` },
    { label: "אז התשובה:", math: `${a} ÷ ${b} = ${quotient}` },
  ];
}

type Operator = "+" | "-" | "×" | "÷";

/** Matches a question whose prompt is nothing but "a op b". */
const BARE_EXPRESSION = /^\s*(\d+)\s*([+\u2212\-×÷])\s*(\d+)\s*$/;

/**
 * Builds the worked solution shown after a wrong answer, or null when the question
 * cannot be broken down automatically.
 *
 * Only bare arithmetic ("23 + 45") can be explained by computing from its operands.
 * A word problem or an equation needs an explanation written by a person — inventing
 * one from the prompt string would produce confident nonsense, which is worse for a
 * student than no explanation at all. Those get written explanations in a later
 * feature; until then the block simply does not appear for them.
 */
export function explainQuestion(question: Question): ExplanationStep[] | null {
  const match = question.prompt.match(BARE_EXPRESSION);
  if (!match) return null;

  const a = Number(match[1]);
  const b = Number(match[3]);
  const op = (match[2] === "\u2212" ? "-" : match[2]) as Operator;

  switch (op) {
    case "+":
      return explainAddition(a, b);
    case "-":
      return explainSubtraction(a, b);
    case "×":
      return explainMultiplication(a, b);
    case "÷":
      return explainDivision(a, b);
    default:
      return null;
  }
}
