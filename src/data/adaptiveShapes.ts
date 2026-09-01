import type { Question } from "./curriculum";

/**
 * "צורות וגופים", built at runtime instead of only the 30 written questions in
 * `grade2.ts`. Unlike every other adaptive generator in this app, there are no "random
 * numbers in a range" here — a triangle always has exactly three sides, it cannot be
 * rolled. Instead, each tier picks a shape or solid **at random from a closed list** and
 * looks its facts up in a fixed table — the same facts the 30 written questions already
 * state, reviewed and passed content rules with. The table is the source of truth, not a
 * formula: never derive a shape's side/vertex/face count here, only look it up.
 */

type Rng = () => number;

function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

function freshId(rng: Rng): string {
  return `g2-shapes-adaptive-${Math.floor(rng() * 1e9)}`;
}

type PlaneAttr = "צלעות" | "קדקודים";

const PLANE_SHAPES: Record<string, Record<PlaneAttr, number>> = {
  משולש: { צלעות: 3, קדקודים: 3 },
  ריבוע: { צלעות: 4, קדקודים: 4 },
  מלבן: { צלעות: 4, קדקודים: 4 },
  עיגול: { צלעות: 0, קדקודים: 0 },
  מחומש: { צלעות: 5, קדקודים: 5 },
  משושה: { צלעות: 6, קדקודים: 6 },
};

/** One fixed, reviewed analogy per shape — not per (shape, attribute) pair, since the
 *  shape itself (not which attribute is being asked about) is what a real-world object
 *  illustrates. */
const PLANE_ANALOGIES: Record<string, string> = {
  משולש: "תסתכל/י על פרוסת פיצה — הקצוות שלה בונים משולש",
  ריבוע: "תסתכל/י על קובייה של משחק — כל צד שלה הוא ריבוע",
  מלבן: "תסתכל/י על דלת — הצורה שלה היא מלבן",
  עיגול: "תסתכל/י על גלגל — אין בו אף פינה או קו ישר",
  מחומש: "תסתכל/י על ציור של בית ילדים — הגג המשולש מעל הריבוע יוצר יחד צורה בת חמש צלעות",
  משושה: "תסתכל/י על תא בכוורת דבורים — צורתו משושה",
};

type SolidAttr = "פאות" | "קדקודים" | "מקצועות";

/** Only the (solid, attribute) pairs that are actually meaningful appear here — a sphere
 *  or cylinder has no well-defined "edge" count in the way a cube's straight edges do, so
 *  `מקצועות` simply isn't a key under them. `Partial` makes that omission visible in the
 *  type, not just a convention a reader has to trust. */
const SOLIDS: Record<string, Partial<Record<SolidAttr, number>>> = {
  קוביה: { פאות: 6, קדקודים: 8, מקצועות: 12 },
  כדור: { פאות: 0, קדקודים: 0 },
  גליל: { פאות: 2, קדקודים: 0 },
};

const SOLID_ANALOGIES: Record<string, string> = {
  קוביה: "תסתכל/י על קופסת מתנה מרובעת",
  כדור: "תסתכל/י על כדור משחק — הוא חלק וללא פינות",
  גליל: "תסתכל/י על פחית שימורים — למעלה ולמטה היא שטוחה",
};

/** "שני כדורים"/"שתי קוביות" — Hebrew's count word and plural noun both depend on the
 *  noun's gender, so "two of a solid" needs a lookup, not a formula. */
const SOLID_PAIR: Record<string, string> = {
  קוביה: "שתי קוביות",
  כדור: "שני כדורים",
  גליל: "שני גלילים",
};

function makeQuestion(prompt: string, answer: number, hints: [string, string], steps: { label: string; math?: string }[], analogy: string, rng: Rng): Question {
  return {
    id: freshId(rng),
    topic: "צורות וגופים",
    style: "shapes",
    prompt,
    answer,
    hints,
    steps,
    analogy,
  };
}

/** A single fact about one plane shape — "כמה X יש לY?". Hebrew's "ל" always absorbs a
 *  following definite article ("ל" + "ה-משולש" → "למשולש"), so every shape name takes it
 *  directly, with no per-shape exception to track. */
function planeFact(rng: Rng): Question {
  const shape = pick(Object.keys(PLANE_SHAPES), rng);
  const attr: PlaneAttr = pick(["צלעות", "קדקודים"], rng);
  const answer = PLANE_SHAPES[shape][attr];
  const isCircle = shape === "עיגול";
  const hint2 =
    attr === "צלעות"
      ? isCircle
        ? "עיגול עשוי מקו אחד עקום, בלי שום קו ישר"
        : "תחשוב/י כמה פעמים הקו משנה כיוון כשעוקבים אחרי קצה הצורה"
      : isCircle
        ? "לעיגול אין אף קו ישר, ולכן אין לו פינות"
        : "קדקוד נוצר במקום שבו שתי צלעות נפגשות — סופרים כל פינה בצורה";
  return makeQuestion(
    `כמה ${attr} יש ל${shape}?`,
    answer,
    [attr === "צלעות" ? "סופרים כמה קווים ישרים בונים את הצורה" : "קדקוד הוא הפינה שבה נפגשות שתי צלעות", hint2],
    [{ label: `ל${shape} יש ${answer} ${attr}` }],
    PLANE_ANALOGIES[shape],
    rng,
  );
}

/** Two distinct plane shapes' facts, combined with + or − — the shape of the written
 *  `m1..m10`. Subtraction always names which shape has more, and only fires when the two
 *  values actually differ (comparing a shape to itself in all but name teaches nothing). */
function planeCombo(rng: Rng): Question {
  const shapes = Object.keys(PLANE_SHAPES);
  const attr: PlaneAttr = pick(["צלעות", "קדקודים"], rng);
  let a: string, b: string;
  do {
    a = pick(shapes, rng);
    b = pick(shapes, rng);
  } while (a === b);
  const valA = PLANE_SHAPES[a][attr];
  const valB = PLANE_SHAPES[b][attr];
  const useSum = valA === valB || rng() < 0.5;

  if (useSum) {
    const answer = valA + valB;
    return makeQuestion(
      `ל${a} יש ${valA} ${attr}, ול${b} יש ${valB} ${attr} — כמה ${attr} יש בסך הכל לשתי הצורות?`,
      answer,
      ["סופרים כל צורה בנפרד, ואז מחברים", `\`${valA}\`+\`${valB}\``],
      [{ label: "מחברים:", math: `${valA} + ${valB} = ${answer}` }],
      `${PLANE_ANALOGIES[a]} ו${PLANE_ANALOGIES[b].replace(/^תסתכל\/י על /, "")}`,
      rng,
    );
  }

  const [hi, hiVal, lo, loVal] = valA >= valB ? [a, valA, b, valB] : [b, valB, a, valA];
  const answer = hiVal - loVal;
  return makeQuestion(
    `ל${hi} יש ${hiVal} ${attr}, ול${lo} יש ${loVal} ${attr} — בכמה יותר ${attr} יש ל${hi} מל${lo}?`,
    answer,
    ["מחסרים את המספר הקטן מהגדול", `\`${hiVal}\`−\`${loVal}\``],
    [{ label: "מחסרים:", math: `${hiVal} - ${loVal} = ${answer}` }],
    `${PLANE_ANALOGIES[hi]} ו${PLANE_ANALOGIES[lo].replace(/^תסתכל\/י על /, "")}`,
    rng,
  );
}

/** A single fact about one solid — only from the (solid, attribute) pairs that actually
 *  exist in `SOLIDS`. */
function solidFact(rng: Rng): Question {
  const solid = pick(Object.keys(SOLIDS), rng);
  const attrs = Object.keys(SOLIDS[solid]) as SolidAttr[];
  const attr = pick(attrs, rng);
  const answer = SOLIDS[solid][attr]!;
  const label = attr === "פאות" && solid !== "קוביה" ? "פאות שטוחות" : attr;
  return makeQuestion(
    `כמה ${label} יש ל${solid}?`,
    answer,
    [
      attr === "פאות"
        ? "פאה היא כל אחד מהמשטחים השטוחים שמסביב לגוף"
        : attr === "קדקודים"
          ? "קדקוד הוא כל פינה שבה נפגשות כמה פאות"
          : "מקצוע הוא הקו שבו נפגשות שתי פאות",
      `תחשוב/י על ${solid} בעולם האמיתי`,
    ],
    [{ label: `ל${solid} יש ${answer} ${label}` }],
    SOLID_ANALOGIES[solid],
    rng,
  );
}

/** Two solids' facts combined — either the same solid counted twice (any of its own
 *  attributes, doubled) or two different solids on an attribute both actually have
 *  (`מקצועות` never appears here: only `קוביה` has a meaningful edge count, so no pair of
 *  *different* solids shares it) — the shape of the written `h6..h10`. */
/** Every (solid, attribute) pair whose value is non-zero — doubling a `0` fact would
 *  make the hint that states it (`לכל אחד מהם 0 ...`) state the answer too, since the
 *  prompt itself never shows that `0` for a child to have "already been given" it. */
const NONZERO_SOLID_ATTRS: [string, SolidAttr][] = Object.entries(SOLIDS).flatMap(([solid, attrs]) =>
  (Object.entries(attrs) as [SolidAttr, number][])
    .filter(([, value]) => value > 0)
    .map(([attr]): [string, SolidAttr] => [solid, attr]),
);

function solidCombo(rng: Rng): Question {
  const solids = Object.keys(SOLIDS);
  if (rng() < 0.5) {
    const [solid, attr] = pick(NONZERO_SOLID_ATTRS, rng);
    const val = SOLIDS[solid][attr]!;
    const answer = val * 2;
    const label = attr === "פאות" && solid !== "קוביה" ? "פאות שטוחות" : attr;
    return makeQuestion(
      `כמה ${label} יש ל${SOLID_PAIR[solid]} יחד?`,
      answer,
      ["סופרים גוף אחד, ואז מכפילים בשתיים", `לכל אחד מהם \`${val}\` ${label}`],
      [{ label: "מחברים:", math: `${val} + ${val} = ${answer}` }],
      SOLID_ANALOGIES[solid],
      rng,
    );
  }
  const sharedAttrs: SolidAttr[] = ["פאות", "קדקודים"];
  const attr = pick(sharedAttrs, rng);
  let a: string, b: string;
  do {
    a = pick(solids, rng);
    b = pick(solids, rng);
  } while (a === b);
  const valA = SOLIDS[a][attr]!;
  const valB = SOLIDS[b][attr]!;
  const useSum = valA === valB || rng() < 0.5;
  const labelFor = (solid: string) => (attr === "פאות" && solid !== "קוביה" ? "פאות שטוחות" : attr);

  if (useSum) {
    const answer = valA + valB;
    return makeQuestion(
      `ל${a} יש ${valA} ${labelFor(a)}, ול${b} יש ${valB} ${labelFor(b)} — כמה ${attr} יש להם בסך הכל?`,
      answer,
      ["סופרים כל גוף בנפרד, ואז מחברים", `\`${valA}\`+\`${valB}\``],
      [{ label: "מחברים:", math: `${valA} + ${valB} = ${answer}` }],
      `${SOLID_ANALOGIES[a]} ו${SOLID_ANALOGIES[b].replace(/^תסתכל\/י על /, "")}`,
      rng,
    );
  }
  const [hi, hiVal, lo, loVal] = valA >= valB ? [a, valA, b, valB] : [b, valB, a, valA];
  const answer = hiVal - loVal;
  return makeQuestion(
    `ל${hi} יש ${hiVal} ${labelFor(hi)}, ול${lo} יש ${loVal} ${labelFor(lo)} — בכמה יותר ${labelFor(hi)} יש ל${hi} מל${lo}?`,
    answer,
    ["סופרים כל גוף בנפרד, ואז מחסרים", `\`${hiVal}\`−\`${loVal}\``],
    [{ label: "מחסרים:", math: `${hiVal} - ${loVal} = ${answer}` }],
    `${SOLID_ANALOGIES[hi]} ו${SOLID_ANALOGIES[lo].replace(/^תסתכל\/י על /, "")}`,
    rng,
  );
}

/**
 * Three difficulty tiers, one per written bucket: a single plane-shape fact, two plane
 * facts combined, then solids (single or combined). Every tier's `answer` and any digit
 * inside a `steps`/`hint` string comes from the fixed lookup tables above, never a
 * formula — the tables are the reviewed content, verbatim.
 */
export function generateShapesQuestion(difficulty: number, rng: Rng = Math.random): Question {
  switch (Math.min(3, Math.max(1, Math.round(difficulty)))) {
    case 1:
      return planeFact(rng);
    case 2:
      return planeCombo(rng);
    default:
      return rng() < 0.5 ? solidFact(rng) : solidCombo(rng);
  }
}

export const SHAPES_MIN_DIFFICULTY = 1;
export const SHAPES_MAX_DIFFICULTY = 3;
export const SHAPES_INITIAL_DIFFICULTY = 1;
export const SHAPES_QUESTION_COUNT = 20;

/**
 * Same pace as every other adaptive topic — two in a row before pushing harder, one wrong
 * answer backs off immediately.
 */
export function nextShapesDifficulty(current: number, wasCorrect: boolean, streak: number): number {
  if (!wasCorrect) return Math.max(SHAPES_MIN_DIFFICULTY, current - 1);
  return streak >= 2 ? Math.min(SHAPES_MAX_DIFFICULTY, current + 1) : current;
}
