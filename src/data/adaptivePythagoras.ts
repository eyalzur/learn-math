import type { Question } from "./curriculum";
import { type Rng, pick, makeFreshId } from "./adaptiveHelpers";

/**
 * "משפט פיתגורס" (עומר, כיתה ח׳), built at runtime — see
 * docs/features/levels-as-practice/architecture.md.
 *
 * Every pattern draws its two legs and hypotenuse from a pool of Pythagorean triples —
 * the same numbers the 30 written questions already use — scaled by a small random
 * factor, so every generated triangle is exact (no rounded square roots). Five patterns:
 * find the hypotenuse, find a leg from the hypotenuse, the same shape phrased as a
 * rectangle's diagonal, a ladder-against-a-wall phrasing, and equal legs from area.
 */

const freshId = makeFreshId("g8-pythagoras-adaptive");

/** Base triples read directly off the written questions (3,4,5 through 20,21,29). */
const TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [6, 8, 10],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
  [9, 12, 15],
  [12, 16, 20],
];

function scaledTriple(rng: Rng, maxScale: number): [number, number, number] {
  const [a, b, c] = pick(TRIPLES, rng);
  const scale = 1 + Math.floor(rng() * maxScale);
  return [a * scale, b * scale, c * scale];
}

/** The four smallest triples, for the opening difficulty tier — a first encounter with
 *  the theorem is always the most familiar numbers, not a random pick from the full pool
 *  (which reaches as high as `20, 21, 29`). */
const SMALL_TRIPLES = TRIPLES.slice(0, 4);

function makeQuestion(
  prompt: string,
  answer: number,
  hints: [string, string],
  steps: { label: string; math?: string }[],
  analogy: string,
  rng: Rng,
): Question {
  return { id: freshId(rng), topic: "משפט פיתגורס", prompt, answer, hints, steps, analogy };
}

/** Pattern 1 — given both legs, find the hypotenuse. The opening tier only, so it draws
 *  from the four smallest triples with no scaling, instead of `scaledTriple`'s full pool. */
function findHypotenuse(rng: Rng): Question {
  const [legA, legB, hyp] = pick(SMALL_TRIPLES, rng);
  return makeQuestion(
    `במשולש ישר זווית הניצבים הם ${legA} ו-${legB}. מה אורך היתר?`,
    hyp,
    ["היתר בריבוע שווה לסכום ריבועי שני הניצבים", `\`${legA}\` בריבוע ועוד \`${legB}\` בריבוע, ואז שורש`],
    [
      { label: "היתר בריבוע שווה לסכום ריבועי הניצבים" },
      { label: "", math: `${legA}² + ${legB}² = ${legA * legA + legB * legB}` },
      { label: "", math: `√${legA * legA + legB * legB} = ${hyp}` },
    ],
    `מדרגות שגובהן ${legB} ורוחבן ${legA} - כמה ארוך המעקה מעליהן`,
    rng,
  );
}

/** Pattern 2 — given the hypotenuse and one leg, find the other leg. */
function findLeg(rng: Rng): Question {
  const [legA, legB, hyp] = scaledTriple(rng, 3);
  const given = pick([legA, legB], rng);
  const answer = given === legA ? legB : legA;
  return makeQuestion(
    `במשולש ישר זווית היתר הוא ${hyp} וניצב אחד הוא ${given}. מה הניצב השני?`,
    answer,
    ["כשמחפשים ניצב, מחסרים מריבוע היתר את ריבוע הניצב הידוע", `\`${hyp}\` בריבוע פחות \`${given}\` בריבוע, ואז שורש`],
    [
      { label: "הניצב בריבוע שווה להיתר בריבוע פחות הניצב האחר בריבוע" },
      { label: "", math: `${hyp}² − ${given}² = ${hyp * hyp - given * given}` },
      { label: "", math: `√${hyp * hyp - given * given} = ${answer}` },
    ],
    `מוט באורך ${hyp} שנשען על קיר, כשרגלו ${given} מטר ממנו`,
    rng,
  );
}

/** Pattern 3 — the same shape phrased as a rectangle's diagonal. */
function rectangleDiagonal(rng: Rng): Question {
  const [legA, legB, hyp] = scaledTriple(rng, 3);
  const given = pick([legA, legB], rng);
  const answer = given === legA ? legB : legA;
  return makeQuestion(
    `אלכסון של מלבן הוא ${hyp} וצלע אחת ${given}. מה הצלע השנייה?`,
    answer,
    ["האלכסון של מלבן הוא היתר של משולש ישר זווית", `\`${hyp}\` בריבוע פחות \`${given}\` בריבוע, ואז שורש`],
    [
      { label: "האלכסון הוא היתר של משולש ישר זווית" },
      { label: "", math: `${hyp}² − ${given}² = ${hyp * hyp - given * given}` },
      { label: "", math: `√${hyp * hyp - given * given} = ${answer}` },
    ],
    `מסך שהאלכסון שלו ${hyp} והרוחב ${given} - מה הגובה`,
    rng,
  );
}

/** Pattern 4 — ladder against a wall (same math as pattern 2, different framing). */
function ladder(rng: Rng): Question {
  const [legA, legB, hyp] = scaledTriple(rng, 3);
  const given = pick([legA, legB], rng);
  const answer = given === legA ? legB : legA;
  return makeQuestion(
    `סולם באורך ${hyp} נשען על קיר, וקצהו העליון בגובה ${given}. כמה רגלו רחוקה מהקיר?`,
    answer,
    ["הסולם הוא היתר, והקיר והקרקע הם הניצבים", `\`${hyp}\` בריבוע פחות \`${given}\` בריבוע, ואז שורש`],
    [
      { label: "הסולם הוא היתר, והקיר והקרקע הם שני הניצבים" },
      { label: "", math: `${hyp}² − ${given}² = ${hyp * hyp - given * given}` },
      { label: "", math: `√${hyp * hyp - given * given} = ${answer}` },
    ],
    `כמה להרחיק את בסיס הסולם כדי להגיע לגובה ${given}`,
    rng,
  );
}

/** Pattern 5 — equal legs from area (leg chosen even so the area stays a whole number). */
function equalLegsFromArea(rng: Rng): Question {
  const leg = pick([4, 6, 8, 10, 12, 14, 16], rng);
  const area = (leg * leg) / 2;
  return makeQuestion(
    `שני הניצבים שווים ושטח המשולש ${area}. מה אורך כל ניצב?`,
    leg,
    ["שטח משולש ישר זווית הוא מכפלת הניצבים חלקי `2`", `אם שניהם שווים, המכפלה שלהם היא \`${area}\` כפול \`2\``],
    [
      { label: "שטח משולש ישר זווית זה מכפלת הניצבים חלקי 2" },
      { label: "מכפלת הניצבים:", math: `${area} × 2 = ${leg * leg}` },
      { label: "אם שניהם שווים:", math: `${leg} × ${leg} = ${leg * leg}` },
    ],
    `פינה משולשת בגינה ששתי צלעותיה שוות`,
    rng,
  );
}

export function generatePythagorasQuestion(difficulty: number, rng: Rng = Math.random): Question {
  switch (Math.min(5, Math.max(1, Math.round(difficulty)))) {
    case 1:
      return findHypotenuse(rng);
    case 2:
      return findLeg(rng);
    case 3:
      return rectangleDiagonal(rng);
    case 4:
      return ladder(rng);
    default:
      return equalLegsFromArea(rng);
  }
}

export const PYTHAGORAS_MIN_DIFFICULTY = 1;
export const PYTHAGORAS_MAX_DIFFICULTY = 5;
export const PYTHAGORAS_INITIAL_DIFFICULTY = 1;
export const PYTHAGORAS_QUESTION_COUNT = 20;

export function nextPythagorasDifficulty(current: number, wasCorrect: boolean, streak: number): number {
  if (!wasCorrect) return Math.max(PYTHAGORAS_MIN_DIFFICULTY, current - 1);
  return streak >= 2 ? Math.min(PYTHAGORAS_MAX_DIFFICULTY, current + 1) : current;
}
