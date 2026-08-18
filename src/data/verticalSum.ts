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
  /** Adjustment digits above their columns — a carried ten for addition, a borrowed one
   *  for subtraction — same width as the rows; null when none are needed. */
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
  /** Column that gave up a ten (shows its reduced digit) → the column it lent to. */
  const borrowedFrom = new Map<number, number>();
  if (op === "+") {
    resultInt = A + B;
    let carry = 0;
    for (let i = 0; i < width; i++) {
      const sum = digit(A, i) + digit(B, i) + carry;
      carry = sum >= 10 ? 1 : 0;
      if (carry) carryInto.push(i + 1);
    }
  } else {
    // One borrow per column, the way it is taught on the board: a column short in its own
    // digit takes a ten from its neighbour, which then shows one less. A borrow that would
    // have to chain past that neighbour (it has nothing to lend either) has nowhere honest
    // to draw a reduced digit — the same "absence over a lie" this module already lives by
    // for a carry that can't be verified, so it falls back to no diagram rather than a
    // picture that quietly lies about which column lent what.
    let borrow = 0;
    for (let i = 0; i < width; i++) {
      const short = digit(A, i) - borrow < digit(B, i);
      if (short) borrowedFrom.set(i + 1, i);
      borrow = short ? 1 : 0;
    }
    if (borrow > 0) return null; // ran out of digits to borrow from — A < B
    // A lender that is itself short (borrowing through a zero, "103 − 8") would need to
    // show two adjustments on one column — not what a single digit-per-cell can draw
    // honestly. One borrow only; anything that would chain sits this diagram out.
    if (borrowedFrom.size > 1) return null;
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

  // Integer column -> character position from the right, skipping the point.
  const cellFor = (col: number) => 2 + w - 1 - (scale > 0 && col >= scale ? col + 1 : col);

  let carries: string | null = null;
  if (carryInto.length > 0) {
    const cells = Array<string>(2 + w).fill(" ");
    for (const col of carryInto) cells[cellFor(col)] = "1";
    carries = cells.join("");
  } else if (borrowedFrom.size > 0) {
    const cells = Array<string>(2 + w).fill(" ");
    for (const [lender, receiver] of borrowedFrom) {
      cells[cellFor(lender)] = String(digit(A, lender) - 1);
      cells[cellFor(receiver)] = "1";
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
  } else if (borrowedFrom.size > 0) {
    const [, receiver] = [...borrowedFrom.entries()][0];
    const borrowed = digit(A, receiver) + 10;
    caption =
      `במאונך: ל-\`${digit(A, receiver)}\` אין מספיק כדי להוריד \`${digit(B, receiver)}\`, ` +
      `אז שואלים עשר מהעמודה הבאה. \`${borrowed}\` פחות \`${digit(B, receiver)}\` הן ` +
      `\`${borrowed - digit(B, receiver)}\`. יצא \`${answerText}\`${exactly}`;
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
