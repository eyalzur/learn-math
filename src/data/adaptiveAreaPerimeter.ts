import type { Question } from "./curriculum";
import { type Rng, randInt, pick, makeFreshId, wantsDecimal } from "./adaptiveHelpers";

/**
 * "שטח והיקף" (רותם, כיתה ו׳), built at runtime — see
 * docs/features/levels-as-practice/architecture.md.
 *
 * Five patterns read directly off the 30 written questions in `grade6.ts`: rectangle
 * area, square area/perimeter, rectangle perimeter, triangle area, and the four
 * "work backwards" / circle shapes from the hard level.
 */

const freshId = makeFreshId("g6-geometry-adaptive");

function makeQuestion(
  prompt: string,
  answer: number,
  hints: [string, string],
  steps: { label: string; math?: string }[],
  analogy: string,
  rng: Rng,
): Question {
  return { id: freshId(rng), topic: "שטח והיקף", prompt, answer, hints, steps, analogy };
}

/** Pattern 1 — rectangle area. */
function rectangleArea(rng: Rng): Question {
  const length = randInt(3, 9, rng);
  const width = randInt(2, 7, rng);
  const answer = length * width;
  return makeQuestion(
    `שטח מלבן שאורכו ${length} ורוחבו ${width}`,
    answer,
    ["שטח מלבן הוא אורך כפול רוחב", `האורך הוא \`${length}\` והרוחב \`${width}\``],
    [{ label: "שטח מלבן זה אורך כפול רוחב" }, { label: "", math: `${length} × ${width} = ${answer}` }],
    `שטיח באורך ${length} מטרים וברוחב ${width} מטרים — כמה שטח הוא תופס?`,
    rng,
  );
}

/** Pattern 2 — square area or perimeter. */
function square(rng: Rng): Question {
  const side = randInt(3, 12, rng);
  const isArea = rng() < 0.5;
  const answer = isArea ? side * side : side * 4;
  const measure = isArea ? "שטח" : "היקף";
  return makeQuestion(
    `${measure} ריבוע שצלעו ${side}`,
    answer,
    isArea
      ? ["שטח ריבוע הוא הצלע כפול עצמה", `הצלע היא \`${side}\``]
      : ["היקף הוא סכום כל הצלעות, ובריבוע כולן שוות", `הצלע היא \`${side}\`, ובריבוע יש \`4\` צלעות שוות`],
    isArea
      ? [{ label: "שטח ריבוע הוא הצלע כפול עצמה" }, { label: "", math: `${side} × ${side} = ${answer}` }]
      : [{ label: "בריבוע כל ארבע הצלעות שוות" }, { label: "", math: `${side} × 4 = ${answer}` }],
    isArea
      ? `מרפסת מרובעת של ${side} על ${side} מטר — מה השטח שלה?`
      : `גדר סביב חצר מרובעת שכל צלע שלה ${side} מטר — כמה גדר צריך?`,
    rng,
  );
}

/** Pattern 3 — rectangle perimeter. */
function rectanglePerimeter(rng: Rng): Question {
  const length = randInt(3, 12, rng);
  const width = randInt(2, 9, rng);
  const answer = (length + width) * 2;
  return makeQuestion(
    `היקף מלבן שאורכו ${length} ורוחבו ${width}`,
    answer,
    ["במלבן יש שני אורכים ושני רוחבים", `האורך הוא \`${length}\` והרוחב \`${width}\``],
    [
      { label: "פעמיים האורך:", math: `${length} + ${length} = ${length * 2}` },
      { label: "פעמיים הרוחב:", math: `${width} + ${width} = ${width * 2}` },
      { label: "ביחד:", math: `${length * 2} + ${width * 2} = ${answer}` },
    ],
    `גדר סביב ערוגת פרחים מלבנית שאורכה ${length} מטר ורוחבה ${width} מטר — כמה גדר צריך?`,
    rng,
  );
}

/** Pattern 4 — triangle area. `base` and `height` are always whole numbers — a question
 *  never shows a decimal among its own given numbers, only the answer may land on one.
 *  Normally `height` is even, which keeps the area whole regardless of `base`'s parity. A
 *  ~30% share instead make *both* `base` and `height` odd, so their product is odd and the
 *  area lands exactly on a half (`odd ÷ 2`) — decimal, but never more than one digit. */
function triangleArea(rng: Rng): Question {
  const decimal = wantsDecimal(rng);
  const base = decimal ? randInt(2, 7, rng) * 2 + 1 : randInt(4, 14, rng);
  const height = decimal ? randInt(1, 4, rng) * 2 + 1 : randInt(2, 9, rng) * 2;
  const product = base * height;
  const answer = product / 2;
  return makeQuestion(
    `שטח משולש שבסיסו ${base} וגובהו ${height}`,
    answer,
    ["שטח משולש הוא בסיס כפול גובה, חלקי `2`", `הבסיס הוא \`${base}\` והגובה \`${height}\``],
    [
      { label: "בסיס כפול גובה:", math: `${base} × ${height} = ${product}` },
      { label: "חלקי שתיים:", math: `${product} ÷ 2 = ${answer}` },
    ],
    `מפרש משולש של סירה, בסיס ${base} וגובה ${height} — מה השטח שלו?`,
    rng,
  );
}

/** Pattern 5 — one of four "work backwards" / circle shapes from the hard level (pi = 3). */
function hardShape(rng: Rng): Question {
  const kind = pick(["rectangleFromArea", "squareFromPerimeter", "circlePerimeter", "circleArea"] as const, rng);

  if (kind === "rectangleFromArea") {
    const width = randInt(2, 9, rng);
    const length = randInt(3, 12, rng);
    const area = width * length;
    return makeQuestion(
      `שטח מלבן הוא ${area} ורוחבו ${width}. מה האורך?`,
      length,
      ["שטח הוא אורך כפול רוחב, אז מחלקים בשטח הידוע", `השטח הוא \`${area}\` והרוחב \`${width}\``],
      [{ label: "שטח הוא אורך כפול רוחב, מחלקים בחזרה" }, { label: "", math: `${area} ÷ ${width} = ${length}` }],
      `שטיח בשטח ${area} שרוחבו ${width} — כמה הוא ארוך?`,
      rng,
    );
  }

  if (kind === "squareFromPerimeter") {
    const side = randInt(3, 12, rng);
    const perimeter = side * 4;
    const area = side * side;
    return makeQuestion(
      `היקף ריבוע הוא ${perimeter}. מה השטח שלו?`,
      area,
      ["קודם מוצאים את הצלע מההיקף, ורק אז את השטח", `ההיקף הוא \`${perimeter}\`, ולריבוע יש \`4\` צלעות שוות`],
      [
        { label: "הצלע:", math: `${perimeter} ÷ 4 = ${side}` },
        { label: "", math: `${side} × ${side} = ${area}` },
      ],
      `חצר שיש סביבה ${perimeter} מטר גדר — כמה מקום יש בפנים?`,
      rng,
    );
  }

  // `radius` always stays whole here — with `pi` fixed at the integer `3`, both
  // `2 × pi × radius` and `pi × radius²` are structurally always whole numbers too when
  // `radius` is (an integer times an integer stays an integer), so there is no way to
  // seed a decimal into either circle shape without putting one in a given number
  // instead — which the review ruled out. No decimal draw here; see architecture.md.
  const radius = randInt(2, 12, rng);
  const pi = 3;
  if (kind === "circlePerimeter") {
    const answer = 2 * pi * radius;
    return makeQuestion(
      `היקף מעגל שרדיוסו ${radius}, כאשר פאי שווה 3`,
      answer,
      ["היקף מעגל הוא `2` כפול פאי כפול הרדיוס", `הרדיוס הוא \`${radius}\`, ופאי הוא \`3\``],
      [
        { label: "היקף מעגל הוא פעמיים פאי כפול רדיוס" },
        { label: "", math: `2 × ${pi} × ${radius} = ${answer}` },
      ],
      `גדר סביב בריכה עגולה שרדיוסה ${radius} מטר — כמה גדר צריך?`,
      rng,
    );
  }

  const answer = pi * radius * radius;
  return makeQuestion(
    `שטח מעגל שרדיוסו ${radius}, כאשר פאי שווה 3`,
    answer,
    ["שטח מעגל הוא פאי כפול הרדיוס בריבוע", `הרדיוס הוא \`${radius}\`, ופאי הוא \`3\``],
    [
      { label: "שטח מעגל הוא פאי כפול רדיוס בריבוע" },
      { label: "", math: `${pi} × ${radius} × ${radius} = ${answer}` },
    ],
    `פיצה עגולה שרדיוסה ${radius} — מה השטח שלה?`,
    rng,
  );
}

export function generateAreaPerimeterQuestion(difficulty: number, rng: Rng = Math.random): Question {
  switch (Math.min(5, Math.max(1, Math.round(difficulty)))) {
    case 1:
      return rectangleArea(rng);
    case 2:
      return square(rng);
    case 3:
      return rectanglePerimeter(rng);
    case 4:
      return triangleArea(rng);
    default:
      return hardShape(rng);
  }
}

export const AREA_PERIMETER_MIN_DIFFICULTY = 1;
export const AREA_PERIMETER_MAX_DIFFICULTY = 5;
export const AREA_PERIMETER_INITIAL_DIFFICULTY = 1;
export const AREA_PERIMETER_QUESTION_COUNT = 20;

export function nextAreaPerimeterDifficulty(current: number, wasCorrect: boolean, streak: number): number {
  if (!wasCorrect) return Math.max(AREA_PERIMETER_MIN_DIFFICULTY, current - 1);
  return streak >= 2 ? Math.min(AREA_PERIMETER_MAX_DIFFICULTY, current + 1) : current;
}
