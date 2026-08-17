import { grade1Topics } from "./grade1";
import { grade2Topics } from "./grade2";
import { grade6Topics } from "./grade6";
import { grade8Topics } from "./grade8";
import { level } from "./level";

export { level };

export interface Question {
  id: string;
  /** Must be one of the owning grade's `topics`. */
  topic: string;
  /** Shown as-is. Either a bare expression ("23 + 45") or a Hebrew word problem. */
  prompt: string;
  /**
   * Two hints, asked for before answering: the method stated generally, then the first
   * concrete step on the question's own numbers.
   *
   * A fixed pair rather than an array — the spec calls for exactly two, and a `string[]`
   * would push "not one, not three" out to a runtime check the compiler could have made.
   *
   * Required, now that all 330 questions carry hints. It was optional while the content
   * was being written topic by topic, and the moment that finished it stopped being
   * honest: optional means a new question with no hints compiles, and the child who meets
   * it gets no help. Required means the compiler refuses, and names the question — the
   * same reason `analogy` is required.
   */
  hints: readonly [string, string];
  answer: number;
  /**
   * Worked steps for questions that cannot be broken down by computing from operands —
   * word problems, equations, geometry. Bare arithmetic leaves this out and gets its
   * steps generated instead.
   */
  steps?: { label: string; math?: string }[];
  /**
   * One sentence tying the maths to something the student already knows, pitched at
   * their age. This is the part that makes a rule stick rather than sound arbitrary,
   * so every question carries one.
   */
  analogy: string;
  /**
   * Which kind of exercise this is — the unit a teacher teaches in. See `style.ts` for
   * the names and the grouping.
   *
   * Optional *here* and required at every declaration site that has been classified, via
   * `StyledQuestion` below. Required on this shared type would break the 360 questions in
   * grades 6 and 8 that no person has classified yet, and classifying them means writing
   * new questions, not guessing labels.
   *
   * The failure mode that matters — a new grade-1 question slipping in with no style — is
   * still impossible, because that file declares through `StyledQuestion`. When grades 6
   * and 8 are classified this moves onto `Question` and `StyledQuestion` goes away.
   */
  style?: string;
}

/**
 * A question whose style a person has decided.
 *
 * Grade 1 declares its content through this, so the compiler refuses a question with no
 * style and names it — the same reason `analogy` and `hints` are required. Optional would
 * make forgetting count as approval, and the content most likely to be forgotten is the
 * content nobody has looked at yet.
 */
export type StyledQuestion = Question & { style: string };

export interface Level {
  id: "easy" | "medium" | "hard";
  title: string;
  description: string;
  questions: Question[];
}

export interface Topic {
  id: string;
  title: string;
  /**
   * Has a person actually read this topic's content?
   *
   * Required, not optional, and that is the whole point: optional would make forgetting
   * count as approval — a new topic with no decision would arrive as `undefined` and any
   * reasonable check would treat it as fine. The content that most needs reading is
   * exactly the content nobody has read yet. Required means the compiler refuses a topic
   * whose status nobody decided, the same reason `analogy` is required.
   */
  reviewed: boolean;
  levels: Level[];
}

/**
 * Every grade practises topic by topic.
 *
 * This was a discriminated union while grades 6 and 8 waited on their topic content,
 * so the compiler would point at every place that had to handle both shapes. That job is
 * done: with no grade left on mixed levels, a union of one is not a union, and keeping the
 * dead arm would only make every consumer carry a branch nothing can reach and no test can
 * cover.
 */
export type Grade = {
  id: string;
  label: string;
  /** A single glyph identifying the grade on a card — e.g. `"א"` — for a screen where a
   *  pre-reader has to tell grades apart at a glance, not just by the label text. */
  shortLabel: string;
  topics: string[];
  topicSets: Topic[];
};

export interface Student {
  id: string;
  name: string;
  gradeId: string;
  /**
   * The full set of grades this student can practise in, in display order — set only for
   * a student with more than one. Absent means exactly one grade, `gradeId`, same as
   * before this field existed; nothing about a single-grade student changes.
   */
  gradeIds?: string[];
}

const GRADE_1_TOPICS = [
  "מספרים עד 20",
  "חיבור עד 10",
  "חיסור עד 10",
  "חיבור וחיסור עד 20",
  "עשרות ויחידות",
];

export const students: Student[] = [
  { id: "mika", name: "מיקה", gradeId: "1", gradeIds: ["1", "2"] },
  { id: "rotem", name: "רותם", gradeId: "6" },
  { id: "omer", name: "עומר", gradeId: "8" },
];


// ---------------------------------------------------------------- כיתה א׳

const grade1: Grade = {
  id: "1",
  label: "כיתה א׳",
  shortLabel: "א",
  topics: GRADE_1_TOPICS,
  topicSets: grade1Topics,
};

// ---------------------------------------------------------------- כיתה ב׳

const GRADE_2_TOPICS = ["חיבור עד 100", "חיסור עד 100"];

const grade2: Grade = {
  id: "2",
  label: "כיתה ב׳",
  shortLabel: "ב",
  topics: GRADE_2_TOPICS,
  topicSets: grade2Topics,
};

// ---------------------------------------------------------------- כיתה ו׳

const GRADE_6_TOPICS = [
  "שברים פשוטים",
  "שברים עשרוניים",
  "אחוזים",
  "יחס ופרופורציה",
  "שטח והיקף",
  "ממוצע",
];

const grade6: Grade = {
  id: "6",
  label: "כיתה ו׳",
  shortLabel: "ו",
  topics: GRADE_6_TOPICS,
  topicSets: grade6Topics,
};

const GRADE_8_TOPICS = [
  "ביטויים אלגבריים",
  "משוואות",
  "חזקות ושורשים",
  "משפט פיתגורס",
  "פונקציה קווית",
  "בעיות מילוליות",
];

const grade8: Grade = {
  id: "8",
  label: "כיתה ח׳",
  shortLabel: "ח",
  topics: GRADE_8_TOPICS,
  topicSets: grade8Topics,
};

export const grades: Grade[] = [grade1, grade2, grade6, grade8];

export function gradeById(id: string): Grade {
  const grade = grades.find((g) => g.id === id);
  if (!grade) throw new Error(`No grade "${id}"`);
  return grade;
}

export function gradeOf(student: Student): Grade {
  try {
    return gradeById(student.gradeId);
  } catch {
    throw new Error(`No grade "${student.gradeId}" for student "${student.id}"`);
  }
}

/**
 * Every grade a student can practise in, in display order. A plain `[gradeOf(student)]`
 * for the common case — one grade, same as before this existed — so every existing
 * caller that only ever expected one grade keeps working without noticing this exists.
 */
export function availableGrades(student: Student): Grade[] {
  return student.gradeIds ? student.gradeIds.map(gradeById) : [gradeOf(student)];
}

/**
 * Word problems must render RTL and bare expressions LTR. Getting this backwards is how
 * "2 + 3 =" once shipped reversed, so the direction follows the content rather than a
 * blanket rule on the container.
 */
export function isHebrewPrompt(prompt: string): boolean {
  return /[֐-׿]/.test(prompt);
}

export interface PromptSegment {
  kind: "text" | "math";
  value: string;
}

/**
 * Splits a prompt on `backticks` into Hebrew prose and algebraic runs.
 *
 * An expression sitting inside an RTL sentence gets mangled by the bidi algorithm —
 * "3(x + 2)" renders as "3)2 + x(", with the brackets mirrored and the terms reordered.
 * Marking the maths lets each run be isolated in its own LTR element, which is the only
 * reliable fix; no amount of styling on the surrounding paragraph corrects it.
 */
export function promptSegments(prompt: string): PromptSegment[] {
  return prompt
    .split(/`([^`]*)`/)
    .map((value, i): PromptSegment => ({ kind: i % 2 === 1 ? "math" : "text", value }))
    .filter((segment) => segment.value !== "");
}
