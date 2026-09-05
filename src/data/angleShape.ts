import type { Question } from "./curriculum";

/**
 * Five drawings for the "angles and triangle congruence" topic, read off the question
 * itself the same way every other shape in this app is — built from `question.prompt`,
 * shown only if it reproduces `question.answer`.
 *
 * One module for all five `kind`s, not five separate modules: they are the same family
 * (a labelled angle/triangle diagram, arc-with-number vs. arc-with-"?"), the way
 * `geometryShape.ts` bundles rectangle/square/triangle/circle into one union rather than
 * `more-diagrams`'s one-module-per-shape split (justified there because those shapes truly
 * shared nothing). See docs/features/grade8-angles-congruence/architecture.md.
 *
 * Every prompt in this topic is written to one of twelve fixed sentence templates —
 * `readShape` matches by regex, exactly like `pythagorasTriangle.readShape` does for its
 * six templates. A question worded outside these templates simply gets no diagram; it is
 * still a valid question, just an unillustrated one (see architecture.md, Edge Cases).
 *
 * Type-only import of `Question`: erased at compile time, so it cannot form a runtime
 * cycle. The practice screen is the only caller.
 */
export type AngleShape =
  | {
      kind: "straightAngle";
      total: 90 | 180;
      known: number;
      caption: string;
      /** Structural description only — read by a screen reader while the diagram sits
       *  next to the question, before an answer. Never states the rule/method the way
       *  `caption` does (that stays gated behind a wrong answer, same as the two hints). */
      srLabel: string;
      /** Present on every variant (even where always `undefined`) so callers like
       *  `TopicLesson.tsx` can read `bundle.angle?.proof` without narrowing by `kind` —
       *  see `triangleAngles.proof` below for what actually populates it. */
      proof?: string;
    }
  | {
      kind: "triangleAngles";
      angleA: number;
      angleB: number;
      /** Interior third angle — always computed, even when the question asks for the
       *  exterior angle instead (the exterior mark sits beside it on the same drawing). */
      angleC: number;
      exterior: boolean;
      caption: string;
      srLabel: string;
      /** Short "why is this true" paragraph for the topic-lesson screen only — set only
       *  for the exterior-angle variant. `TopicLesson.tsx` just renders this if present;
       *  it has no idea what an exterior angle is. See docs/features/
       *  grade8-angles-congruence/design.md, "שיעור קצר 'למה זה נכון'". */
      proof?: string;
    }
  | {
      kind: "parallelLines";
      known: number;
      relation: "corresponding" | "alternate" | "coInterior";
      caption: string;
      srLabel: string;
      /** Set only for the `corresponding` relation — see `triangleAngles.proof` above. */
      proof?: string;
    }
  | {
      kind: "congruentTriangles";
      value: number;
      valueKind: "side" | "angle";
      caption: string;
      srLabel: string;
      proof?: string;
    }
  | {
      kind: "isoscelesTriangle";
      variant: "apexFromBase" | "baseFromApex" | "medianRightAngle";
      /** Whichever of apex/base angle the question gives — the other, and (for the
       *  median variant) `∡BAD`, are what the "?" marks and what gets verified. */
      given: number;
      caption: string;
      srLabel: string;
      proof?: string;
    };

/** The exterior-angle theorem, in a sentence a כיתה ח׳ student can follow without formal
 *  proof machinery — see design.md, "שיעור קצר 'למה זה נכון'". */
const EXTERIOR_ANGLE_PROOF =
  "הזווית החיצונית וזווית המשולש הסמוכה לה (הזווית הפנימית שלידה) יחד יוצרות קו ישר, שהוא `180°`. גם סכום שלוש זוויות המשולש הוא `180°`. משתי העובדות האלה יוצא שהזווית החיצונית שווה בדיוק לסכום שתי הזוויות הרחוקות ממנה — כל אחת מהעובדות, בדרכה שלה, 'משלימה' את אותה זווית פנימית סמוכה ל-`180°`.";

/** Corresponding angles between two parallel lines cut by a transversal — same "intuitive,
 *  not formal" register as the exterior-angle proof above. */
const CORRESPONDING_ANGLES_PROOF =
  "ישרים מקבילים שומרים על אותו כיוון לאורך כל הדרך. אם מזיזים את הישר `a` לאורך הישר החותך `c`, עד שהוא נופל בדיוק על הישר `b` (אפשר בדיוק כי הם מקבילים), הזווית שהוא יוצר עם `c` לא משתנה בדרך — ולכן הזווית המתאימה, באותו מקום ביחס לישר `b`, שווה לזווית המקורית.";

function num(s: string): number {
  return Number(s);
}

/** The shape and its numbers, read off the prompt — before anything is verified. */
function readShape(prompt: string): AngleShape | null {
  let m: RegExpMatchArray | null;

  if ((m = prompt.match(/^על קו ישר, שתי זוויות סמוכות\. אחת מהן `(\d+)°`\. מה גודל הזווית השנייה\?$/))) {
    const known = num(m[1]);
    return {
      kind: "straightAngle",
      total: 180,
      known,
      caption: `קו ישר הוא \`180°\` שלם. \`${known}°\` ממנו כבר ידועים, והשאר הוא הזווית המבוקשת`,
      srLabel: `איור: קו ישר שמחולק לשתי זוויות — אחת מסומנת \`${known}°\`, השנייה בסימן שאלה`,
    };
  }

  if (
    (m = prompt.match(
      /^בין שני ישרים נצבים \(זווית ישרה, `90°`\), שתי זוויות סמוכות\. אחת מהן `(\d+)°`\. מה גודל השנייה\?$/,
    ))
  ) {
    const known = num(m[1]);
    return {
      kind: "straightAngle",
      total: 90,
      known,
      caption: `שתי הזוויות יחד הן \`90°\`. \`${known}°\` מהן כבר ידועים, והשאר הוא הזווית המבוקשת`,
      srLabel: `איור: זווית ישרה (\`90°\`) שמחולקת לשתי זוויות — אחת מסומנת \`${known}°\`, השנייה בסימן שאלה`,
    };
  }

  if (
    (m = prompt.match(/^במשולש `ABC`, `∡A = (\d+)°` ו-`∡B = (\d+)°`\. מה גודל `∡C`\?$/))
  ) {
    const [angleA, angleB] = [num(m[1]), num(m[2])];
    return {
      kind: "triangleAngles",
      angleA,
      angleB,
      angleC: 180 - angleA - angleB,
      exterior: false,
      caption: "סכום הזוויות במשולש הוא תמיד `180°`",
      srLabel: `איור: משולש עם שתי זוויות מסומנות (\`${angleA}°\`, \`${angleB}°\`), והשלישית בסימן שאלה`,
    };
  }

  if (
    (m = prompt.match(
      /^במשולש `ABC`, `∡A = (\d+)°` ו-`∡B = (\d+)°`\. הצלע `BC` מוארכת מעבר ל-`C`\. מה גודל הזווית החיצונית שם\?$/,
    ))
  ) {
    const [angleA, angleB] = [num(m[1]), num(m[2])];
    return {
      kind: "triangleAngles",
      angleA,
      angleB,
      angleC: 180 - angleA - angleB,
      exterior: true,
      caption: "הזווית החיצונית שווה לסכום שתי הזוויות הפנימיות הרחוקות ממנה",
      srLabel: `איור: משולש עם שתי זוויות מסומנות (\`${angleA}°\`, \`${angleB}°\`), והזווית החיצונית בסימן שאלה`,
      proof: EXTERIOR_ANGLE_PROOF,
    };
  }

  if (
    (m = prompt.match(
      /^שני ישרים מקבילים `a` ו-`b`, וישר שלישי `c` חותך את שניהם\. הזווית בין `a` ל-`c` היא `(\d+)°`\. מה גודל הזווית המתאימה לה, בין `b` ל-`c`\?$/,
    ))
  ) {
    const known = num(m[1]);
    return {
      kind: "parallelLines",
      known,
      relation: "corresponding",
      caption: "שני ישרים מקבילים וישר חותך — הזוויות המתאימות שוות זו לזו",
      srLabel: `איור: שני ישרים מקבילים וישר חותך, עם זווית מסומנת \`${known}°\` וזווית מתאימה לה בסימן שאלה`,
      proof: CORRESPONDING_ANGLES_PROOF,
    };
  }

  if (
    (m = prompt.match(
      /^שני ישרים מקבילים `a` ו-`b`, וישר שלישי `c` חותך את שניהם\. הזווית בין `a` ל-`c` היא `(\d+)°`\. מה גודל הזווית המתחלפת עמה, בין `b` ל-`c`\?$/,
    ))
  ) {
    const known = num(m[1]);
    return {
      kind: "parallelLines",
      known,
      relation: "alternate",
      caption: "שני ישרים מקבילים וישר חותך — הזוויות המתחלפות שוות זו לזו",
      srLabel: `איור: שני ישרים מקבילים וישר חותך, עם זווית מסומנת \`${known}°\` וזווית מתחלפת לה בסימן שאלה`,
    };
  }

  if (
    (m = prompt.match(
      /^שני ישרים מקבילים `a` ו-`b`, וישר שלישי `c` חותך את שניהם\. הזווית בין `a` ל-`c` היא `(\d+)°`\. מה גודל הזווית החד-צדדית לה, בין `b` ל-`c`\?$/,
    ))
  ) {
    const known = num(m[1]);
    return {
      kind: "parallelLines",
      known,
      relation: "coInterior",
      caption: "שני ישרים מקבילים וישר חותך — הזוויות החד-צדדיות משלימות זו את זו ל-`180°`",
      srLabel: `איור: שני ישרים מקבילים וישר חותך, עם זווית מסומנת \`${known}°\` וזווית חד-צדדית לה בסימן שאלה`,
    };
  }

  if (
    (m = prompt.match(/^משולש `ABC` חופף למשולש `EDC`, `ABC ≅ EDC`\. `AB = (\d+)`\. מה אורך `ED`\?$/))
  ) {
    return {
      kind: "congruentTriangles",
      value: num(m[1]),
      valueKind: "side",
      caption: "שני משולשים חופפים — הצלעות המתאימות (לפי סדר האותיות בחפיפה) שוות באורכן",
      srLabel: `איור: שני משולשים חופפים, עם צלע אחת מסומנת \`${num(m[1])}\` והצלע המתאימה לה בסימן שאלה`,
    };
  }

  if (
    (m = prompt.match(/^משולש `ABC` חופף למשולש `EDC`, `ABC ≅ EDC`\. `∡A = (\d+)°`\. מה גודל `∡E`\?$/))
  ) {
    return {
      kind: "congruentTriangles",
      value: num(m[1]),
      valueKind: "angle",
      caption: "שני משולשים חופפים — הזוויות המתאימות (לפי סדר האותיות בחפיפה) שוות בגודלן",
      srLabel: `איור: שני משולשים חופפים, עם זווית אחת מסומנת \`${num(m[1])}°\` והזווית המתאימה לה בסימן שאלה`,
    };
  }

  if (
    (m = prompt.match(
      /^במשולש `ABC` שווה-השוקיים, `AB = AC`\. זווית הבסיס `∡B = (\d+)°`\. מה גודל זווית הראש `∡A`\?$/,
    ))
  ) {
    return {
      kind: "isoscelesTriangle",
      variant: "apexFromBase",
      given: num(m[1]),
      caption: "במשולש שווה-שוקיים זוויות הבסיס שוות זו לזו",
      srLabel: `איור: משולש שווה-שוקיים עם זווית בסיס מסומנת \`${num(m[1])}°\` וזווית הראש בסימן שאלה`,
    };
  }

  if (
    (m = prompt.match(
      /^במשולש `ABC` שווה-השוקיים, `AB = AC`\. זווית הראש `∡A = (\d+)°`\. מה גודל זווית הבסיס `∡B`\?$/,
    ))
  ) {
    return {
      kind: "isoscelesTriangle",
      variant: "baseFromApex",
      given: num(m[1]),
      caption: "במשולש שווה-שוקיים זוויות הבסיס שוות זו לזו",
      srLabel: `איור: משולש שווה-שוקיים עם זווית ראש מסומנת \`${num(m[1])}°\` וזווית בסיס בסימן שאלה`,
    };
  }

  if (
    (m = prompt.match(
      /^במשולש `ABC` שווה-השוקיים, `AB = AC`\. `AD` הוא התיכון מ-`A` לבסיס `BC`, ולכן גם גובה\. זווית הבסיס `∡B = (\d+)°`\. מה גודל `∡BAD`\?$/,
    ))
  ) {
    return {
      kind: "isoscelesTriangle",
      variant: "medianRightAngle",
      given: num(m[1]),
      caption: "במשולש שווה-שוקיים, התיכון מקודקוד הראש הוא גם גובה — הוא יוצר זווית ישרה בבסיס",
      srLabel: `איור: משולש שווה-שוקיים עם התיכון מהראש לבסיס, זווית בסיס מסומנת \`${num(m[1])}°\`, וזווית בין התיכון לשוק בסימן שאלה`,
    };
  }

  return null;
}

/** What the shape's own numbers say the marked-"?" value has to be. */
function expectedAnswer(shape: AngleShape): number {
  switch (shape.kind) {
    case "straightAngle":
      return shape.total - shape.known;
    case "triangleAngles":
      return shape.exterior ? shape.angleA + shape.angleB : shape.angleC;
    case "parallelLines":
      return shape.relation === "coInterior" ? 180 - shape.known : shape.known;
    case "congruentTriangles":
      return shape.value;
    case "isoscelesTriangle":
      switch (shape.variant) {
        case "apexFromBase":
          return 180 - 2 * shape.given;
        case "baseFromApex":
          return (180 - shape.given) / 2;
        case "medianRightAngle":
          return 90 - shape.given;
      }
  }
}

export function angleShape(question: Question): AngleShape | null {
  const shape = readShape(question.prompt);
  if (!shape) return null;

  // Every angle that ends up on the drawing has to be a whole, positive, sub-straight
  // degree value — a shape with a fractional or out-of-range angle has nothing sensible
  // to render.
  const angles =
    shape.kind === "straightAngle"
      ? [shape.known, shape.total - shape.known]
      : shape.kind === "triangleAngles"
        ? [shape.angleA, shape.angleB, shape.angleC, expectedAnswer(shape)]
        : shape.kind === "parallelLines"
          ? [shape.known, expectedAnswer(shape)]
          : shape.kind === "congruentTriangles"
            ? shape.valueKind === "angle"
              ? [shape.value]
              : []
            : [shape.given, expectedAnswer(shape)];
  if (angles.some((a) => !Number.isInteger(a) || a <= 0 || a >= 180)) return null;
  if (shape.kind === "congruentTriangles" && !Number.isInteger(shape.value)) return null;

  // The check with teeth: the "?" this shape draws has to reproduce the recorded answer.
  // Everything else on it came from the prompt, never from the answer.
  if (expectedAnswer(shape) !== question.answer) return null;

  return shape;
}
