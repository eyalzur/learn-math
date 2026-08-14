/**
 * The one parser for a prompt that is nothing but "a op b".
 *
 * This used to live twice — one copy in `explain.ts` that only knew integers, one in
 * `diagnose.ts` that knew decimals — and a third caller was about to appear. Two parsers
 * for the same idea drift the first time someone edits one of them, which in this app
 * means two modules quietly disagreeing about what a question even says.
 *
 * Imports nothing, so importing it can never form a cycle — the trap that once turned
 * the whole app into a white screen.
 */

export type Operator = "+" | "-" | "×" | "÷";

export interface BareExpression {
  a: number;
  op: Operator;
  b: number;
}

/** The characters a question may spell an operator with, mapped to one canonical form. */
const OPERATORS: Record<string, Operator> = {
  "+": "+",
  "-": "-",
  "−": "-",
  "×": "×",
  "*": "×",
  "÷": "÷",
  "/": "÷",
};

/** Splits "12 + 5" or "0.5 + 0.3" into its parts. Word problems return null. */
export function bareExpression(prompt: string): BareExpression | null {
  const m = prompt.trim().match(/^(-?\d+(?:\.\d+)?)\s*([+\-−×÷*/])\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  return { a: Number(m[1]), op: OPERATORS[m[2]], b: Number(m[3]) };
}
