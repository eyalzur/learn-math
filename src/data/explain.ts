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

export interface Explanation {
  steps: ExplanationStep[];
  /** One sentence tying the maths to something the student already knows. */
  analogy: string;
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
      return [{ label: "מחברים רק את המספרים הקטנים:", math: `${a} + ${b} = ${total}` }];
    }
    if (b === gap) {
      return [{ label: "זה מגיע בדיוק למספר עגול:", math: `${a} + ${b} = ${total}` }];
    }
    const ten = a + gap;
    return [
      { label: "קודם עולים למספר עגול:", math: `${a} + ${gap} = ${ten}` },
      { label: `נשאר להוסיף ${b - gap}:`, math: `${ten} + ${b - gap} = ${total}` },
    ];
  }

  if (units === 0) {
    return [{ label: "מוסיפים מספר עגול:", math: `${a} + ${tens} = ${total}` }];
  }

  return [
    { label: "קודם החלק העגול:", math: `${a} + ${tens} = ${a + tens}` },
    { label: "ואחר כך מה שנשאר:", math: `${a + tens} + ${units} = ${total}` },
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
      return [{ label: "מורידים מספר עגול:", math: `${a} − ${tens} = ${result}` }];
    }
    return [
      { label: "קודם החלק העגול:", math: `${a} − ${tens} = ${a - tens}` },
      { label: "ואחר כך מה שנשאר:", math: `${a - tens} − ${units} = ${result}` },
    ];
  }

  const units = unitsOf(a);
  if (a > 10 && b > units) {
    const ten = a - units;
    const rest = b - units;
    return [
      { label: "קודם יורדים למספר עגול:", math: `${a} − ${units} = ${ten}` },
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

/** Steps derived by computing from the operands. Only bare arithmetic qualifies. */
function computedSteps(prompt: string): ExplanationStep[] | null {
  const match = prompt.match(BARE_EXPRESSION);
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

/**
 * Builds the worked solution shown after a wrong answer.
 *
 * Steps come from the question when it carries written ones, and are computed from the
 * operands otherwise — a word problem or an equation cannot be broken down by parsing
 * its prompt, and a fabricated breakdown would be worse for a student than none. The
 * analogy always comes from the question, since tying the maths to something familiar
 * is a judgement no formula makes.
 */
const HEBREW = /[\u0590-\u05FF]/;
const CARRIES_MATH = /[0-9]\s*[+\u2212\-×÷=]|[+\u2212×÷=]\s*[0-9]|√/;

/**
 * Moves arithmetic out of an authored step's prose and into its `math` field.
 *
 * Only `math` is rendered in an isolated LTR element, so an expression left in `label`
 * comes out reversed inside the RTL page — "20 ÷ 2 = 10" reads "10 = 2 ÷ 20". Relying on
 * whoever writes a question to remember which field to use is exactly the kind of thing
 * that gets forgotten, so the split is enforced here instead.
 */
function normalizeStep(step: { label: string; math?: string }): ExplanationStep {
  if (step.math) return { label: step.label, math: step.math };

  const label = step.label;
  if (!CARRIES_MATH.test(label)) return { label, math: "" };

  // "קודם החלק העגול: 23 + 40 = 63" -> prose keeps the colon, the expression moves.
  const colon = label.match(/^(.*?[:])\s*(.+)$/);
  if (colon && !HEBREW.test(colon[2])) return { label: colon[1], math: colon[2] };

  // A bare expression with no prose around it.
  if (!HEBREW.test(label)) return { label: "", math: label };

  return { label, math: "" };
}

export function explainQuestion(question: Question): Explanation | null {
  const steps = question.steps
    ? question.steps.map(normalizeStep)
    : computedSteps(question.prompt);

  if (steps === null || steps.length === 0) return null;
  return { steps, analogy: question.analogy };
}
