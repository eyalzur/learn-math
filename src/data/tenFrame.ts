import type { Question } from "./curriculum";

/**
 * A number drawn the way the topic defines it: full boxes of ten, and the loose ones
 * beside them.
 *
 * For "tens and units" the ten-frame is not an illustration of the idea — it *is* the
 * idea, which is why this is the second of the seven shapes and the second one Mika
 * gets.
 *
 * Derived from the prompt and shown only when it reproduces `question.answer`, the same
 * rule as every other shape here. Type-only import of `Question`; nothing under src/data
 * imports this module.
 */
export interface TenFrame {
  /** How many full boxes of ten. */
  tens: number;
  /** How many loose ones beside them. */
  units: number;
  /** Which side the question asks about — that side is filled, the other outlined. */
  highlight: "tens" | "units" | "both";
  /** One line that captions the picture, names it for a screen reader, and is spoken. */
  caption: string;
}

/** The question's shape, the number it is about, and what the picture should stress. */
function readShape(
  prompt: string,
): { whole: number; highlight: TenFrame["highlight"]; asks: "tens" | "units" | "whole" } | null {
  const nums = prompt.match(/\d+/g)?.map(Number) ?? [];

  if (/כמה עשרות/.test(prompt) && nums.length === 1) {
    return { whole: nums[0], highlight: "tens", asks: "tens" };
  }
  if (/כמה יחידות/.test(prompt) && nums.length === 1) {
    return { whole: nums[0], highlight: "units", asks: "units" };
  }
  // "עשרת אחת ועוד 4 יחידות" — the number is not written anywhere in the prompt; it is
  // built from the parts, and the answer is what it should come to.
  if (/עשרת אחת ועוד/.test(prompt) && nums.length === 1) {
    return { whole: 10 + nums[0], highlight: "both", asks: "whole" };
  }
  // "10 + 6" — the one bare expression in the topic.
  const sum = prompt.trim().match(/^(\d+)\s*\+\s*(\d+)$/);
  if (sum) {
    const a = Number(sum[1]);
    const b = Number(sum[2]);
    if (a !== 10 || b >= 10) return null;
    return { whole: a + b, highlight: "both", asks: "whole" };
  }

  return null;
}

export function tenFrame(question: Question): TenFrame | null {
  const shape = readShape(question.prompt);
  if (!shape) return null;

  const { whole } = shape;
  // One box and its loose ones is what fits at 280px, and it is the whole of this topic
  // (every question here is 10–19). Two boxes would need a different drawing, so the
  // shape declines rather than overflowing.
  if (!Number.isInteger(whole) || whole < 10 || whole > 19) return null;

  const tens = Math.floor(whole / 10);
  const units = whole % 10;

  // Two checks, not one. The first says the picture describes the right number; the
  // second says it answers what was actually asked — a frame that rebuilds 13 correctly
  // is still the wrong picture over "how many tens" if the answer says otherwise.
  if (tens * 10 + units !== whole) return null;
  const expected = shape.asks === "tens" ? tens : shape.asks === "units" ? units : whole;
  if (expected !== question.answer) return null;

  const boxes = tens === 1 ? "קופסה מלאה אחת" : `\`${tens}\` קופסאות מלאות`;
  const loose =
    units === 0 ? "ואף אחד בחוץ" : units === 1 ? "ועוד אחד בחוץ" : `ועוד \`${units}\` בחוץ`;

  return {
    tens,
    units,
    highlight: shape.highlight,
    caption: `\`${whole}\` הם ${boxes} של \`10\`, ${loose}`,
  };
}
