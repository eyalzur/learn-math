import type { Question } from "./curriculum";
import { type Rng, randInt, pick, makeFreshId } from "./adaptiveHelpers";

/**
 * "יחס ופרופורציה" (רותם, כיתה ו׳), built at runtime — see
 * docs/features/levels-as-practice/architecture.md.
 *
 * Five patterns read directly off the 30 written questions in `grade6.ts`: scaling one
 * side of a stated ratio, a "for every" word problem, a scaled recipe, splitting a total
 * by ratio, and splitting by a known difference.
 */

const freshId = makeFreshId("g6-ratio-adaptive");

/** [יחיד, רבים של אותו שם עצם, השם שנספר לפיו] — הרבים נשמר מפורש כדי לא לנחש ניקוד
 *  עברי ("כלב"/"כלבים", "ילד"/"ילדים" אינם נגזרים מוסיף סיומת קבועה). */
const FOR_EVERY_PAIRS: [string, string, string][] = [
  ["כלב", "כלבים", "חתולים"],
  ["מורה", "מורים", "תלמידים"],
  ["ילד", "ילדים", "בלונים"],
  ["כיתה", "כיתות", "מחברות"],
];

const RECIPE_ITEMS = ["כוסות קמח", "כוסות אורז", "כפות סוכר", "כוסות מים"];

function makeQuestion(
  prompt: string,
  answer: number,
  hints: [string, string],
  steps: { label: string; math?: string }[],
  analogy: string,
  rng: Rng,
): Question {
  return { id: freshId(rng), topic: "יחס ופרופורציה", prompt, answer, hints, steps, analogy };
}

/** Pattern 1 — "היחס הוא A ל-B. אם החלק הראשון הוא C, כמה השני?" */
function scaleFirstTerm(rng: Rng): Question {
  const a = randInt(1, 5, rng);
  const b = randInt(1, 5, rng);
  const k = randInt(2, 9, rng);
  const first = a * k;
  const answer = b * k;
  return makeQuestion(
    `היחס הוא ${a} ל-${b}. אם החלק הראשון הוא ${first}, כמה השני?`,
    answer,
    ["ביחס, מה שעושים לצד אחד עושים בדיוק גם לשני", `מ-\`${a}\` הגיעו ל-\`${first}\` — פי כמה? אותו דבר עושים ל-\`${b}\``],
    [
      { label: `מ-${a} ל-${first} זה פי ${k}` },
      { label: "", math: `${b} × ${k} = ${answer}` },
    ],
    `על כל ${a} מדבקות שאתה נותן מקבלים ${b}, נתת ${first}`,
    rng,
  );
}

/** Pattern 2 — "על כל X יש Y. יש N X-ים. כמה Y?" */
function forEvery(rng: Rng): Question {
  const [noun, nounPlural, plural] = pick(FOR_EVERY_PAIRS, rng);
  const rate = randInt(2, 5, rng);
  const count = randInt(2, 9, rng);
  const answer = rate * count;
  return makeQuestion(
    `על כל ${noun} יש ${rate} ${plural}. יש ${count} ${nounPlural}. כמה ${plural}?`,
    answer,
    ["כופלים את הכמות ביחס הקבוע", `\`${rate}\` ${plural} על כל ${noun}, ויש \`${count}\``],
    [{ label: `על כל ${noun} ${rate} ${plural}` }, { label: "", math: `${rate} × ${count} = ${answer}` }],
    `מקלט חיות שבו על כל ${noun} יש ${rate} ${plural}`,
    rng,
  );
}

/** Pattern 3 — scaled recipe: "מתכון ל-A אנשים דורש B כוסות X. כמה כוסות ל-C אנשים?" */
function scaledRecipe(rng: Rng): Question {
  const base = randInt(2, 6, rng);
  const item = pick(RECIPE_ITEMS, rng);
  const amount = randInt(1, 4, rng);
  const k = randInt(2, 4, rng);
  const people = base * k;
  const answer = amount * k;
  return makeQuestion(
    `מתכון ל-${base} אנשים דורש ${amount} ${item}. כמה ${item} ל-${people} אנשים?`,
    answer,
    ["כמה פי כמה גדל מספר האנשים — כך גדלה גם הכמות", `מ-\`${base}\` אנשים ל-\`${people}\` זה פי \`${k}\``],
    [{ label: "פי כמה גדל מספר האנשים?", math: `${people} ÷ ${base} = ${k}` }, { label: "", math: `${amount} × ${k} = ${answer}` }],
    `עוגה שמכינים למסיבה גדולה יותר מהמתכון המקורי`,
    rng,
  );
}

/** Pattern 4 — splitting a total by ratio, asking for either part. */
function splitTotal(rng: Rng): Question {
  const a = randInt(1, 6, rng);
  const b = randInt(1, 6, rng);
  const k = randInt(2, 8, rng);
  const total = (a + b) * k;
  const askLarge = rng() < 0.5;
  const larger = Math.max(a, b);
  const smaller = Math.min(a, b);
  const answer = (askLarge ? larger : smaller) * k;
  const which = askLarge ? "הגדול" : "הקטן";
  return makeQuestion(
    `היחס הוא ${a} ל-${b} והסך הכל ${total}. כמה בחלק ${which}?`,
    answer,
    ["מחברים את שני מספרי היחס — זה מספר החלקים הכולל", `\`${a}\` ועוד \`${b}\` הם \`${a + b}\` חלקים. \`${total}\` חלקי \`${a + b}\` נותן חלק אחד`],
    [
      { label: "סך החלקים:", math: `${a} + ${b} = ${a + b}` },
      { label: "שווי חלק אחד:", math: `${total} ÷ ${a + b} = ${k}` },
      { label: `החלק ${which}:`, math: `${k} × ${askLarge ? larger : smaller} = ${answer}` },
    ],
    `${total} שקלים שמתחלקים ביחס ${a} ל-${b} בין שני שותפים`,
    rng,
  );
}

/** Pattern 5 — splitting by a known difference between the two parts (asks the larger). */
function splitByDifference(rng: Rng): Question {
  const smallTerm = randInt(1, 5, rng);
  const largeTerm = smallTerm + randInt(1, 4, rng);
  const k = randInt(2, 8, rng);
  const diff = (largeTerm - smallTerm) * k;
  const answer = largeTerm * k;
  const termGap = largeTerm - smallTerm;
  const gapWord = termGap === 1 ? "חלק אחד" : `${termGap} חלקים`;
  return makeQuestion(
    `היחס הוא ${smallTerm} ל-${largeTerm} וההפרש בין החלקים הוא ${diff}. כמה בחלק הגדול?`,
    answer,
    ["ההפרש בין מספרי היחס שווה להפרש בין החלקים", `בין \`${smallTerm}\` ל-\`${largeTerm}\` יש \`${gapWord}\`, והוא שווה ל-\`${diff}\``],
    [
      { label: "ההפרש ביחידות היחס:", math: `${largeTerm} − ${smallTerm} = ${largeTerm - smallTerm}` },
      { label: "אז יחידה אחת שווה", math: `${diff} ÷ ${largeTerm - smallTerm} = ${k}` },
      { label: "החלק הגדול:", math: `${largeTerm} × ${k} = ${answer}` },
    ],
    `שני חבלים שאורכם ביחס קבוע, וההפרש ביניהם ${diff} מטרים`,
    rng,
  );
}

export function generateRatioQuestion(difficulty: number, rng: Rng = Math.random): Question {
  switch (Math.min(5, Math.max(1, Math.round(difficulty)))) {
    case 1:
      return scaleFirstTerm(rng);
    case 2:
      return forEvery(rng);
    case 3:
      return scaledRecipe(rng);
    case 4:
      return splitTotal(rng);
    default:
      return splitByDifference(rng);
  }
}

export const RATIO_MIN_DIFFICULTY = 1;
export const RATIO_MAX_DIFFICULTY = 5;
export const RATIO_INITIAL_DIFFICULTY = 1;
export const RATIO_QUESTION_COUNT = 20;

export function nextRatioDifficulty(current: number, wasCorrect: boolean, streak: number): number {
  if (!wasCorrect) return Math.max(RATIO_MIN_DIFFICULTY, current - 1);
  return streak >= 2 ? Math.min(RATIO_MAX_DIFFICULTY, current + 1) : current;
}
