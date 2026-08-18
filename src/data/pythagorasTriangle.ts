import type { Question } from "./curriculum";

/**
 * A right triangle, read off the question itself — two legs and a hypotenuse, related by
 * `legA² + legB² = hyp²`.
 *
 * The theorem *is* a triangle, which is why Omer's diagram for it is a triangle and not a
 * formula. Six different sentences in the data ask about this same shape from different
 * angles — sometimes the legs are given and the hypotenuse is asked, sometimes the other
 * way around — and every one of them is built from the prompt and shown only if it
 * reproduces `question.answer`, the same rule as every other shape in this feature.
 *
 * Type-only import of `Question`: erased at compile time, so it cannot form a runtime
 * cycle. The practice screen is the only caller.
 */
export interface PythagorasTriangle {
  legA: number;
  legB: number;
  /**
   * Only carries a value when it is given or asked. When neither — "two equal legs from
   * area" gives no role to the hypotenuse at all — it stays `null` and the side is drawn
   * unlabeled rather than showing an irrational number.
   */
  hyp: number | null;
  /** Which side carries "?" instead of its number. */
  unknown: "legA" | "legB" | "hyp" | "bothLegs";
  caption: string;
}

const sq = (n: number) => n * n;

function readShape(
  prompt: string,
): { legA: number; legB: number; hyp: number | null; unknown: PythagorasTriangle["unknown"] } | null {
  let m: RegExpMatchArray | null;

  if ((m = prompt.match(/הניצבים הם (\d+) ו-(\d+)\. מה אורך היתר\?/))) {
    const [legA, legB] = [Number(m[1]), Number(m[2])];
    return { legA, legB, hyp: Math.sqrt(sq(legA) + sq(legB)), unknown: "hyp" };
  }

  if ((m = prompt.match(/היתר הוא (\d+) וניצב אחד הוא (\d+)\. מה הניצב השני\?/))) {
    const [hyp, legA] = [Number(m[1]), Number(m[2])];
    return { legA, legB: Math.sqrt(sq(hyp) - sq(legA)), hyp, unknown: "legB" };
  }

  if ((m = prompt.match(/אלכסון של מלבן הוא (\d+) וצלע אחת (\d+)\. מה הצלע השנייה\?/))) {
    const [hyp, legA] = [Number(m[1]), Number(m[2])];
    return { legA, legB: Math.sqrt(sq(hyp) - sq(legA)), hyp, unknown: "legB" };
  }

  if ((m = prompt.match(/סולם באורך (\d+) נשען על קיר, וקצהו העליון בגובה (\d+)\. כמה רגלו רחוקה מהקיר\?/))) {
    const [hyp, legA] = [Number(m[1]), Number(m[2])];
    return { legA, legB: Math.sqrt(sq(hyp) - sq(legA)), hyp, unknown: "legB" };
  }

  if ((m = prompt.match(/היקף מלבן הוא (\d+) ואורכו (\d+)\. מה אורך האלכסון\?/))) {
    const [perimeter, legA] = [Number(m[1]), Number(m[2])];
    const legB = perimeter / 2 - legA;
    return { legA, legB, hyp: Math.sqrt(sq(legA) + sq(legB)), unknown: "hyp" };
  }

  if ((m = prompt.match(/שני הניצבים שווים ושטח המשולש (\d+)\. מה אורך כל ניצב\?/))) {
    const area = Number(m[1]);
    const leg = Math.sqrt(2 * area);
    return { legA: leg, legB: leg, hyp: null, unknown: "bothLegs" };
  }

  return null;
}

/** One line describing what's known and what's asked, in the shape's own words. */
function caption(shape: {
  legA: number;
  legB: number;
  hyp: number | null;
  unknown: PythagorasTriangle["unknown"];
}): string {
  const { legA, legB, hyp, unknown } = shape;
  switch (unknown) {
    case "hyp":
      return `משולש ישר זווית שניצביו \`${legA}\` ו-\`${legB}\`, והיתר מולם`;
    case "legA":
    case "legB":
      return `משולש ישר זווית שהיתר שלו \`${hyp}\` וניצב אחד \`${unknown === "legA" ? legB : legA}\`, והניצב השני מולם`;
    case "bothLegs":
      return `משולש ישר זווית שבו שני הניצבים שווים באורכם`;
  }
}

export function pythagorasTriangle(question: Question): PythagorasTriangle | null {
  const shape = readShape(question.prompt);
  if (!shape) return null;

  const { legA, legB, hyp, unknown } = shape;

  // Every side that ends up labelled — given or asked — has to be a whole number. A leg
  // or hypotenuse that isn't has nothing sensible to show as either a number or a "?".
  if (!Number.isInteger(legA) || !Number.isInteger(legB) || legA <= 0 || legB <= 0) return null;
  if (unknown !== "bothLegs" && hyp !== null && !Number.isInteger(hyp)) return null;

  // The check with teeth: whichever side is marked "?" has to reproduce the recorded
  // answer. Everything else on the triangle came from the prompt, never from the answer.
  const expected =
    unknown === "hyp"
      ? hyp!
      : unknown === "legA"
        ? legA
        : unknown === "legB"
          ? legB
          : legA; // "bothLegs" — legA === legB by construction

  if (expected !== question.answer) return null;

  return { legA, legB, hyp, unknown, caption: caption(shape) };
}
