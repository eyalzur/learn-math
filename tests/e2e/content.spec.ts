import { test, expect } from "@playwright/test";
import { grades, promptSegments } from "../../src/data/curriculum";
import type { Question } from "../../src/data/curriculum";
import { explainQuestion } from "../../src/data/explain";

/**
 * Content correctness, checked against the data rather than through the browser.
 *
 * These used to be UI walks: open every level of every grade, answer every question
 * wrong, read the explanation off the screen. That worked until review-status started
 * blocking unreviewed topics — at which point the tests could no longer reach the very
 * content they existed to verify. A guard that switches off the detector.
 *
 * Reading the data directly fixes that for good, and is the more honest shape anyway:
 * "every analogy is unique" was never a statement about the browser. It also turns four
 * minutes of clicking into a few milliseconds.
 *
 * What stays in the UI specs is what genuinely needs a screen — that an explanation
 * appears after a wrong answer, that arithmetic renders left-to-right, that a hint button
 * behaves. Those are about rendering and behaviour, not about content.
 */

/** How many questions a level of this grade should hold. */
const LEVEL_SIZE: Record<string, number> = { "1": 10, "6": 5, "8": 5 };

const everyQuestion = (): { gradeId: string; topic: string; q: Question }[] =>
  grades.flatMap((g) =>
    g.topicSets.flatMap((t) =>
      t.levels.flatMap((l) => l.questions.map((q) => ({ gradeId: g.id, topic: t.title, q }))),
    ),
  );

test("every grade offers topics, each with three levels of the right size", () => {
  for (const grade of grades) {
    expect(grade.topicSets.length, `${grade.label} has no topics`).toBeGreaterThan(0);
    for (const topic of grade.topicSets) {
      expect(topic.levels, `${grade.label}/${topic.title}`).toHaveLength(3);
      for (const level of topic.levels) {
        expect(
          level.questions.length,
          `${grade.label}/${topic.title}/${level.id}`,
        ).toBe(LEVEL_SIZE[grade.id]);
      }
    }
  }
});

test("every question sits under the topic it claims, and that topic is in the syllabus", () => {
  for (const grade of grades) {
    for (const topic of grade.topicSets) {
      expect(grade.topics, `"${topic.title}" is not in ${grade.label}'s syllabus`).toContain(
        topic.title,
      );
      for (const level of topic.levels) {
        for (const q of level.questions) {
          // A student who picks "אחוזים" must not be handed a question about area.
          expect(q.topic, `${q.id} sits under "${topic.title}"`).toBe(topic.title);
        }
      }
    }
  }
});

/**
 * Rules that apply to a single question.
 *
 * Each returns a sentence describing what is wrong, or null when the question is fine.
 * One test runs every rule over every question and reports all violations at once —
 * whoever adds a rule wants to see all twelve places it catches, not fix one and re-run.
 *
 * **Adding a rule is adding an entry here.** See
 * `.claude/skills/_shared/references/content-rules.md` for when a review comment is worth
 * turning into one, and when it is better fixed in place.
 */
const RULES: {
  name: string;
  // Most rules need only the question. `gradeId` is there for the ones that don't mean the
  // same thing in every grade — "סכום" is ordinary vocabulary in grade 8 and textbook
  // language to a seven-year-old. Rules that don't care simply declare one parameter.
  check: (q: Question, gradeId: string) => string | null;
}[] = [
  {
    name: "has an explanation with steps and an analogy",
    check: (q) => {
      const e = explainQuestion(q);
      if (!e) return "no explanation at all";
      if (e.steps.length === 0) return "an explanation with no steps";
      if (!e.analogy?.trim()) return "no analogy";
      return null;
    },
  },
  {
    name: "keeps arithmetic out of the prose field",
    check: (q) => {
      // The prose element is not direction-isolated, so "20 ÷ 2 = 10" left there renders
      // reversed. normalizeStep is meant to move it into the maths field.
      const MATH_RUN = /[0-9]\s*[+−\-×÷=]|[+−×÷=]\s*[0-9]|√/;
      for (const step of explainQuestion(q)!.steps) {
        if (MATH_RUN.test(step.label ?? "")) {
          return `arithmetic left in the prose field — "${step.label}"`;
        }
      }
      return null;
    },
  },
  {
    name: "does not have anyone eating something inedible",
    check: (q) => {
      // Seven of these shipped: "16 בולים בצלחת, אכלתם 3" — stamps, on a plate, eaten.
      // Three were spotted by reading; the other four only turned up once a rule looked.
      const INEDIBLE =
        /(בולים|מדבקות|קוביות|כדורים|עפרונות|חרוזים|גולות|בלונים|צדפים|פרחים|ספרים)[^.]{0,25}אכל/;
      const analogy = explainQuestion(q)!.analogy;
      return INEDIBLE.test(analogy) ? `something inedible is eaten — "${analogy}"` : null;
    },
  },
  {
    name: "marks algebra sitting inside a Hebrew sentence",
    check: (q) => {
      // Unmarked, the bidi algorithm mirrors the brackets: "3(x + 2)" renders "3)2 + x(".
      const HEBREW = /[֐-׿]/;
      const ALGEBRA = /[a-zA-Z]\s*[=+\-−*/²³]|=|\([^)]*[+\-−][^)]*\)|\b\d+[a-zA-Z]\b/;
      if (!HEBREW.test(q.prompt)) return null; // a bare expression renders LTR wholesale
      const unmarked = promptSegments(q.prompt)
        .filter((s) => s.kind === "text")
        .map((s) => s.value)
        .join(" ");
      return ALGEBRA.test(unmarked) ? `unmarked algebra in "${q.prompt}"` : null;
    },
  },
  {
    name: "keeps its hints to exactly two, without giving the answer away",
    check: (q) => {
      if (!q.hints) return null; // not every topic has hints yet
      if (q.hints.length !== 2) return `${q.hints.length} hints instead of two`;

      // A number already in the question is a given, not a leak.
      const answer = String(q.answer);
      const leak = new RegExp(`(^|[^0-9])${answer}([^0-9]|$)`);
      const isGiven = leak.test(q.prompt);

      for (const hint of q.hints) {
        if (!hint.trim()) return "an empty hint";
        if (!isGiven && leak.test(hint)) return `a hint hands over the answer — "${hint}"`;
        const unmarked = promptSegments(hint)
          .filter((s) => s.kind === "text")
          .map((s) => s.value)
          .join(" ");
        if (/\d/.test(unmarked)) return `an unmarked number in a hint — "${hint}"`;
      }
      return null;
    },
  },
  {
    name: "puts its hints in a first-grader's Hebrew, not a textbook's",
    check: (q, gradeId) => {
      // Reported on g1-addsub20-e1: "העשרת לא זזה, מוסיפים רק ליחידות". The idea was
      // right and the wording was a teacher's manual. Mika is seven and still learning to
      // read; "ה-10 נשאר במקום, ומחברים רק את המספרים הקטנים" says the same thing.
      //
      // Grade 1 only — "סכום" and "הפרש" are just words by grade 6. And the terms are
      // fair game in the topic that exists to teach them, which is why the topic title is
      // consulted instead of banning them outright: a hint for "עשרות ויחידות" has no
      // other way to name its own subject.
      if (gradeId !== "1" || !q.hints) return null;
      const TEXTBOOK = /עשרת|עשרות|יחידות|מחוברים|סכום|הפרש|מחובר/;
      if (TEXTBOOK.test(q.topic)) return null;
      for (const hint of q.hints) {
        const found = hint.match(TEXTBOOK);
        if (found) return `textbook Hebrew for a seven-year-old — "${found[0]}" in "${hint}"`;
      }
      return null;
    },
  },
  {
    name: "names the target a hint is working towards",
    check: (q, gradeId) => {
      // Reported on g1-addsub20-m3: "`9` צריך עוד `1`. מתוך `4`, כמה נשאר להוסיף?" —
      // needs one more *to reach what?* The method being taught is completing to ten, and
      // leaving the ten unsaid asks the child to already know the thing the hint exists to
      // teach. Five of the ten read that way; only one was noticed by eye.
      if (gradeId !== "1" || !q.hints) return null;
      for (const hint of q.hints) {
        if (/צריך עוד|כמה חסר/.test(hint) && !/10/.test(hint)) {
          return `a hint says what is needed without naming the target — "${hint}"`;
        }
      }
      return null;
    },
  },
];

test("every question passes every content rule", () => {
  const violations: string[] = [];
  for (const { gradeId, q } of everyQuestion()) {
    for (const rule of RULES) {
      const problem = rule.check(q, gradeId);
      if (problem) violations.push(`${q.id} — ${rule.name}: ${problem}`);
    }
  }
  expect(violations, `\n${violations.join("\n")}\n`).toEqual([]);
});

test("every analogy is written for its own question, not reused", () => {
  const seen = new Map<string, string>();
  for (const { q } of everyQuestion()) {
    const analogy = explainQuestion(q)!.analogy;
    expect(analogy.length, `${q.id}'s analogy is too short to be one`).toBeGreaterThan(10);
    const first = seen.get(analogy);
    expect(first, `${q.id} reuses ${first}'s analogy: "${analogy}"`).toBeUndefined();
    seen.set(analogy, q.id);
  }
});

test("hints exist somewhere", () => {
  // The hint rule above only fires on questions that have hints, so it would pass happily
  // on a codebase where every hint had been deleted. This is the floor under it.
  const withHints = everyQuestion().filter(({ q }) => q.hints);
  expect(withHints.length, "no question has hints at all").toBeGreaterThan(0);
});

test("review status is decided for every topic", () => {
  for (const grade of grades) {
    for (const topic of grade.topicSets) {
      expect(
        typeof topic.reviewed,
        `${grade.label}/${topic.title} has no review decision`,
      ).toBe("boolean");
    }
  }
});
