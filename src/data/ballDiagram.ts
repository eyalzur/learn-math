import type { Question } from "./curriculum";
import { bareExpression } from "./expression";

/**
 * An animated ball-pile that shows an addition or subtraction, derived from the
 * question's own prompt and verified against its answer — the same rule as every other
 * shape in this bundle.
 *
 * Deliberately bounded to single-digit operands (`0`–`9`), not just to the `add10`/`sub10`
 * style name: those styles' real content also includes two-digit operands (`"10 + 8"`,
 * `"20 − 13"`), which is "tens and units" territory this picture does not attempt — a
 * pile of twenty undifferentiated dots would defeat the point. `ballDiagram` declines
 * (returns `null`) outside the single-digit range, the same "fail quietly rather than
 * overflow" idiom `tenFrame.ts` already uses for its own 10–19 boundary.
 */
export interface BallDiagram {
  op: "add" | "sub";
  a: number;
  b: number;
  /** `a + b` for addition, `a - b` for subtraction — always equal to `question.answer`. */
  result: number;
  /** One line that captions the picture, names it for a screen reader, and is spoken. */
  caption: string;
}

export function ballDiagram(question: Question): BallDiagram | null {
  const op: "add" | "sub" | null =
    question.style === "add10" ? "add" : question.style === "sub10" ? "sub" : null;
  if (op === null) return null;

  const expr = bareExpression(question.prompt);
  if (!expr) return null;

  const { a, b } = expr;
  if (op === "add" && expr.op !== "+") return null;
  if (op === "sub" && expr.op !== "-") return null;

  // Units only — see the doc comment above. Not "a reasonable default", a real bound
  // against this style's actual content.
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || a > 9 || b < 0 || b > 9) {
    return null;
  }

  const result = op === "add" ? a + b : a - b;
  if (result < 0) return null;
  if (result !== question.answer) return null;

  const caption =
    op === "add"
      ? `\`${a}\` כדורים ועוד \`${b}\` כדורים — ביחד זה \`${result}\``
      : `מתוך \`${a}\` כדורים הוצאנו \`${b}\`, ונשארו \`${result}\``;

  return { op, a, b, result, caption };
}
