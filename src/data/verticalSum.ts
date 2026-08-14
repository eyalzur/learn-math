import type { Question } from "./curriculum";
import { bareExpression } from "./expression";

/**
 * The exercise written the way the board writes it: digits in columns, point under
 * point, a rule, the result underneath.
 *
 * Derived from the prompt and shown only if the column arithmetic lands exactly on
 * `question.answer` — the same self-verification the fraction circle established. A
 * hand-written layout could contradict the question beside it; a computed one cannot,
 * and when the check fails the block and its caption disappear together.
 *
 * All arithmetic happens on integers: operands are scaled by 10^scale up front, so
 * `0.1 + 0.2` never meets floating point. The final comparison is integers too.
 *
 * The rows come out pre-padded to one width. Alignment is the content of this figure,
 * so it is computed here — where a test can read it off a string — and not left to CSS.
 */
export interface VerticalSum {
  top: string;
  bottom: string;
  result: string;
  /** Carry digits above their columns, same width as the rows; null when none. */
  carries: string | null;
  /** One line that captions the figure, names it for a screen reader, and is spoken. */
  caption: string;
}

const decimalPlaces = (n: number) => {
  const s = String(n);
  const i = s.indexOf(".");
  return i === -1 ? 0 : s.length - i - 1;
};

/** "05" at scale 1 becomes "0.5"; at scale 0 the digits pass through. */
function withPoint(n: number, scale: number): string {
  const s = String(n).padStart(scale + 1, "0");
  return scale === 0 ? s : `${s.slice(0, -scale)}.${s.slice(-scale)}`;
}

export function verticalSum(question: Question): VerticalSum | null {
  const expr = bareExpression(question.prompt);
  if (!expr || (expr.op !== "+" && expr.op !== "-")) return null;
  const { a, op, b } = expr;
  if (a < 0 || b < 0) return null;

  const scale = Math.max(decimalPlaces(a), decimalPlaces(b));
  const A = Math.round(a * 10 ** scale);
  const B = Math.round(b * 10 ** scale);

  // Columns worth aligning: a two-digit whole part or a decimal point. Without either,
  // a column layout is ceremony — and Mika is exactly who would be handed it.
  if (scale === 0 && A < 10 && B < 10) return null;

  const digit = (n: number, i: number) => Math.floor(n / 10 ** i) % 10;
  const width = Math.max(String(A).length, String(B).length);

  let resultInt: number;
  const carryInto: number[] = [];
  if (op === "+") {
    resultInt = A + B;
    let carry = 0;
    for (let i = 0; i < width; i++) {
      const sum = digit(A, i) + digit(B, i) + carry;
      carry = sum >= 10 ? 1 : 0;
      if (carry) carryInto.push(i + 1);
    }
  } else {
    // Borrowing is a feature of its own, deliberately deferred: a column showing 5 − 8
    // with no borrow marks would be teaching half a method. Absence over a lie.
    for (let i = 0; i < width; i++) {
      if (digit(A, i) < digit(B, i)) return null;
    }
    resultInt = A - B;
  }

  // The self-verification, in integer space — never a float comparison.
  if (resultInt !== Math.round(question.answer * 10 ** scale)) return null;

  const topDigits = withPoint(A, scale);
  const bottomDigits = withPoint(B, scale);
  const resultDigits = withPoint(resultInt, scale);
  const w = Math.max(topDigits.length, bottomDigits.length, resultDigits.length);

  // Two leading cells hold the operator column; every row shares them.
  const pad = (s: string) => "  " + s.padStart(w);
  const opChar = op === "+" ? "+" : "−";

  let carries: string | null = null;
  if (carryInto.length > 0) {
    const cells = Array<string>(2 + w).fill(" ");
    for (const col of carryInto) {
      // Integer column -> character position from the right, skipping the point.
      const fromRight = scale > 0 && col >= scale ? col + 1 : col;
      cells[2 + w - 1 - fromRight] = "1";
    }
    carries = cells.join("");
  }

  const answerText = String(question.answer);
  // "3.0" is column-honest (the tenths needed their digit) but the answer is 3 — say so.
  const exactly = resultDigits === answerText ? "" : `. \`${resultDigits}\` זה בדיוק \`${answerText}\``;
  const spoken = op === "+" ? "ועוד" : "פחות";

  let caption: string;
  if (carryInto.length > 0) {
    const i = carryInto[0] - 1;
    const colSum = digit(A, i) + digit(B, i);
    caption =
      `במאונך: \`${digit(A, i)}\` ${spoken} \`${digit(B, i)}\` הן \`${colSum}\` — ` +
      `כותבים \`${colSum % 10}\` ומעבירים \`1\` לעמודה הבאה. יצא \`${answerText}\`${exactly}`;
  } else if (scale > 0) {
    caption =
      `במאונך: מימין לנקודה \`${digit(A, 0)}\` ${spoken} \`${digit(B, 0)}\` הן ` +
      `\`${digit(resultInt, 0)}\`, והנקודה מתחת לנקודה. יצא \`${answerText}\`${exactly}`;
  } else {
    caption =
      `במאונך: קודם היחידות — \`${digit(A, 0)}\` ${spoken} \`${digit(B, 0)}\` הן ` +
      `\`${digit(resultInt, 0)}\` — ואז העשרות. יצא \`${answerText}\`${exactly}`;
  }

  return {
    top: pad(topDigits),
    bottom: opChar + " " + bottomDigits.padStart(w),
    result: pad(resultDigits),
    carries,
    caption,
  };
}
