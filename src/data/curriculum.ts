export interface Question {
  id: string;
  /** Must be one of the owning grade's `topics`. */
  topic: string;
  /** Shown as-is. Either a bare expression ("23 + 45") or a Hebrew word problem. */
  prompt: string;
  answer: number;
}

export interface Level {
  id: "easy" | "medium" | "hard";
  title: string;
  description: string;
  questions: Question[];
}

export interface Grade {
  id: string;
  label: string;
  topics: string[];
  levels: Level[];
}

export interface Student {
  id: string;
  name: string;
  gradeId: string;
}

export const students: Student[] = [
  { id: "mika", name: "מיקה", gradeId: "1" },
  { id: "rotem", name: "רותם", gradeId: "6" },
  { id: "omer", name: "עומר", gradeId: "8" },
];

const LEVEL_META = {
  easy: { title: "קל", description: "להתחלה בטוחה" },
  medium: { title: "בינוני", description: "כשכבר יודעים את הבסיס" },
  hard: { title: "מתקדם", description: "לאתגר אמיתי" },
} as const;

function level(id: Level["id"], questions: Question[]): Level {
  return { id, ...LEVEL_META[id], questions };
}

// ---------------------------------------------------------------- כיתה א׳

const GRADE_1_TOPICS = [
  "מספרים עד 20",
  "חיבור עד 10",
  "חיסור עד 10",
  "חיבור וחיסור עד 20",
  "עשרות ויחידות",
];

const grade1: Grade = {
  id: "1",
  label: "כיתה א׳",
  topics: GRADE_1_TOPICS,
  levels: [
    level("easy", [
      { id: "g1-e1", topic: "חיבור עד 10", prompt: "3 + 2", answer: 5 },
      { id: "g1-e2", topic: "חיבור עד 10", prompt: "4 + 5", answer: 9 },
      { id: "g1-e3", topic: "חיבור עד 10", prompt: "6 + 1", answer: 7 },
      { id: "g1-e4", topic: "חיבור עד 10", prompt: "2 + 2", answer: 4 },
      { id: "g1-e5", topic: "חיסור עד 10", prompt: "7 − 3", answer: 4 },
      { id: "g1-e6", topic: "חיסור עד 10", prompt: "9 − 6", answer: 3 },
      { id: "g1-e7", topic: "חיסור עד 10", prompt: "8 − 2", answer: 6 },
      { id: "g1-e8", topic: "חיסור עד 10", prompt: "10 − 5", answer: 5 },
      { id: "g1-e9", topic: "מספרים עד 20", prompt: "איזה מספר בא אחרי 7?", answer: 8 },
      { id: "g1-e10", topic: "מספרים עד 20", prompt: "מה גדול יותר, 6 או 9?", answer: 9 },
    ]),
    level("medium", [
      { id: "g1-m1", topic: "חיבור וחיסור עד 20", prompt: "12 + 5", answer: 17 },
      { id: "g1-m2", topic: "חיבור וחיסור עד 20", prompt: "14 + 3", answer: 17 },
      { id: "g1-m3", topic: "חיבור וחיסור עד 20", prompt: "11 + 8", answer: 19 },
      { id: "g1-m4", topic: "חיבור וחיסור עד 20", prompt: "18 − 4", answer: 14 },
      { id: "g1-m5", topic: "חיבור וחיסור עד 20", prompt: "16 − 5", answer: 11 },
      { id: "g1-m6", topic: "חיבור וחיסור עד 20", prompt: "19 − 7", answer: 12 },
      { id: "g1-m7", topic: "עשרות ויחידות", prompt: "כמה עשרות יש במספר 15?", answer: 1 },
      { id: "g1-m8", topic: "עשרות ויחידות", prompt: "כמה יחידות יש במספר 13?", answer: 3 },
      { id: "g1-m9", topic: "עשרות ויחידות", prompt: "10 + 7", answer: 17 },
      { id: "g1-m10", topic: "מספרים עד 20", prompt: "איזה מספר בא לפני 20?", answer: 19 },
    ]),
    level("hard", [
      { id: "g1-h1", topic: "חיבור וחיסור עד 20", prompt: "8 + 5", answer: 13 },
      { id: "g1-h2", topic: "חיבור וחיסור עד 20", prompt: "7 + 8", answer: 15 },
      { id: "g1-h3", topic: "חיבור וחיסור עד 20", prompt: "9 + 7", answer: 16 },
      { id: "g1-h4", topic: "חיבור וחיסור עד 20", prompt: "6 + 9", answer: 15 },
      { id: "g1-h5", topic: "חיבור וחיסור עד 20", prompt: "9 + 9", answer: 18 },
      { id: "g1-h6", topic: "חיבור וחיסור עד 20", prompt: "15 − 8", answer: 7 },
      { id: "g1-h7", topic: "חיבור וחיסור עד 20", prompt: "13 − 9", answer: 4 },
      { id: "g1-h8", topic: "חיבור וחיסור עד 20", prompt: "17 − 8", answer: 9 },
      { id: "g1-h9", topic: "חיבור וחיסור עד 20", prompt: "14 − 6", answer: 8 },
      { id: "g1-h10", topic: "עשרות ויחידות", prompt: "20 − 12", answer: 8 },
    ]),
  ],
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
  topics: GRADE_6_TOPICS,
  levels: [
    level("easy", [
      { id: "g6-e1", topic: "שברים פשוטים", prompt: "כמה זה חצי מ-20?", answer: 10 },
      { id: "g6-e2", topic: "שברים פשוטים", prompt: "כמה זה רבע מ-40?", answer: 10 },
      { id: "g6-e3", topic: "שברים פשוטים", prompt: "כמה זה שליש מ-30?", answer: 10 },
      { id: "g6-e4", topic: "שברים עשרוניים", prompt: "0.5 + 0.3", answer: 0.8 },
      { id: "g6-e5", topic: "שברים עשרוניים", prompt: "1.2 + 2.5", answer: 3.7 },
      { id: "g6-e6", topic: "אחוזים", prompt: "כמה זה 10% מ-200?", answer: 20 },
      { id: "g6-e7", topic: "אחוזים", prompt: "כמה זה 50% מ-60?", answer: 30 },
      { id: "g6-e8", topic: "שטח והיקף", prompt: "שטח מלבן שאורכו 5 ורוחבו 4", answer: 20 },
      { id: "g6-e9", topic: "שטח והיקף", prompt: "היקף ריבוע שצלעו 6", answer: 24 },
      { id: "g6-e10", topic: "ממוצע", prompt: "הממוצע של 4 ושל 8", answer: 6 },
    ]),
    level("medium", [
      { id: "g6-m1", topic: "שברים פשוטים", prompt: "כמה זה שלושה רבעים מ-100?", answer: 75 },
      { id: "g6-m2", topic: "שברים פשוטים", prompt: "כמה זה שתי חמישיות מ-50?", answer: 20 },
      { id: "g6-m3", topic: "שברים עשרוניים", prompt: "2.4 × 10", answer: 24 },
      { id: "g6-m4", topic: "שברים עשרוניים", prompt: "7.5 − 2.5", answer: 5 },
      { id: "g6-m5", topic: "אחוזים", prompt: "כמה זה 25% מ-80?", answer: 20 },
      { id: "g6-m6", topic: "אחוזים", prompt: "כמה זה 20% מ-150?", answer: 30 },
      { id: "g6-m7", topic: "יחס ופרופורציה", prompt: "היחס הוא 2 ל-3. אם החלק הראשון הוא 10, כמה השני?", answer: 15 },
      { id: "g6-m8", topic: "שטח והיקף", prompt: "שטח משולש שבסיסו 10 וגובהו 6", answer: 30 },
      { id: "g6-m9", topic: "שטח והיקף", prompt: "היקף מלבן שאורכו 8 ורוחבו 3", answer: 22 },
      { id: "g6-m10", topic: "ממוצע", prompt: "הממוצע של 10, 20 ו-30", answer: 20 },
    ]),
    level("hard", [
      { id: "g6-h1", topic: "שברים פשוטים", prompt: "כמה זה שני שלישים מ-90?", answer: 60 },
      { id: "g6-h2", topic: "שברים עשרוניים", prompt: "0.25 × 80", answer: 20 },
      { id: "g6-h3", topic: "שברים עשרוניים", prompt: "1.5 × 4", answer: 6 },
      { id: "g6-h4", topic: "אחוזים", prompt: "מחיר 200 שקלים בהנחה של 15%. כמה שקלים ההנחה?", answer: 30 },
      { id: "g6-h5", topic: "אחוזים", prompt: "מחיר 80 שקלים עלה ב-25%. מה המחיר החדש?", answer: 100 },
      { id: "g6-h6", topic: "יחס ופרופורציה", prompt: "היחס הוא 3 ל-5 והסך הכל 40. כמה בחלק הגדול?", answer: 25 },
      { id: "g6-h7", topic: "שטח והיקף", prompt: "שטח מלבן הוא 12 ורוחבו 3. מה האורך?", answer: 4 },
      { id: "g6-h8", topic: "שטח והיקף", prompt: "היקף מעגל שרדיוסו 10, כאשר פאי שווה 3", answer: 60 },
      { id: "g6-h9", topic: "ממוצע", prompt: "הממוצע של 5 מספרים הוא 12. מה הסכום שלהם?", answer: 60 },
      { id: "g6-h10", topic: "שברים פשוטים", prompt: "כמה שלמים יש בשלושה רבעים ועוד רבע?", answer: 1 },
    ]),
  ],
};

// ---------------------------------------------------------------- כיתה ח׳

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
  topics: GRADE_8_TOPICS,
  levels: [
    level("easy", [
      { id: "g8-e1", topic: "משוואות", prompt: "x + 7 = 12", answer: 5 },
      { id: "g8-e2", topic: "משוואות", prompt: "3x = 15", answer: 5 },
      { id: "g8-e3", topic: "משוואות", prompt: "x − 6 = 10", answer: 16 },
      { id: "g8-e4", topic: "חזקות ושורשים", prompt: "2³", answer: 8 },
      { id: "g8-e5", topic: "חזקות ושורשים", prompt: "5²", answer: 25 },
      { id: "g8-e6", topic: "חזקות ושורשים", prompt: "√49", answer: 7 },
      { id: "g8-e7", topic: "ביטויים אלגבריים", prompt: "כמה זה `2x + 3` כאשר `x` שווה 4?", answer: 11 },
      { id: "g8-e8", topic: "ביטויים אלגבריים", prompt: "כמה זה `x² + 1` כאשר `x` שווה 2?", answer: 5 },
      { id: "g8-e9", topic: "ביטויים אלגבריים", prompt: "כנסו איברים: `3x + 5x`. מה המקדם של `x`?", answer: 8 },
      { id: "g8-e10", topic: "משפט פיתגורס", prompt: "במשולש ישר זווית הניצבים הם 3 ו-4. מה אורך היתר?", answer: 5 },
    ]),
    level("medium", [
      { id: "g8-m1", topic: "משוואות", prompt: "2x + 5 = 17", answer: 6 },
      { id: "g8-m2", topic: "משוואות", prompt: "4x − 3 = 21", answer: 6 },
      { id: "g8-m3", topic: "משוואות", prompt: "5x + 2 = 3x + 10", answer: 4 },
      { id: "g8-m4", topic: "חזקות ושורשים", prompt: "2³ × 2²", answer: 32 },
      { id: "g8-m5", topic: "חזקות ושורשים", prompt: "√81", answer: 9 },
      { id: "g8-m6", topic: "ביטויים אלגבריים", prompt: "פתחו סוגריים: `3(x + 2)`. מה המספר החופשי?", answer: 6 },
      { id: "g8-m7", topic: "משפט פיתגורס", prompt: "במשולש ישר זווית הניצבים הם 6 ו-8. מה אורך היתר?", answer: 10 },
      { id: "g8-m8", topic: "פונקציה קווית", prompt: "בפונקציה `y = 2x + 1`, כמה `y` כאשר `x` שווה 3?", answer: 7 },
      { id: "g8-m9", topic: "פונקציה קווית", prompt: "מה השיפוע של הישר `y = 3x − 4`?", answer: 3 },
      { id: "g8-m10", topic: "בעיות מילוליות", prompt: "מחיר עלה מ-40 ל-50 שקלים. בכמה אחוזים הוא עלה?", answer: 25 },
    ]),
    level("hard", [
      { id: "g8-h1", topic: "משוואות", prompt: "3(x + 4) = 27", answer: 5 },
      { id: "g8-h2", topic: "משוואות", prompt: "2(x − 3) + 4 = 10", answer: 6 },
      { id: "g8-h3", topic: "חזקות ושורשים", prompt: "(2³)²", answer: 64 },
      { id: "g8-h4", topic: "חזקות ושורשים", prompt: "√144", answer: 12 },
      { id: "g8-h5", topic: "ביטויים אלגבריים", prompt: "כמה זה `2x² − 5` כאשר `x` שווה 3?", answer: 13 },
      { id: "g8-h6", topic: "משפט פיתגורס", prompt: "במשולש ישר זווית היתר הוא 13 וניצב אחד הוא 5. מה הניצב השני?", answer: 12 },
      { id: "g8-h7", topic: "פונקציה קווית", prompt: "בפונקציה `y = −2x + 10`, כמה `x` כאשר `y` שווה 0?", answer: 5 },
      { id: "g8-h8", topic: "פונקציה קווית", prompt: "הישר `y = 4x + 2` עובר בנקודה שבה `y` שווה 14. כמה `x`?", answer: 3 },
      { id: "g8-h9", topic: "בעיות מילוליות", prompt: "אוטובוס נסע 180 קילומטר ב-3 שעות. מה המהירות הממוצעת?", answer: 60 },
      { id: "g8-h10", topic: "בעיות מילוליות", prompt: "סכום שני מספרים הוא 20 וההפרש ביניהם 4. מה המספר הגדול?", answer: 12 },
    ]),
  ],
};

export const grades: Grade[] = [grade1, grade6, grade8];

export function gradeOf(student: Student): Grade {
  const grade = grades.find((g) => g.id === student.gradeId);
  if (!grade) throw new Error(`No grade "${student.gradeId}" for student "${student.id}"`);
  return grade;
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
