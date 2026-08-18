import type { Question } from "./curriculum";

/**
 * A line (or two) on axes, read off the question itself — with the one point that answers
 * the question marked on it.
 *
 * Six different sentences in the data reduce to one picture: a line drawn across a small
 * window around the point that matters, the same way `numberLine.ts` windows around the
 * numbers a question is about. Built from the prompt and shown only if it reproduces
 * `question.answer`, the same rule as every other shape here.
 *
 * Type-only import of `Question`: erased at compile time, so it cannot form a runtime
 * cycle. The practice screen is the only caller.
 */
export interface LinearGraph {
  lines: { slope: number; intercept: number }[];
  /** The marked point — coordinates that reproduce `question.answer`. */
  point: { x: number; y: number };
  xMin: number;
  xMax: number;
  caption: string;
}

/**
 * `y = Mx + B` in any of the forms this app's questions write it: `x + 5`, `2x`,
 * `3x − 1`, `6 − x`, `−4x + 3`. The minus sign in the data is the Unicode `−`, not a
 * hyphen, so both are accepted.
 */
function parseLine(expr: string): { slope: number; intercept: number } | null {
  const e = expr.trim();
  let m: RegExpMatchArray | null;

  // "N − x" — slope is −1, written with the constant first.
  if ((m = e.match(/^(\d+)\s*[-−]\s*x$/))) return { slope: -1, intercept: Number(m[1]) };

  if (e === "x") return { slope: 1, intercept: 0 };
  if (e === "-x" || e === "−x") return { slope: -1, intercept: 0 };

  // "Mx" alone, M possibly negative.
  if ((m = e.match(/^([-−]?\d+)x$/))) return { slope: Number(m[1].replace("−", "-")), intercept: 0 };

  // "x + N" / "x − N"
  if ((m = e.match(/^x\s*([+−-])\s*(\d+)$/)))
    return { slope: 1, intercept: m[1] === "+" ? Number(m[2]) : -Number(m[2]) };

  // "Mx + N" / "Mx − N", M possibly negative.
  if ((m = e.match(/^([-−]?\d+)x\s*([+−-])\s*(\d+)$/)))
    return {
      slope: Number(m[1].replace("−", "-")),
      intercept: m[2] === "+" ? Number(m[3]) : -Number(m[3]),
    };

  return null;
}

interface Shape {
  lines: { slope: number; intercept: number }[];
  point: { x: number; y: number };
  /** What the question is actually asking for — not always `point.y`: a slope question
   *  marks a second point to *show* the slope, but the answer is the slope itself. */
  expected: number;
  caption: string;
}

function readShape(prompt: string): Shape | null {
  let m: RegExpMatchArray | null;

  if ((m = prompt.match(/^בפונקציה `y = (.+?)`, מה הערך של `y`, כאשר `x` שווה ל-`(-?\d+)`\?$/))) {
    const line = parseLine(m[1]);
    if (!line) return null;
    const x = Number(m[2]);
    const y = line.slope * x + line.intercept;
    return {
      lines: [line],
      point: { x, y },
      expected: y,
      caption: `בפונקציה \`y = ${m[1]}\`, כש-\`x\` שווה \`${x}\`, \`y\` שווה \`${y}\` — הנקודה על הישר`,
    };
  }

  if ((m = prompt.match(/^מה החותך עם ציר `y` בישר `y = (.+?)`\?$/))) {
    const line = parseLine(m[1]);
    if (!line) return null;
    return {
      lines: [line],
      point: { x: 0, y: line.intercept },
      expected: line.intercept,
      caption: `בפונקציה \`y = ${m[1]}\`, כש-\`x\` שווה \`0\`, \`y\` שווה \`${line.intercept}\` — הנקודה על הישר`,
    };
  }

  if ((m = prompt.match(/^מה השיפוע של הישר `y = (.+?)`\?$/))) {
    const line = parseLine(m[1]);
    if (!line) return null;
    return {
      lines: [line],
      point: { x: 1, y: line.slope + line.intercept },
      expected: line.slope,
      caption: `הישר \`y = ${m[1]}\` — בכל צעד של \`1\` ב-\`x\`, \`y\` משתנה ב-\`${line.slope}\`, וזה השיפוע`,
    };
  }

  if (
    (m = prompt.match(/^בפונקציה `y = (.+?)`, מה הערך של `x`, כאשר `y` שווה ל-`(-?\d+)`\?$/)) ||
    (m = prompt.match(/^הישר `y = (.+?)` עובר בנקודה שבה `y` שווה `(-?\d+)`\. מה הערך של `x`\?$/))
  ) {
    const line = parseLine(m[1]);
    if (!line || line.slope === 0) return null;
    const y = Number(m[2]);
    const x = (y - line.intercept) / line.slope;
    return {
      lines: [line],
      point: { x, y },
      expected: x,
      caption: `בפונקציה \`y = ${m[1]}\`, כש-\`y\` שווה \`${y}\`, \`x\` שווה \`${x}\` — הנקודה על הישר`,
    };
  }

  if ((m = prompt.match(/^שני ישרים נפגשים: `y = (.+?)` ו-`y = (.+?)`\. מה ה-`x` בנקודת המפגש\?$/))) {
    const line1 = parseLine(m[1]);
    const line2 = parseLine(m[2]);
    if (!line1 || !line2 || line1.slope === line2.slope) return null;
    const x = (line2.intercept - line1.intercept) / (line1.slope - line2.slope);
    const y = line1.slope * x + line1.intercept;
    return {
      lines: [line1, line2],
      point: { x, y },
      expected: x,
      caption: `שני הישרים \`y = ${m[1]}\` ו-\`y = ${m[2]}\` נפגשים בנקודה שבה \`x\` שווה \`${x}\``,
    };
  }

  return null;
}

export function linearGraph(question: Question): LinearGraph | null {
  const shape = readShape(question.prompt);
  if (!shape) return null;

  const { lines, point, expected, caption } = shape;

  // The check with teeth: whatever the question asks for — a y-value, an x-value, or a
  // slope — has to reproduce the recorded answer. Everything else is built from the
  // prompt, never from the answer.
  if (!Number.isInteger(expected) || expected !== question.answer) return null;
  if (!Number.isInteger(point.x) || !Number.isInteger(point.y)) return null;

  const xs = [0, point.x, 1];
  const xMin = Math.min(...xs) - 1;
  const xMax = Math.max(...xs) + 1;

  return { lines, point, xMin, xMax, caption };
}
