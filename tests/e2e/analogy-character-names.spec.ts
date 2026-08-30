import { test, expect } from "@playwright/test";
import { grades } from "../../src/data/curriculum";
import type { Question } from "../../src/data/curriculum";
import { explainQuestion } from "../../src/data/explain";

/**
 * Acceptance criteria under test
 * (docs/features/analogy-character-names/product-spec.md):
 *  1. A single-character analogy in grade1/2/6/8's static question banks uses one of the
 *     three approved names — דניאל, יעל, נועם — instead of a generic description.
 *  2. A two-character analogy uses two *different* approved names.
 *  3. An analogy describing a group/quantity is left untouched — nothing can be named
 *     "40 students".
 *  4. Grammatical gender stays correct after the swap.
 *
 * The exact mapping of which question changed to what is
 * docs/features/analogy-character-names/architecture.md's table — this file checks the
 * data against that table rather than against the code that produced it.
 */

const everyQuestion = (): Question[] =>
  grades.flatMap((g) => g.topicSets.flatMap((t) => t.levels.flatMap((l) => l.questions)));

const analogyOf = (id: string): string => {
  const q = everyQuestion().find((q) => q.id === id);
  expect(q, `no question with id "${id}"`).toBeDefined();
  return explainQuestion(q!)!.analogy!;
};

test("single-character analogies now name one of the three approved characters", () => {
  const expected: Record<string, string> = {
    "g1-sub10-e4": "היו לך 4 ענבים ונתת 1 לדניאל",
    "g1-sub10-e9": "היו לך 5 פרחים ונתת 0 לנועם",
    "g1-sub10-m4": "היו לך 7 בלונים ונתת 5 לדניאל",
    "g1-sub10-m9": "היו לך 6 ענבים ונתת 5 לנועם",
    "g1-sub10-h4": "היו לך 9 פרחים ונתת 3 לדניאל",
    "g1-sub10-h9": "היו לך 10 בלונים ונתת 6 לנועם",
    "g1-addsub20-e9": "היו לך 17 סוכריות ונתת 2 לדניאל",
    "g1-addsub20-h4": "היו לך 14 סוכריות ונתת 6 לנועם",
    "g1-addsub20-h9": "היו לך 20 גולות ונתת 13 לדניאל",
    "g2-sub100-e1": "היו לך 28 מדבקות ונתת 5 ליעל",
    "g2-sub100-e4": "היו לך 36 ספרים והשאלת 2 לנועם — כמה יותר?",
    "g2-sub100-e5": "היו לך 78 קלפי משחק ונתת 6 לדניאל",
    "g2-sub100-m1": "היו לך 68 מדבקות ונתת 24 ליעל",
    "g2-sub100-m6": "היו לך 49 כרטיסי אספן ונתת 17 לדניאל",
    "g2-sub100-h1": "היו לך 52 מדבקות ונתת 8 ליעל",
    "g2-sub100-h6": "היו לך 45 כרטיסי אספן ונתת 19 לנועם",
  };
  for (const [id, text] of Object.entries(expected)) {
    expect(analogyOf(id), id).toBe(text);
  }
});

test("two-character analogies name two different approved characters", () => {
  const expected: Record<string, string> = {
    "g1-numbers-e7": "לדניאל יש 3 בלונים ולנועם 7 - למי יש יותר?",
    "g1-numbers-e8": "ליעל יש 9 בלונים ולדניאל 5 - למי יש יותר?",
    "g1-numbers-e9": "לנועם יש 6 בלונים וליעל 2 - למי יש יותר?",
    "g1-numbers-e10": "לדניאל יש 4 בלונים וליעל 8 - למי יש יותר?",
    "g6-fractions-e9": "50 שקלים שמתחלקים בין דניאל לנועם",
    "g6-ratio-m4": "21 סוכריות שמתחלקות ביחס 2 ל-5 בין דניאל לנועם",
    "g6-ratio-h3": "24 מדבקות שמתחלקות ביחס 1 ל-3 בין דניאל לנועם",
    "g6-ratio-h4": "דניאל ונועם שההפרש בגובהם 3 ס״מ והיחס ביניהם 4 ל-5",
    "g8-word-h2": "דניאל ונועם שיודעים כמה כסף יש להם יחד וכמה ההפרש",
    "g8-word-h7": "דניאל ונועם שיחד חסכו עשרים וארבעה, ואחד חסך שישה יותר",
  };
  const NAMES = ["דניאל", "יעל", "נועם"];
  for (const [id, text] of Object.entries(expected)) {
    const analogy = analogyOf(id);
    expect(analogy, id).toBe(text);
    const present = NAMES.filter((n) => analogy.includes(n));
    expect(present.length, `${id} should name exactly two characters — "${analogy}"`).toBe(2);
  }
});

test("a group or quantity analogy is never given a character's name", () => {
  // Explicitly out of scope per design.md's Rule ד — and g6-ratio-m8/g8-equations-h5 are
  // "מחברות"/"חברות סלולר" (notebooks/phone companies), not people at all, so naming them
  // would be a straightforwardly wrong edit rather than just an unwanted one.
  const unchanged: Record<string, string> = {
    "g6-fractions-e2": "פיצה של 40 פרוסות שמחלקים לארבעה חברים",
    "g6-ratio-m8": "בספרייה חמישה ספרים לכל שלושה מחברות, ויש עשרים וחמישה ספרים",
    "g8-equations-h5": "שתי חברות סלולר שהחשבון שלהן משתווה אחרי כמה חודשים",
  };
  for (const [id, text] of Object.entries(unchanged)) {
    expect(analogyOf(id), id).toBe(text);
  }
});

test("a queue-position analogy keeps its numbers — naming it would delete the question's own data", () => {
  const unchanged: Record<string, string> = {
    "g1-numbers-h1": "בתור לגלישה עומדים ילד מספר 6 וילד מספר 8 - מי באמצע?",
    "g1-numbers-h2": "בתור לגלישה עומדים ילד מספר 11 וילד מספר 13 - מי באמצע?",
    "g1-numbers-h3": "בתור לגלישה עומדים ילד מספר 14 וילד מספר 16 - מי באמצע?",
    "g1-numbers-h4": "בתור לגלישה עומדים ילד מספר 17 וילד מספר 19 - מי באמצע?",
  };
  for (const [id, text] of Object.entries(unchanged)) {
    expect(analogyOf(id), id).toBe(text);
  }
});

/**
 * Regression guard over the whole static curriculum (grade1/2/6/8 — the four files this
 * feature touched), not just the 26 questions changed. Scoped to `grades` (the static
 * tree) rather than added to content.spec.ts's RULES: RULES also runs against the 12
 * adaptive generators, and adaptiveSub100.ts still says "...לאח שלך" — that generator is
 * explicitly Out of Scope for this feature (see product-spec.md), so a rule catching it
 * here would fail on code this feature deliberately did not touch.
 *
 * Anchored to end-of-string for "לחבר"/"לחברה"/"לאח שלך"/"לאחות" rather than banning the
 * bare word: "לחבר את המספרים" (the verb "to add/connect") is legitimate math vocabulary
 * that shares a root with "לחבר" (to a friend) — the placeholder always ended the
 * sentence right there, the verb never does.
 */
test("no static-curriculum analogy regresses to a generic character placeholder", () => {
  const TAIL_PLACEHOLDERS = ["לחבר", "לחברה", "לאח שלך", "לאחות"];
  const ANYWHERE_PLACEHOLDERS = [
    "ילד אחד",
    "ילדה אחת",
    "תלמיד אחד",
    "תלמידה אחת",
    "שני אחים",
    "שתי אחיות",
  ];
  const violations: string[] = [];
  for (const q of everyQuestion()) {
    const analogy = explainQuestion(q)!.analogy ?? "";
    const trimmed = analogy.trim().replace(/[.?!]+$/, "");
    if (TAIL_PLACEHOLDERS.some((tail) => trimmed.endsWith(tail))) {
      violations.push(`${q.id} — generic character placeholder — "${analogy}"`);
      continue;
    }
    if (ANYWHERE_PLACEHOLDERS.some((phrase) => analogy.includes(phrase))) {
      violations.push(`${q.id} — generic character placeholder — "${analogy}"`);
    }
  }
  expect(violations, `\n${violations.join("\n")}\n`).toEqual([]);
});

test("no static-curriculum analogy names the same character twice", () => {
  const NAMES = ["דניאל", "יעל", "נועם"];
  const violations: string[] = [];
  for (const q of everyQuestion()) {
    const analogy = explainQuestion(q)!.analogy ?? "";
    for (const name of NAMES) {
      if (analogy.split(name).length - 1 > 1) {
        violations.push(`${q.id} — "${name}" named twice — "${analogy}"`);
      }
    }
  }
  expect(violations, `\n${violations.join("\n")}\n`).toEqual([]);
});
