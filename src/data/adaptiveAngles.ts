import type { Question } from "./curriculum";
import { type Rng, pick, randInt, makeFreshId, withoutLeakingHints } from "./adaptiveHelpers";

/**
 * "זוויות וחפיפת משולשים" (עומר, כיתה ח׳), built at runtime — see
 * docs/features/grade8-angles-congruence/architecture.md, "עדכון ארכיטקטורה — סבב ב׳".
 *
 * Twelve patterns, one per sentence template `angleShape.ts` already knows how to read —
 * this file never touches that extractor, it only ever emits prompts shaped exactly like
 * the ones the thirty written questions already use, so the diagram keeps working for
 * free. Every pattern's number ranges are chosen so the geometry is valid *by
 * construction* (the sum is always 180, the halved angle is always a whole number) rather
 * than validated after the fact and retried.
 */

const freshId = makeFreshId("g8-angles-adaptive");
const TOPIC = "זוויות וחפיפת משולשים";

function makeQuestion(
  prompt: string,
  answer: number,
  hints: [string, string],
  steps: { label: string; math?: string }[],
  analogy: string,
  rng: Rng,
): Question {
  return { id: freshId(rng), topic: TOPIC, prompt, answer, hints, steps, analogy };
}

// ---------------------------------------------------------------- tier 1: straight angle

function straightAngleLine(rng: Rng): Question {
  const known = randInt(20, 160, rng);
  const answer = 180 - known;
  return makeQuestion(
    `על קו ישר, שתי זוויות סמוכות. אחת מהן \`${known}°\`. מה גודל הזווית השנייה?`,
    answer,
    ["קו ישר שלם הוא תמיד `180°`", "מורידים את הזווית הידועה מ-`180`"],
    [{ label: "קו ישר שלם הוא `180°`" }, { label: "", math: `180 − ${known} = ${answer}` }],
    `גג משופע שנפגש עם קיר ישר, וזווית אחת בפגישה — \`${known}\` מעלות — כבר ידועה`,
    rng,
  );
}

function straightAngleRight(rng: Rng): Question {
  const known = randInt(10, 80, rng);
  const answer = 90 - known;
  return makeQuestion(
    `שתי זוויות משלימות זו לזו, וסכומן \`90°\`. אחת מהן \`${known}°\`. מה גודל השנייה?`,
    answer,
    ["שתי הזוויות יחד שוות `90°`", "מורידים את הזווית הידועה מ-`90`"],
    [{ label: "שתי הזוויות יחד הן `90°`" }, { label: "", math: `90 − ${known} = ${answer}` }],
    `פינת חדר ישרה שמחולקת לשני חלקים, ואחד מהם — \`${known}\` מעלות — כבר ידוע`,
    rng,
  );
}

// ------------------------------------------------------------- tier 2: triangle angles

/** Shared by both tier-2 patterns: a triangle whose three angles land in `[20, 160]` and
 *  sum to exactly `180` by construction — no rejection sampling needed. */
function triangleAngleTriple(rng: Rng): [number, number, number] {
  const angleA = randInt(20, 80, rng);
  const remaining = 180 - angleA; // 100..160
  const angleB = randInt(20, remaining - 20, rng);
  const angleC = remaining - angleB;
  return [angleA, angleB, angleC];
}

function triangleAnglesSum(rng: Rng): Question {
  const [angleA, angleB, angleC] = triangleAngleTriple(rng);
  const sum = angleA + angleB;
  return makeQuestion(
    `במשולש \`ABC\`, \`∡A = ${angleA}°\` ו-\`∡B = ${angleB}°\`. מה גודל \`∡C\`?`,
    angleC,
    ["סכום שלוש הזוויות במשולש הוא תמיד `180°`", "מחברים את שתי הזוויות הידועות, ומורידים מ-`180`"],
    [
      { label: "סכום הזוויות במשולש הוא `180°`" },
      { label: "", math: `${angleA} + ${angleB} = ${sum}` },
      { label: "", math: `180 − ${sum} = ${angleC}` },
    ],
    `מתלה תמונה משולש שתלוי על שני מסמרים בקיר, בזוויות \`${angleA}\` ו-\`${angleB}\` מעלות`,
    rng,
  );
}

function triangleAnglesExterior(rng: Rng): Question {
  const [angleA, angleB] = triangleAngleTriple(rng);
  const answer = angleA + angleB;
  return makeQuestion(
    `במשולש \`ABC\`, \`∡A = ${angleA}°\` ו-\`∡B = ${angleB}°\`. הצלע \`BC\` מוארכת מעבר ל-\`C\`. מה גודל הזווית החיצונית שם?`,
    answer,
    ["הזווית החיצונית שווה לסכום שתי הזוויות הפנימיות הרחוקות ממנה", "מחברים את שתי הזוויות הידועות במשולש"],
    [
      { label: "הזווית החיצונית שווה לסכום שתי הזוויות הפנימיות הרחוקות ממנה" },
      { label: "", math: `${angleA} + ${angleB} = ${answer}` },
    ],
    `גשר עם תמיכה משולשת שממשיכה מעבר לעמוד האחרון, בזוויות \`${angleA}\` ו-\`${angleB}\``,
    rng,
  );
}

// ------------------------------------------------------------- tier 3: parallel lines

function parallelLinesCorresponding(rng: Rng): Question {
  const known = randInt(20, 160, rng);
  return makeQuestion(
    `שני ישרים מקבילים \`a\` ו-\`b\`, וישר שלישי \`c\` חותך את שניהם. הזווית בין \`a\` ל-\`c\` היא \`${known}°\`. מה גודל הזווית המתאימה לה, בין \`b\` ל-\`c\`?`,
    known,
    ["בין שני ישרים מקבילים, הזוויות המתאימות שוות זו לזו", "הזווית המבוקשת שווה בדיוק לזווית הנתונה"],
    [{ label: "בין ישרים מקבילים, הזוויות המתאימות שוות" }, { label: "לכן הזווית המבוקשת שווה לזווית הנתונה" }],
    `שני פסי כביש מקבילים, וגשר עליון שחוצה את שניהם בזווית \`${known}\` מעלות`,
    rng,
  );
}

function parallelLinesAlternate(rng: Rng): Question {
  const known = randInt(20, 160, rng);
  return makeQuestion(
    `שני ישרים מקבילים \`a\` ו-\`b\`, וישר שלישי \`c\` חותך את שניהם. הזווית בין \`a\` ל-\`c\` היא \`${known}°\`. מה גודל הזווית המתחלפת עמה, בין \`b\` ל-\`c\`?`,
    known,
    ["בין שני ישרים מקבילים, הזוויות המתחלפות שוות זו לזו", "הזווית המבוקשת שווה בדיוק לזווית הנתונה"],
    [{ label: "בין ישרים מקבילים, הזוויות המתחלפות שוות" }, { label: "לכן הזווית המבוקשת שווה לזווית הנתונה" }],
    `שתי מסילות רכבת מקבילות, וקרן שמש שחוצה ביניהן בזווית \`${known}\` מעלות`,
    rng,
  );
}

function parallelLinesCoInterior(rng: Rng): Question {
  const known = randInt(20, 160, rng);
  const answer = 180 - known;
  return makeQuestion(
    `שני ישרים מקבילים \`a\` ו-\`b\`, וישר שלישי \`c\` חותך את שניהם. הזווית בין \`a\` ל-\`c\` היא \`${known}°\`. מה גודל הזווית החד-צדדית לה, בין \`b\` ל-\`c\`?`,
    answer,
    ["בין שני ישרים מקבילים, הזוויות החד-צדדיות משלימות זו את זו ל-`180°`", "מורידים את הזווית הידועה מ-`180`"],
    [
      { label: "הזוויות החד-צדדיות משלימות זו את זו ל-`180°`" },
      { label: "", math: `180 − ${known} = ${answer}` },
    ],
    `שני קווי גדר מקבילים בגינה, ושביל אלכסוני שחוצה ביניהם בזווית \`${known}\` מעלות`,
    rng,
  );
}

// ------------------------------------------------------------ tier 4: isosceles (base <-> apex)

function isoscelesApexFromBase(rng: Rng): Question {
  const given = randInt(10, 80, rng);
  const answer = 180 - 2 * given;
  return makeQuestion(
    `במשולש \`ABC\` שווה-השוקיים, \`AB = AC\`. זווית הבסיס \`∡B = ${given}°\`. מה גודל זווית הראש \`∡A\`?`,
    answer,
    ["במשולש שווה-שוקיים שתי זוויות הבסיס שוות זו לזו", "מכפילים את זווית הבסיס פי `2`, ומורידים מ-`180`"],
    [
      { label: "זוויות הבסיס שוות זו לזו" },
      { label: "", math: `${given} × 2 = ${given * 2}` },
      { label: "", math: `180 − ${given * 2} = ${answer}` },
    ],
    `אוהל משולש עם שתי דפנות שוות שנשענות בסיס-בבסיס, בזווית בסיס \`${given}\` מעלות`,
    rng,
  );
}

function isoscelesBaseFromApex(rng: Rng): Question {
  const given = 2 * randInt(5, 80, rng); // always even, so (180-given)/2 is a whole number
  const answer = (180 - given) / 2;
  return makeQuestion(
    `במשולש \`ABC\` שווה-השוקיים, \`AB = AC\`. זווית הראש \`∡A = ${given}°\`. מה גודל זווית הבסיס \`∡B\`?`,
    answer,
    ["במשולש שווה-שוקיים שתי זוויות הבסיס שוות זו לזו", "מורידים את זווית הראש מ-`180`, ומחלקים ב-`2`"],
    [
      { label: "זוויות הבסיס שוות זו לזו" },
      { label: "", math: `180 − ${given} = ${180 - given}` },
      { label: "", math: `${180 - given} ÷ 2 = ${answer}` },
    ],
    `מייבש כביסה משולש שנפתח לשני צדדים שווים בדיוק, בזווית ראש \`${given}\` מעלות`,
    rng,
  );
}

// -------------------------------------------------------- tier 5: congruent triangles

function congruentTrianglesSide(rng: Rng): Question {
  const value = randInt(4, 20, rng);
  return makeQuestion(
    `משולש \`ABC\` חופף למשולש \`EDC\`, \`ABC ≅ EDC\`. \`AB = ${value}\`. מה אורך \`ED\`?`,
    value,
    [
      "במשולשים חופפים, הצלעות המתאימות (לפי סדר האותיות בחפיפה) שוות באורכן",
      "מסתכלים על סדר האותיות `ABC ≅ EDC` כדי לדעת מי מול מי",
    ],
    [{ label: "הצלעות המתאימות בין משולשים חופפים שוות" }, { label: "לפי סדר האותיות, `ED` תואמת ל-`AB`" }],
    `שני שלטי דרך משולשים זהים בשני צדי אותו כביש, כשצלע אחת אורכה \`${value}\``,
    rng,
  );
}

function congruentTrianglesAngle(rng: Rng): Question {
  const value = randInt(15, 150, rng);
  return makeQuestion(
    `משולש \`ABC\` חופף למשולש \`EDC\`, \`ABC ≅ EDC\`. \`∡A = ${value}°\`. מה גודל \`∡E\`?`,
    value,
    [
      "במשולשים חופפים, הזוויות המתאימות (לפי סדר האותיות בחפיפה) שוות בגודלן",
      "מסתכלים על סדר האותיות `ABC ≅ EDC` כדי לדעת מי מול מי",
    ],
    [{ label: "הזוויות המתאימות בין משולשים חופפים שוות" }, { label: "לפי סדר האותיות, `∡E` תואמת ל-`∡A`" }],
    `שני חלקי גג רעפים זהים שנשענים באותו שיפוע בדיוק, בזווית \`${value}\` מעלות`,
    rng,
  );
}

// ------------------------------------------------------ tier 6: isosceles median = height

function isoscelesMedianRightAngle(rng: Rng): Question {
  const given = randInt(10, 80, rng);
  const answer = 90 - given;
  return makeQuestion(
    `במשולש \`ABC\` שווה-השוקיים, \`AB = AC\`. \`AD\` הוא התיכון מ-\`A\` לבסיס \`BC\`, ולכן גם גובה. זווית הבסיס \`∡B = ${given}°\`. מה גודל \`∡BAD\`?`,
    answer,
    ["במשולש שווה-שוקיים, התיכון מקודקוד הראש הוא גם גובה", "הגובה יוצר זווית ישרה (`90°`) עם הבסיס"],
    [
      { label: "התיכון `AD` הוא גם גובה, ולכן `∡ADB` הוא `90°`" },
      { label: "", math: `90 − ${given} = ${answer}` },
    ],
    `עמוד תאורה ניצב בדיוק לאמצע כביש משופע, כשזווית הבסיס שלו \`${given}\` מעלות`,
    rng,
  );
}

// ------------------------------------------------------------------------------- tiers

const TIERS: ((rng: Rng) => Question)[][] = [
  [straightAngleLine, straightAngleRight],
  [triangleAnglesSum, triangleAnglesExterior],
  [parallelLinesCorresponding, parallelLinesAlternate, parallelLinesCoInterior],
  [isoscelesApexFromBase, isoscelesBaseFromApex],
  [congruentTrianglesSide, congruentTrianglesAngle],
  [isoscelesMedianRightAngle],
];

export function generateAnglesQuestion(difficulty: number, rng: Rng = Math.random): Question {
  const tier = TIERS[Math.min(TIERS.length, Math.max(1, Math.round(difficulty))) - 1];
  return withoutLeakingHints(() => pick(tier, rng)(rng));
}

export const ANGLES_MIN_DIFFICULTY = 1;
export const ANGLES_MAX_DIFFICULTY = TIERS.length;
export const ANGLES_INITIAL_DIFFICULTY = 1;
export const ANGLES_QUESTION_COUNT = 20;

export function nextAnglesDifficulty(current: number, wasCorrect: boolean, streak: number): number {
  if (!wasCorrect) return Math.max(ANGLES_MIN_DIFFICULTY, current - 1);
  return streak >= 2 ? Math.min(ANGLES_MAX_DIFFICULTY, current + 1) : current;
}
