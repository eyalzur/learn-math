import type { Question } from "./curriculum";

/**
 * A concrete dot-count to show above a simple addition/subtraction question, matching
 * this question's own numbers — not a fixed illustration. Derived purely from the prompt,
 * same discipline as tenFrame.ts (a sibling, not a shared mechanism: that one draws
 * "tens and units" for one specific topic's patterns; this one is general small
 * addition/subtraction and null for anything that topic already covers too): a bare
 * expression only, never a word problem, and only when both operands are small enough to
 * actually count by eye.
 */
export interface QuantityDots {
  operation: "add" | "subtract";
  /** 1–10. For subtraction, the number being subtracted from. */
  a: number;
  /** 1–10. For subtraction, the amount taken away; never more than `a`. */
  b: number;
}

const MAX_OPERAND = 10;

export function quantityDots(question: Question): QuantityDots | null {
  const match = question.prompt.trim().match(/^(\d+)\s*([+−-])\s*(\d+)$/);
  if (!match) return null;
  const a = Number(match[1]);
  const b = Number(match[3]);
  if (a < 1 || a > MAX_OPERAND || b < 1 || b > MAX_OPERAND) return null;
  if (match[2] === "+") return { operation: "add", a, b };
  // A real subtraction question never asks for a negative result, but this function only
  // reads the prompt text — it doesn't know that, so it checks rather than assumes.
  if (b > a) return null;
  return { operation: "subtract", a, b };
}
