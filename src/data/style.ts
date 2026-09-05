import type { Question, Topic } from "./curriculum";

/**
 * What kind of exercise a question is — the unit a lesson is taught in.
 *
 * A topic is the unit of the syllabus, not of the lesson. "מספרים עד 20" holds five
 * different kinds of question, and a teacher does not teach all five in one day: they
 * teach one, and the class goes over it. This module is what lets a child practise the
 * one that was taught.
 *
 * **Lives apart from curriculum.ts for the same reason `level.ts` does.** Grade files are
 * imported *by* curriculum.ts, so anything they might reach for cannot live there — that
 * circular import already shipped once as a white screen that TypeScript did not catch.
 * The type import above is erased at build time and adds no runtime edge.
 *
 * Note that `grade1.ts` does **not** import from here. It writes style ids as plain
 * strings, and the link between a string and its entry below is enforced by a test rather
 * than by the compiler — deliberately, because importing constants is exactly the edge
 * that broke the project before. See architecture.md, decision 3.
 */

/**
 * Every style's Hebrew name, decided by a person.
 *
 * This is the half a machine cannot infer. Which questions group together is derivable
 * from the data; what to *call* the group is a judgement — "עשר ועוד" rather than
 * "חיבור", because `10 + 6` in this topic is a lesson about how a number is built and
 * not about adding.
 *
 * Ids are unique across the whole app, not per topic: "חיבור" appears as a style in two
 * different topics, and `add10`/`add20` keeps them from colliding on one key here.
 *
 * Names carry no digits on purpose — "עשר ועוד", not "10 ועוד". A name without a numeral
 * cannot be broken by the page's bidi algorithm, which is a bug this project has shipped
 * three times.
 */
export const STYLE_META: Record<string, { title: string }> = {
  // מספרים עד 20
  after: { title: "מה בא אחרי" },
  before: { title: "מה בא לפני" },
  bigger: { title: "מה גדול יותר" },
  smaller: { title: "מה קטן יותר" },
  between: { title: "מה נמצא באמצע" },

  // חיבור עד 10 · חיסור עד 10 — one style each, so no picker ever shows them
  add10: { title: "חיבור" },
  sub10: { title: "חיסור" },

  // חיבור וחיסור עד 20
  add20: { title: "חיבור" },
  sub20: { title: "חיסור" },

  // עשרות ויחידות
  tens: { title: "כמה עשרות" },
  units: { title: "כמה יחידות" },
  tenPlusUnits: { title: "עשרת ועוד כמה" },
  tenPlus: { title: "עשר ועוד" },
  digitGap: { title: "איזו ספרה גדולה יותר" },
  toTwenty: { title: "כמה חסר עד עשרים" },

  // חיבור עד 1000 · חיסור עד 1000 — one style each, so no picker ever shows them
  add100: { title: "חיבור" },
  sub100: { title: "חיסור" },

  // כפל וחילוק · צורות וגופים · שעון וזמן — one style each, same reason
  muldiv: { title: "כפל וחילוק" },
  shapes: { title: "צורות וגופים" },
  clock: { title: "שעון וזמן" },
};

/**
 * What a practice screen actually needs: a name and some questions.
 *
 * `Level` already satisfies this structurally, so every existing call site keeps passing
 * a `Level` unchanged and a style lesson is simply another shape that fits. That is what
 * keeps the practice screen, the result screen, the read-aloud, the diagnosis and the
 * pictures out of this feature entirely.
 */
export interface Lesson {
  title: string;
  questions: Question[];
}

export interface Style {
  id: string;
  title: string;
  /** The style's first question — the example shown on its card. Derived, never written. */
  example: Question;
  questions: Question[];
}

/** Below this a "lesson" is not repetition, it is a handful of questions. */
const MIN_QUESTIONS = 3;

/**
 * The styles a topic divides into, in the order they first appear.
 *
 * Walks the levels in `easy → medium → hard` order, which is also what satisfies the
 * spec's requirement that a lesson's questions climb: the ordering falls out of the walk
 * rather than being a second sort applied afterwards.
 *
 * Returns empty for a topic whose questions carry no style — every grade past the first,
 * for now — and the caller reads that as "this topic has no style lessons".
 */
export function stylesOf(topic: Topic): Style[] {
  const order = ["easy", "medium", "hard"] as const;
  const groups = new Map<string, Question[]>();

  for (const id of order) {
    const level = topic.levels.find((l) => l.id === id);
    if (!level) continue;
    for (const question of level.questions) {
      if (!question.style) continue;
      groups.set(question.style, [...(groups.get(question.style) ?? []), question]);
    }
  }

  return [...groups.entries()]
    .filter(([, questions]) => questions.length >= MIN_QUESTIONS)
    .map(([id, questions]) => ({
      id,
      title: STYLE_META[id]?.title ?? id,
      example: questions[0],
      questions,
    }));
}

/**
 * Whether this topic is entered by picking a style rather than a level.
 *
 * One style is not a choice, so a topic that holds only one keeps the level screen it has
 * today. The same call decides where "back" returns to, which is why navigation needs no
 * remembered origin — a stored one can drift from the data and strand a seven-year-old on
 * a screen she was never on.
 */
export function hasStyleLessons(topic: Topic): boolean {
  return stylesOf(topic).length >= 2;
}
