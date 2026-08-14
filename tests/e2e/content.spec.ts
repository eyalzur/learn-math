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

test("every question explains itself with steps and an analogy", () => {
  for (const { q } of everyQuestion()) {
    const explanation = explainQuestion(q);
    expect(explanation, `${q.id} has no explanation`).not.toBeNull();
    expect(explanation!.steps.length, `${q.id} has no steps`).toBeGreaterThan(0);
    expect(explanation!.analogy?.trim(), `${q.id} has no analogy`).toBeTruthy();
  }
});

test("arithmetic is never left in an explanation's prose field", () => {
  // The prose element is not direction-isolated, so "20 ÷ 2 = 10" left there renders
  // reversed. normalizeStep is supposed to move it into the maths field.
  const MATH_RUN = /[0-9]\s*[+−\-×÷=]|[+−×÷=]\s*[0-9]|√/;
  for (const { q } of everyQuestion()) {
    for (const step of explainQuestion(q)!.steps) {
      expect(step.label ?? "", `${q.id}: arithmetic left in prose — "${step.label}"`).not.toMatch(
        MATH_RUN,
      );
    }
  }
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

test("nobody eats something that cannot be eaten", () => {
  // Seven of these shipped: "16 בולים בצלחת, אכלתם 3" — stamps, on a plate, eaten. Three
  // were spotted by reading; the rest only turned up when something looked for the shape.
  const INEDIBLE =
    /(בולים|מדבקות|קוביות|כדורים|עפרונות|חרוזים|גולות|בלונים|צדפים|פרחים|ספרים)[^.]{0,25}אכל/;
  for (const { q } of everyQuestion()) {
    const analogy = explainQuestion(q)!.analogy;
    expect(analogy, `${q.id}: ${analogy}`).not.toMatch(INEDIBLE);
  }
});

test("algebra inside a Hebrew sentence is marked so it can be isolated", () => {
  // Unmarked, the bidi algorithm mirrors the brackets: "3(x + 2)" renders "3)2 + x(".
  const HEBREW = /[֐-׿]/;
  const ALGEBRA = /[a-zA-Z]\s*[=+\-−*/²³]|=|\([^)]*[+\-−][^)]*\)|\b\d+[a-zA-Z]\b/;
  for (const { q } of everyQuestion()) {
    if (!HEBREW.test(q.prompt)) continue; // a bare expression is rendered LTR wholesale
    const unmarked = promptSegments(q.prompt)
      .filter((s) => s.kind === "text")
      .map((s) => s.value)
      .join(" ");
    expect(unmarked, `${q.id}: unmarked algebra in "${q.prompt}"`).not.toMatch(ALGEBRA);
  }
});

test("where hints exist there are exactly two, and they do not give the answer away", () => {
  const withHints = everyQuestion().filter(({ q }) => q.hints);
  expect(withHints.length, "no question has hints at all").toBeGreaterThan(0);

  for (const { q } of withHints) {
    expect(q.hints, `${q.id}`).toHaveLength(2);

    // A number already in the question is a given, not a leak.
    const answer = String(q.answer);
    const isGiven = new RegExp(`(^|[^0-9])${answer}([^0-9]|$)`).test(q.prompt);

    for (const hint of q.hints!) {
      expect(hint.trim(), `${q.id} has an empty hint`).toBeTruthy();
      if (!isGiven) {
        expect(hint, `${q.id}: a hint hands over the answer ${answer}`).not.toMatch(
          new RegExp(`(^|[^0-9])${answer}([^0-9]|$)`),
        );
      }
      // Numbers inside a hint need the same marking as the prompts.
      const unmarked = promptSegments(hint)
        .filter((s) => s.kind === "text")
        .map((s) => s.value)
        .join(" ");
      expect(unmarked, `${q.id}: unmarked number in hint "${hint}"`).not.toMatch(/\d/);
    }
  }
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
