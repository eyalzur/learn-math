import type { Question } from "./curriculum";

/**
 * A rectangle, square, triangle or circle, read off the question itself — area or
 * perimeter, whichever the question is about.
 *
 * Four shapes because they need four different drawings, not one flat "sides: number[]"
 * — a rectangle is two numbers, a triangle is a base and a dashed height, a circle is a
 * radius. Verified against `question.answer` the same way every other shape in this
 * feature is: built from the prompt, shown only if the arithmetic reproduces the answer
 * already sitting on the question.
 *
 * Type-only import of `Question`: erased at compile time, so it cannot form a runtime
 * cycle. The practice screen is the only caller.
 */
export type GeometryShape =
  | {
      kind: "rectangle";
      length: number;
      width: number;
      /** Which side carries "?" instead of its number — set only when a side length,
       *  rather than the area or perimeter itself, is what the question asks for. */
      unknown: "length" | "width" | null;
      measure: "area" | "perimeter";
      caption: string;
    }
  | {
      kind: "square";
      side: number;
      measure: "area" | "perimeter";
      caption: string;
    }
  | {
      kind: "triangle";
      base: number;
      height: number;
      unknown: "height" | null;
      measure: "area" | "perimeter";
      caption: string;
    }
  | {
      kind: "circle";
      radius: number;
      pi: number;
      measure: "area" | "perimeter";
      caption: string;
    };

function num(s: string): number {
  return Number(s);
}

/** The shape and its numbers, read off the prompt — before anything is verified. */
function readShape(prompt: string): GeometryShape | null {
  let m: RegExpMatchArray | null;

  if ((m = prompt.match(/^שטח מלבן שאורכו (\d+) ורוחבו (\d+)$/))) {
    const [length, width] = [num(m[1]), num(m[2])];
    return {
      kind: "rectangle",
      length,
      width,
      unknown: null,
      measure: "area",
      caption: `מלבן באורך \`${length}\` וברוחב \`${width}\`, והשטח הוא כל מה שבפנים`,
    };
  }

  if ((m = prompt.match(/^היקף מלבן שאורכו (\d+) ורוחבו (\d+)$/))) {
    const [length, width] = [num(m[1]), num(m[2])];
    return {
      kind: "rectangle",
      length,
      width,
      unknown: null,
      measure: "perimeter",
      caption: `מלבן באורך \`${length}\` וברוחב \`${width}\`, וההיקף הוא הדרך סביבו`,
    };
  }

  if ((m = prompt.match(/^שטח ריבוע שצלעו (\d+)$/))) {
    const side = num(m[1]);
    return {
      kind: "square",
      side,
      measure: "area",
      caption: `ריבוע שצלעו \`${side}\`, והשטח הוא כל מה שבפנים`,
    };
  }

  if ((m = prompt.match(/^היקף ריבוע שצלעו (\d+)$/))) {
    const side = num(m[1]);
    return {
      kind: "square",
      side,
      measure: "perimeter",
      caption: `ריבוע שצלעו \`${side}\`, וההיקף הוא הדרך סביבו`,
    };
  }

  if ((m = prompt.match(/^שטח משולש שבסיסו (\d+) וגובהו (\d+)$/))) {
    const [base, height] = [num(m[1]), num(m[2])];
    return {
      kind: "triangle",
      base,
      height,
      unknown: null,
      measure: "area",
      caption: `משולש שבסיסו \`${base}\` וגובהו \`${height}\`, והשטח הוא כל מה שבפנים`,
    };
  }

  if ((m = prompt.match(/^היקף משולש שווה צלעות שצלעו (\d+)$/))) {
    const side = num(m[1]);
    return {
      kind: "triangle",
      base: side,
      height: side,
      unknown: null,
      measure: "perimeter",
      caption: `משולש שווה צלעות שכל צלע בו \`${side}\`, וההיקף הוא הדרך סביבו`,
    };
  }

  if ((m = prompt.match(/^היקף מעגל שרדיוסו (\d+), כאשר פאי שווה (\d+)$/))) {
    const [radius, pi] = [num(m[1]), num(m[2])];
    return {
      kind: "circle",
      radius,
      pi,
      measure: "perimeter",
      caption: `מעגל שרדיוסו \`${radius}\`, וההיקף הוא הדרך סביבו`,
    };
  }

  if ((m = prompt.match(/^שטח מעגל שרדיוסו (\d+), כאשר פאי שווה (\d+)$/))) {
    const [radius, pi] = [num(m[1]), num(m[2])];
    return {
      kind: "circle",
      radius,
      pi,
      measure: "area",
      caption: `מעגל שרדיוסו \`${radius}\`, והשטח הוא כל מה שבפנים`,
    };
  }

  if ((m = prompt.match(/^היקף ריבוע הוא (\d+)\. מה השטח(?: שלו)?\?$/))) {
    const perimeter = num(m[1]);
    const side = perimeter / 4;
    return {
      kind: "square",
      side,
      measure: "area",
      caption: `ריבוע שההיקף שלו \`${perimeter}\`, והשטח הוא כל מה שבפנים`,
    };
  }

  if ((m = prompt.match(/^שטח מלבן הוא (\d+) ורוחבו (\d+)\. מה האורך\?$/))) {
    const [area, width] = [num(m[1]), num(m[2])];
    const length = area / width;
    return {
      kind: "rectangle",
      length,
      width,
      unknown: "length",
      measure: "area",
      caption: `מלבן שהשטח שלו \`${area}\` ורוחבו \`${width}\`, ומחפשים כמה הוא ארוך`,
    };
  }

  if ((m = prompt.match(/^שטח מלבן הוא (\d+) ואורכו (\d+)\. מה הרוחב\?$/))) {
    const [area, length] = [num(m[1]), num(m[2])];
    const width = area / length;
    return {
      kind: "rectangle",
      length,
      width,
      unknown: "width",
      measure: "area",
      caption: `מלבן שהשטח שלו \`${area}\` ואורכו \`${length}\`, ומחפשים כמה הוא רחב`,
    };
  }

  if ((m = prompt.match(/^שטח משולש הוא (\d+) ובסיסו (\d+)\. מה הגובה\?$/))) {
    const [area, base] = [num(m[1]), num(m[2])];
    const height = (area * 2) / base;
    return {
      kind: "triangle",
      base,
      height,
      unknown: "height",
      measure: "area",
      caption: `משולש שהשטח שלו \`${area}\` ובסיסו \`${base}\`, ומחפשים כמה הוא גבוה`,
    };
  }

  return null;
}

/** What this shape computes to, for the `measure` it is about. */
function computed(shape: GeometryShape): number {
  switch (shape.kind) {
    case "rectangle":
      return shape.measure === "area"
        ? shape.length * shape.width
        : 2 * (shape.length + shape.width);
    case "square":
      return shape.measure === "area" ? shape.side * shape.side : shape.side * 4;
    case "triangle":
      return shape.measure === "area" ? (shape.base * shape.height) / 2 : shape.base * 3;
    case "circle":
      return shape.measure === "area"
        ? shape.pi * shape.radius * shape.radius
        : 2 * shape.pi * shape.radius;
  }
}

export function geometryShape(question: Question): GeometryShape | null {
  const shape = readShape(question.prompt);
  if (!shape) return null;

  // Every number that ends up on the drawing has to be a whole one — a fractional side
  // has nothing sensible to render.
  const numbers =
    shape.kind === "rectangle"
      ? [shape.length, shape.width]
      : shape.kind === "square"
        ? [shape.side]
        : shape.kind === "triangle"
          ? [shape.base, shape.height]
          : [shape.radius];
  if (numbers.some((n) => !Number.isInteger(n) || n <= 0)) return null;

  // The check with teeth: what the shape's own numbers say, cross-checked against the
  // recorded answer. A side marked "?" is exactly the one this line has to get right —
  // everything else on the shape is drawn from the prompt, never from the answer.
  let expected: number;
  if (shape.kind === "rectangle" && shape.unknown === "length") expected = shape.length;
  else if (shape.kind === "rectangle" && shape.unknown === "width") expected = shape.width;
  else if (shape.kind === "triangle" && shape.unknown === "height") expected = shape.height;
  else expected = computed(shape);

  if (expected !== question.answer) return null;

  return shape;
}
