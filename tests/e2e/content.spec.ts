import { test, expect } from "@playwright/test";
import { grades, promptSegments } from "../../src/data/curriculum";
import type { Question } from "../../src/data/curriculum";
import { explainQuestion } from "../../src/data/explain";
import { fractionDiagram } from "../../src/data/fractionDiagram";
import { verticalSum } from "../../src/data/verticalSum";
import { numberLine } from "../../src/data/numberLine";
import { tenFrame } from "../../src/data/tenFrame";
import { twentyStrip } from "../../src/data/twentyStrip";
import { geometryShape } from "../../src/data/geometryShape";
import { pythagorasTriangle } from "../../src/data/pythagorasTriangle";
import { percentStrip } from "../../src/data/percentStrip";
import { ratioStrips } from "../../src/data/ratioStrips";
import { linearGraph } from "../../src/data/linearGraph";
import { STYLE_META, stylesOf, hasStyleLessons } from "../../src/data/style";
import { generateAdd100Question } from "../../src/data/adaptiveAdd100";
import { generateAdd10Question } from "../../src/data/adaptiveAdd10";
import { generateSub10Question } from "../../src/data/adaptiveSub10";
import { generateSub100Question } from "../../src/data/adaptiveSub100";
import { generateMulDivQuestion } from "../../src/data/adaptiveMulDiv";
import { generateShapesQuestion } from "../../src/data/adaptiveShapes";
import { generateClockQuestion } from "../../src/data/adaptiveClock";
import { clockFace } from "../../src/data/clockFace";
import { generateFractionsQuestion } from "../../src/data/adaptiveFractions";
import { generateDecimalsQuestion } from "../../src/data/adaptiveDecimals";
import { generatePercentQuestion } from "../../src/data/adaptivePercent";
import { generateRatioQuestion } from "../../src/data/adaptiveRatio";
import { generateAreaPerimeterQuestion } from "../../src/data/adaptiveAreaPerimeter";
import { generateAverageQuestion } from "../../src/data/adaptiveAverage";
import { generateExpressionsQuestion } from "../../src/data/adaptiveExpressions";
import { generateEquationsQuestion } from "../../src/data/adaptiveEquations";
import { generatePowersQuestion } from "../../src/data/adaptivePowers";
import { generatePythagorasQuestion } from "../../src/data/adaptivePythagoras";
import { generateLinearFunctionQuestion } from "../../src/data/adaptiveLinearFunction";
import { generateWordProblemsQuestion } from "../../src/data/adaptiveWordProblems";

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
const LEVEL_SIZE: Record<string, number> = { "1": 10, "2": 10, "6": 10, "8": 10 };

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
    name: "never says how far without saying from what",
    check: (q) => {
      // "סופרים רחוק יותר ממה? כנראה התכוונת מ-0" — a comparative distance with no
      // starting point is not a weak explanation, it is an unanswerable one, and a child
      // who cannot follow it has no way to say so.
      //
      // What is banned is a **comparative** distance with nothing to compare against —
      // "רחוק יותר", "פחות רחוק" — because that is the form that carries the explanation
      // and leaves the child no way to check it. The word itself is innocent: "כמה רגלו
      // רחוקה מהקיר" names its anchor, and "נסיעה בין שתי ערים רחוקות" is a description,
      // not a claim about which number is bigger. A first draft of this rule banned the
      // word and flagged both; narrow and right beats broad and needing exemptions.
      //
      // An adjacent מ-word makes it legal again, which is what allows the permitted
      // "רחוק יותר מ-`0`". Catching the comparative rather than one fixed phrase is what
      // makes it find "פחות רחוק" too — the string search this replaced knew only one
      // word order and missed four real cases because of it.
      const e = explainQuestion(q)!;
      const texts = [
        q.prompt,
        e.analogy ?? "",
        ...q.hints,
        ...e.steps.map((s) => s.label ?? ""),
      ];
      for (const text of texts) {
        const words = text.split(/\s+/);
        for (let i = 0; i < words.length; i++) {
          if (!/^רחוק/.test(words[i])) continue;
          const near = words.slice(Math.max(0, i - 1), i + 3);
          const comparative = near.some((w) => /^(יותר|פחות|הכי)/.test(w));
          const anchored = near.some((w) => /^מ/.test(w));
          if (comparative && !anchored) {
            return `distance compared to nothing — "${text.trim()}"`;
          }
        }
      }
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
    name: "a written step's own arithmetic checks out",
    check: (q) => {
      // A step written by hand can say anything — nothing computes it back from the
      // operands the way `explainAddition`/`explainSubtraction` do for a step derived from
      // them. This is that missing check, run independently of how the step was produced.
      //
      // Scoped to plain four-operation arithmetic on purpose. `x`, `²`/`³`, `√`, and a
      // second `=` in one line (a chained equation) are all real, legitimate step shapes
      // elsewhere in the app that this simple a parser has no business judging — asserting
      // on them would be guessing, not checking. Absence over a false positive: skip that
      // one step rather than partially validate it.
      //
      // Deliberately does not require the *last* step to equal the question's answer —
      // several existing, reviewed questions end on a verification line ("if both legs are
      // equal: 6 × 6 = 36") rather than a fresh derivation, and that is a legitimate way to
      // close an explanation, not a bug this rule gets to invent.
      const plain = (s: string) => s.replace(/−/g, "-").replace(/÷/g, "/").replace(/×/g, "*");
      const SAFE = /^[-\d.\s+*/()]+=[-\d.\s+*/()]+$/;
      for (const step of explainQuestion(q)!.steps) {
        if (!step.math || !SAFE.test(plain(step.math))) continue;
        const [lhs, rhsText] = plain(step.math).split("=");
        let computed: number;
        try {
          // eslint-disable-next-line no-new-func
          computed = Function(`"use strict"; return (${lhs});`)() as number;
        } catch {
          return `a step's math does not parse — "${step.math}"`;
        }
        // Floating-point tolerance: real decimal content (0.4 + 0.2) hits binary rounding
        // that has nothing to do with whether the step is correct.
        if (Math.abs(computed - Number(rhsText)) > 1e-9) {
          return `a step's arithmetic is wrong — "${step.math}" computes to ${computed}`;
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
      if (q.hints.length !== 2) return `${q.hints.length} hints instead of two`;

      // Numbers are compared as numbers, not as text.
      //
      // A character-boundary check reads the `5` inside `2.5` as a bare 5, and grade 6 is
      // full of decimals — it flagged "פי `2.5`" on a question whose answer was `5`, which
      // is a step towards the answer and not the answer. Pulling whole numeric tokens out
      // and comparing values is what makes the distinction the rule was always after.
      const numbersIn = (text: string) =>
        (text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
      // A number already in the question is a given, not a leak.
      const isGiven = numbersIn(q.prompt).includes(q.answer);

      for (const hint of q.hints) {
        if (!hint.trim()) return "an empty hint";
        if (!isGiven && numbersIn(hint).includes(q.answer)) {
          return `a hint hands over the answer — "${hint}"`;
        }
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
    name: "speaks a first-grader's Hebrew, not a textbook's",
    check: (q, gradeId) => {
      // Reported on g1-addsub20-e1: "העשרת לא זזה, מוסיפים רק ליחידות". The idea was
      // right and the wording was a teacher's manual. Mika is seven and still learning to
      // read; "ה-10 נשאר במקום, ומחברים רק את המספרים הקטנים" says the same thing.
      //
      // Grade 1 only — "סכום" and "הפרש" are just words by grade 6. And the terms are
      // fair game in the topic that exists to teach them, which is why the topic title is
      // consulted instead of banning them outright: a hint for "עשרות ויחידות" has no
      // other way to name its own subject.
      if (gradeId !== "1") return null;
      const TEXTBOOK = /עשרת|עשרות|יחידות|מחוברים|סכום|הפרש|מחובר/;
      if (TEXTBOOK.test(q.topic)) return null;

      // Hints and explanation steps both. The explanation is what she reads at the moment
      // she got it wrong, so it is if anything the more important of the two — and it was
      // still saying "היחידות מתחברות בלי מעבר עשרת" long after the hints were plain.
      const written = [
        ...(q.hints ?? []),
        ...explainQuestion(q)!.steps.map((s) => s.label ?? ""),
      ];
      for (const text of written) {
        const found = text.match(TEXTBOOK);
        if (found) return `textbook Hebrew for a seven-year-old — "${found[0]}" in "${text}"`;
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
      if (gradeId !== "1") return null;
      for (const hint of q.hints) {
        if (/צריך עוד|כמה חסר/.test(hint) && !/10/.test(hint)) {
          return `a hint says what is needed without naming the target — "${hint}"`;
        }
      }
      return null;
    },
  },
  {
    name: "an 'opening brackets' question shows the full expanded expression and defines מקדם/מספר חופשי",
    check: (q) => {
      // Reported live on the site: "צריך להציג גם את 3X+6, להראות איך פתחנו סוגריים, מה
      // זה מס חופשי ומה זה מקדם" — the pattern `A(v + B)`, whether written (grade8.ts)
      // or generated (adaptiveExpressions.ts's openBrackets), used to compute only the
      // free number in isolation.
      const m = q.prompt.match(/^פתחו סוגריים: `(\d+)\(([a-z]) \+ (\d+)\)`\. מה המספר החופשי\?$/);
      if (!m) return null;
      const [, aStr, v] = m;
      const expanded = `${aStr}${v} + ${q.answer}`;

      const written = [
        ...(q.hints ?? []),
        ...explainQuestion(q)!.steps.map((s) => `${s.label ?? ""} ${s.math ?? ""}`),
      ];
      if (!written.some((t) => t.includes(expanded))) {
        return `never shows the expanded expression "${expanded}" — "${written.join(" | ")}"`;
      }
      if (!(q.hints ?? []).some((h) => h.includes("מקדם"))) {
        return `no hint defines "מקדם"`;
      }
      if (!(q.hints ?? []).some((h) => h.includes("מספר החופשי"))) {
        return `no hint defines "מספר החופשי"`;
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

test("every question carries hints, and the compiler is what guarantees it", () => {
  // `hints` is a required field, so a question without them does not compile. This test
  // is here to state the fact rather than to catch it: if the field is ever loosened back
  // to optional, the count is what notices.
  const all = everyQuestion();
  const withHints = all.filter(({ q }) => q.hints?.length === 2);
  expect(withHints.length, "some question is missing its two hints").toBe(all.length);
});

test("every fraction-of-a-number question still draws its circle", () => {
  // The diagram is read out of the prompt rather than stored on the question, which keeps
  // it from ever contradicting the question — but it also means a reworded prompt drops
  // the picture in silence. This count is what turns that silence into a failure.
  //
  // Twenty-four of the topic's thirty questions are "כמה זה <שבר> מ-<מספר>?". The other
  // six describe shapes one circle cannot, and deliberately have none.
  const fractions = everyQuestion().filter(({ topic }) => topic === "שברים פשוטים");
  expect(fractions.length, "the fractions topic changed size").toBe(30);

  const drawn = fractions.filter(({ q }) => fractionDiagram(q) !== null);
  const missing = fractions
    .filter(({ q }) => q.prompt.startsWith("כמה זה") && fractionDiagram(q) === null)
    .map(({ q }) => `${q.id} — "${q.prompt}"`);

  expect(missing, `\n${missing.join("\n")}\n`).toEqual([]);
  expect(drawn.length, "the number of questions with a diagram changed").toBe(24);
});

test("no diagram ever disagrees with its own question", () => {
  // The picture claims the whole splits into `denominator` parts worth `perPart` each, and
  // that `numerator` of them is the answer. If that arithmetic does not reproduce the
  // recorded answer, the picture is teaching something false.
  const wrong: string[] = [];
  for (const { q } of everyQuestion()) {
    const d = fractionDiagram(q);
    if (!d) continue;
    if (d.perPart * d.denominator !== d.whole) wrong.push(`${q.id}: parts do not rebuild the whole`);
    if (d.perPart * d.numerator !== q.answer) wrong.push(`${q.id}: the picture does not give the answer`);
    if (d.numerator > d.denominator) wrong.push(`${q.id}: more parts taken than exist`);
  }
  expect(wrong, `\n${wrong.join("\n")}\n`).toEqual([]);
});

test("exactly a hundred and five questions write themselves in columns", () => {
  // Eligibility is recomputed here from the spec's own words — a bare `a + b` / `a − b`,
  // columns worth aligning, at most one borrowed column, and column arithmetic that lands
  // on the recorded answer — independently of the module that draws the block. If the two
  // ever disagree, one of them is wrong about what the product promised, and this is what
  // says so out loud. A reworded prompt that silently drops its vertical fails the same
  // way the fraction count fails.
  const decimals = (n: number) => {
    const s = String(n);
    const i = s.indexOf(".");
    return i === -1 ? 0 : s.length - i - 1;
  };
  const eligible = (q: Question): boolean => {
    const m = q.prompt.trim().match(/^(\d+(?:\.\d+)?)\s*([+−-])\s*(\d+(?:\.\d+)?)$/);
    if (!m) return false;
    const a = Number(m[1]);
    const b = Number(m[3]);
    const scale = Math.max(decimals(a), decimals(b));
    const A = Math.round(a * 10 ** scale);
    const B = Math.round(b * 10 ** scale);
    if (scale === 0 && A < 10 && B < 10) return false; // nothing to align
    const width = Math.max(String(A).length, String(B).length);
    const digit = (n: number, i: number) => Math.floor(n / 10 ** i) % 10;
    if (m[2] !== "+") {
      // Walk the columns right to left the way a child would, tracking how many times a
      // column comes up short and has to ask its neighbour for a ten. One borrow draws —
      // a column asked twice (borrowing through a zero) has no honest single digit to show
      // for the column that both gave one away and needed one itself.
      let borrow = 0;
      let borrowCount = 0;
      for (let i = 0; i < width; i++) {
        const short = digit(A, i) - borrow < digit(B, i);
        if (short) borrowCount++;
        borrow = short ? 1 : 0;
      }
      if (borrow > 0 || borrowCount > 1) return false;
    }
    const result = m[2] === "+" ? A + B : A - B;
    return result === Math.round(q.answer * 10 ** scale);
  };

  const all = everyQuestion();
  const expected = all.filter(({ q }) => eligible(q));
  // Grew from 80 to 105 when the vertical diagram learned to draw a single borrow: every
  // add100 question was already eligible (carrying included), and now sub100's ten
  // borrow-needing hard questions join them, plus grade 1's own borrow-needing questions
  // that were sitting on the sidelines for the same reason (10 − 4, 15 − 8, ...).
  expect(expected.length, "the set of column-writable questions changed size").toBe(105);

  const disagreements = all
    .filter(({ q }) => (verticalSum(q) !== null) !== eligible(q))
    .map(({ q }) => `${q.id} — "${q.prompt}"`);
  expect(disagreements, `\n${disagreements.join("\n")}\n`).toEqual([]);
});

test("no vertical ever disagrees with its own question", () => {
  // The rows are the figure. If they are ragged, or the bottom line does not read back
  // as the recorded answer, the block is teaching something false.
  const wrong: string[] = [];
  for (const { q } of everyQuestion()) {
    const v = verticalSum(q);
    if (!v) continue;
    const rows = [v.top, v.bottom, v.result];
    if (new Set(rows.map((r) => r.length)).size !== 1) {
      wrong.push(`${q.id}: rows are not one width`);
    }
    if (new Set(rows.map((r) => r.indexOf("."))).size !== 1) {
      wrong.push(`${q.id}: the decimal points are not in one column`);
    }
    if (Number(v.result.trim()) !== q.answer) {
      wrong.push(`${q.id}: the bottom line is not the answer`);
    }
    if (v.carries !== null && v.carries.length !== v.top.length) {
      wrong.push(`${q.id}: the carry row is not aligned with the digits`);
    }
  }
  expect(wrong, `\n${wrong.join("\n")}\n`).toEqual([]);
});

test("all thirty counting questions draw their line", () => {
  // Eligibility is recomputed here from the spec's five question shapes, independently of
  // the module that draws the line. If the two disagree, one of them is wrong about what
  // the product promised — and a reworded prompt that silently drops its picture fails
  // the same way the fraction count fails.
  const expected = (q: Question): number | null => {
    const nums = q.prompt.match(/\d+/g)?.map(Number) ?? [];
    if (/בא אחרי/.test(q.prompt) && nums.length === 1) return nums[0] + 1;
    if (/בא לפני/.test(q.prompt) && nums.length === 1) return nums[0] - 1;
    if (/נמצא בין/.test(q.prompt) && nums.length === 2) return Math.min(...nums) + 1;
    if (/גדול יותר/.test(q.prompt) && nums.length === 2) return Math.max(...nums);
    if (/קטן יותר/.test(q.prompt) && nums.length === 2) return Math.min(...nums);
    return null;
  };

  const all = everyQuestion();
  const eligible = all.filter(({ q }) => expected(q) === q.answer);
  expect(eligible.length, "the set of line-drawable questions changed size").toBe(30);

  const disagreements = all
    .filter(({ q }) => (numberLine(q) !== null) !== (expected(q) === q.answer))
    .map(({ q }) => `${q.id} — "${q.prompt}"`);
  expect(disagreements, `\n${disagreements.join("\n")}\n`).toEqual([]);
});

test("exactly twenty place-value questions draw their box", () => {
  // Four shapes qualify; the ten hard ones — the gap between digits, and completing to
  // twenty — describe something a single box cannot show.
  const expected = (q: Question): number | null => {
    const nums = q.prompt.match(/\d+/g)?.map(Number) ?? [];
    if (/כמה עשרות/.test(q.prompt) && nums.length === 1 && nums[0] >= 10 && nums[0] <= 19) {
      return Math.floor(nums[0] / 10);
    }
    if (/כמה יחידות/.test(q.prompt) && nums.length === 1 && nums[0] >= 10 && nums[0] <= 19) {
      return nums[0] % 10;
    }
    if (/עשרת אחת ועוד/.test(q.prompt) && nums.length === 1) return 10 + nums[0];
    const sum = q.prompt.trim().match(/^10\s*\+\s*(\d)$/);
    if (sum) return 10 + Number(sum[1]);
    return null;
  };

  const all = everyQuestion();
  const eligible = all.filter(({ q }) => expected(q) === q.answer);
  expect(eligible.length, "the set of box-drawable questions changed size").toBe(20);

  const disagreements = all
    .filter(({ q }) => (tenFrame(q) !== null) !== (expected(q) === q.answer))
    .map(({ q }) => `${q.id} — "${q.prompt}"`);
  expect(disagreements, `\n${disagreements.join("\n")}\n`).toEqual([]);
});

test("exactly five completion questions draw their strip of twenty", () => {
  // The five that the box was right to refuse: "how many do you add to N to reach 20"
  // is not a question about the structure of N. Eligibility recomputed from the shape in
  // the spec, independently of the module.
  const expected = (q: Question): number | null => {
    const m = q.prompt.match(/כמה צריך להוסיף ל-(\d+) כדי להגיע ל-20/);
    return m ? 20 - Number(m[1]) : null;
  };

  const all = everyQuestion();
  const eligible = all.filter(({ q }) => expected(q) === q.answer);
  expect(eligible.length, "the set of strip-drawable questions changed size").toBe(5);

  const disagreements = all
    .filter(({ q }) => (twentyStrip(q) !== null) !== (expected(q) === q.answer))
    .map(({ q }) => `${q.id} — "${q.prompt}"`);
  expect(disagreements, `\n${disagreements.join("\n")}\n`).toEqual([]);
});

test("no question draws both a box and a strip", () => {
  // The two shapes serve the same thirty questions and must partition them. They are
  // separate modules precisely so that this is checkable rather than assumed — one shape
  // that decided internally which half to draw could not fail this test.
  const both = everyQuestion()
    .filter(({ q }) => tenFrame(q) !== null && twentyStrip(q) !== null)
    .map(({ q }) => `${q.id} — "${q.prompt}"`);
  expect(both, `\n${both.join("\n")}\n`).toEqual([]);

  const covered = everyQuestion().filter(
    ({ topic, q }) => topic === "עשרות ויחידות" && (tenFrame(q) || twentyStrip(q)),
  );
  expect(covered.length, "place-value coverage moved off the 25 the spec promises").toBe(25);
});

test("the line's opening sentence describes the ticks that are actually drawn", () => {
  // The criterion easiest to implement by guessing. The wording turns on whether `0` is
  // genuinely on screen, and the window moves with the question — so a caption chosen
  // from the marked numbers instead of the final ticks is right most of the time and
  // wrong exactly where it matters.
  //
  // Checked over all thirty at once rather than on a screen: `בא אחרי 3` draws `0`–`6`
  // and `בא לפני 4` draws `1`–`8`, one tick apart, and they must not say the same thing.
  const wrong: string[] = [];
  let sawVisible = 0;
  let sawHidden = 0;

  for (const { q } of everyQuestion()) {
    const line = numberLine(q);
    if (!line) continue;

    if (line.caption.length !== 2) {
      wrong.push(`${q.id}: the caption is not a rule line plus a question line`);
      continue;
    }
    const [rule] = line.caption;
    if (!/`0`/.test(rule)) wrong.push(`${q.id}: the opening sentence never mentions 0`);
    if (!/מוסיף `1`/.test(rule)) wrong.push(`${q.id}: the opening sentence never says a step is 1`);

    const zeroDrawn = line.ticks.includes(0);
    const claimsVisible = /כאן משמאל/.test(rule);
    const claimsHidden = /מחוץ לתמונה/.test(rule);
    if (zeroDrawn) sawVisible++;
    else sawHidden++;

    if (zeroDrawn && !claimsVisible) {
      wrong.push(`${q.id}: 0 is drawn (${line.ticks[0]}…) but the caption does not point at it`);
    }
    if (!zeroDrawn && !claimsHidden) {
      wrong.push(`${q.id}: 0 is off the window (${line.ticks[0]}…) but the caption claims it is here`);
    }
  }

  expect(wrong, `\n${wrong.join("\n")}\n`).toEqual([]);
  // Both wordings have to be exercised by the real data, or this test proves nothing.
  expect(sawVisible, "no question draws 0, so the 'here on the left' wording is untested").toBeGreaterThan(0);
  expect(sawHidden, "every question draws 0, so the 'off the picture' wording is untested").toBeGreaterThan(0);
});

test("a counting question shows a run into its answer, not a pair of marks", () => {
  // "אולי צריך לספור מעוד כמה, למשל: 16, 15, 14 ועכשיו מה בא?" — the picture has to show
  // that you count, not that the answer is sitting there.
  const wrong: string[] = [];
  for (const { q } of everyQuestion()) {
    const line = numberLine(q);
    if (!line) continue;
    const counting = /בא אחרי|בא לפני|נמצא בין/.test(q.prompt);
    if (!counting) {
      // Comparisons mark the candidate that was not chosen — one dot, deliberately.
      if (line.from.length !== 1) wrong.push(`${q.id}: a comparison marks ${line.from.length} numbers`);
      continue;
    }

    // The run is consecutive and ends beside the answer, in the direction it was counted.
    const run = /נמצא בין/.test(q.prompt) ? line.from.slice(0, -1) : line.from;
    if (run.length < 1 || run.length > 3) wrong.push(`${q.id}: a run of ${run.length}`);
    for (let i = 1; i < run.length; i++) {
      if (Math.abs(run[i] - run[i - 1]) !== 1) wrong.push(`${q.id}: the run skips a number`);
    }
    if (run.some((n) => n < 0 || n > 20)) wrong.push(`${q.id}: the run leaves the range Mika knows`);
    if (Math.abs(run[run.length - 1] - line.to) !== 1) {
      wrong.push(`${q.id}: the run does not end next to the answer`);
    }
    // A "between" question keeps its far end marked as well as counting up to the answer.
    if (/נמצא בין/.test(q.prompt)) {
      const far = line.from[line.from.length - 1];
      if (Math.abs(far - line.to) !== 1 || far <= line.to) {
        wrong.push(`${q.id}: the upper bound is not marked`);
      }
    }
    // And it says so in words, listing what was counted.
    const sentence = line.caption[1] ?? "";
    for (const n of run) {
      if (!sentence.includes(`\`${n}\``)) wrong.push(`${q.id}: ${n} is counted but not spoken`);
    }
  }
  expect(wrong, `\n${wrong.join("\n")}\n`).toEqual([]);
});

test("no line or box ever disagrees with its own question", () => {
  const wrong: string[] = [];
  for (const { q } of everyQuestion()) {
    const line = numberLine(q);
    if (line) {
      // The star is the answer. That is the whole check with teeth: a picture built from
      // the answer would agree with itself and never be tested.
      if (line.to !== q.answer) wrong.push(`${q.id}: the star is not the answer`);
      if (!line.ticks.includes(line.to)) wrong.push(`${q.id}: the star sits off the line`);
      for (const from of line.from) {
        if (!line.ticks.includes(from)) wrong.push(`${q.id}: a dot sits off the line`);
      }
      if (line.ticks.length < 5) wrong.push(`${q.id}: fewer than five ticks`);
      const ascending = [...line.ticks].sort((a, b) => a - b);
      if (line.ticks.join() !== ascending.join()) wrong.push(`${q.id}: ticks are not ascending`);
    }

    const frame = tenFrame(q);
    if (frame) {
      const whole = frame.tens * 10 + frame.units;
      if (whole < 10 || whole > 19) wrong.push(`${q.id}: the box describes ${whole}`);
      if (frame.units > 9) wrong.push(`${q.id}: more than nine loose ones`);
      // Whatever the question asked for has to be what the box shows.
      const shown =
        frame.highlight === "tens" ? frame.tens : frame.highlight === "units" ? frame.units : whole;
      if (shown !== q.answer) wrong.push(`${q.id}: the box does not answer what was asked`);
    }

    const strip = twentyStrip(q);
    if (strip) {
      // Twenty circles, and the empty ones are the answer. Same two independent sources.
      if (strip.filled + strip.empty !== 20) wrong.push(`${q.id}: the strip is not twenty`);
      if (strip.empty !== q.answer) wrong.push(`${q.id}: the empty circles are not the answer`);
      if (strip.filled < 0 || strip.filled >= 20) wrong.push(`${q.id}: the strip starts nowhere`);
    }
  }
  expect(wrong, `\n${wrong.join("\n")}\n`).toEqual([]);
});

test("thirty area/perimeter questions draw their shape", () => {
  // The spec promises full coverage for this topic — every question gets a rectangle,
  // square, triangle or circle.
  const all = everyQuestion().filter(({ topic }) => topic === "שטח והיקף");
  expect(all.length, "the topic itself changed size").toBe(30);
  const missing = all.filter(({ q }) => geometryShape(q) === null).map(({ q }) => q.id);
  expect(missing, `\n${missing.join("\n")}\n`).toEqual([]);
});

test("twenty-seven Pythagoras questions draw their triangle", () => {
  // Eligibility recomputed from the two things the spec excludes, independently of the
  // module: a square root given as an approximation right in the prompt, and a "shortcut
  // across the diagonal" question whose answer is a difference between two paths rather
  // than a side of the triangle.
  const excluded = (prompt: string) => /בערך/.test(prompt) || /קצר יותר/.test(prompt);
  const all = everyQuestion().filter(({ topic }) => topic === "משפט פיתגורס");
  expect(all.length, "the topic itself changed size").toBe(30);

  const disagreements = all
    .filter(({ q }) => (pythagorasTriangle(q) !== null) === excluded(q.prompt))
    .map(({ q }) => `${q.id} — "${q.prompt}"`);
  expect(disagreements, `\n${disagreements.join("\n")}\n`).toEqual([]);

  const covered = all.filter(({ q }) => pythagorasTriangle(q) !== null);
  expect(covered.length, "Pythagoras coverage moved off the 27 the spec promises").toBe(27);
});

test("thirty percent questions draw their strip", () => {
  const all = everyQuestion().filter(({ topic }) => topic === "אחוזים");
  expect(all.length, "the topic itself changed size").toBe(30);
  const missing = all.filter(({ q }) => percentStrip(q) === null).map(({ q }) => q.id);
  expect(missing, `\n${missing.join("\n")}\n`).toEqual([]);
});

test("twenty-seven ratio questions draw their two strips", () => {
  // Excluded: an inverse relationship (more workers finish sooner — two strips would say
  // "more is more" and lie about it), and a three-part ratio, which is not two strips.
  // "בונים גדר" is the phrase unique to the two inverse-work questions. The three-part
  // ratio is the only prompt with two "ל-N" terms right after "היחס הוא" — a recipe
  // question also has two "ל-N" occurrences, but scattered through the sentence rather
  // than back to back in the ratio statement itself.
  const excluded = (prompt: string) =>
    /בונים גדר/.test(prompt) || /היחס הוא \d+ ל-\d+ ל-\d+/.test(prompt);
  const all = everyQuestion().filter(({ topic }) => topic === "יחס ופרופורציה");
  expect(all.length, "the topic itself changed size").toBe(30);

  const disagreements = all
    .filter(({ q }) => (ratioStrips(q) !== null) === excluded(q.prompt))
    .map(({ q }) => `${q.id} — "${q.prompt}"`);
  expect(disagreements, `\n${disagreements.join("\n")}\n`).toEqual([]);

  const covered = all.filter(({ q }) => ratioStrips(q) !== null);
  expect(covered.length, "ratio coverage moved off the 27 the spec promises").toBe(27);
});

test("thirty linear-function questions draw their graph", () => {
  const all = everyQuestion().filter(({ topic }) => topic === "פונקציה קווית");
  expect(all.length, "the topic itself changed size").toBe(30);
  const missing = all.filter(({ q }) => linearGraph(q) === null).map(({ q }) => q.id);
  expect(missing, `\n${missing.join("\n")}\n`).toEqual([]);
});

test("none of the five new shapes ever disagrees with its own question", () => {
  const wrong: string[] = [];
  for (const { q } of everyQuestion()) {
    const geo = geometryShape(q);
    if (geo) {
      const side =
        geo.kind === "rectangle"
          ? geo.unknown === "length"
            ? geo.length
            : geo.unknown === "width"
              ? geo.width
              : null
          : geo.kind === "triangle" && geo.unknown === "height"
            ? geo.height
            : null;
      const wholeShape =
        geo.kind === "rectangle"
          ? geo.measure === "area"
            ? geo.length * geo.width
            : 2 * (geo.length + geo.width)
          : geo.kind === "square"
            ? geo.measure === "area"
              ? geo.side * geo.side
              : geo.side * 4
            : geo.kind === "triangle"
              ? geo.measure === "area"
                ? (geo.base * geo.height) / 2
                : geo.base * 3
              : geo.measure === "area"
                ? geo.pi * geo.radius * geo.radius
                : 2 * geo.pi * geo.radius;
      const expected = side ?? wholeShape;
      if (expected !== q.answer) wrong.push(`${q.id}: the geometry shape does not answer what was asked`);
    }

    const py = pythagorasTriangle(q);
    if (py) {
      const hyp = py.hyp ?? Math.sqrt(py.legA ** 2 + py.legB ** 2);
      if (Math.abs(py.legA ** 2 + py.legB ** 2 - hyp ** 2) > 0.01) {
        wrong.push(`${q.id}: the triangle does not satisfy a² + b² = c²`);
      }
      const expected =
        py.unknown === "hyp" ? py.hyp : py.unknown === "legB" ? py.legB : py.legA;
      if (expected !== q.answer) wrong.push(`${q.id}: the triangle does not answer what was asked`);
    }

    const pc = percentStrip(q);
    if (pc) {
      const expected =
        pc.extra !== undefined
          ? pc.base + pc.extra
          : /כמה אחוזים/.test(q.prompt)
            ? (pc.filled * 100) / pc.base
            : /כמה משלמים|כמה שקלים שילמת/.test(q.prompt)
              ? pc.base - pc.filled
              : pc.filled;
      if (expected !== q.answer) wrong.push(`${q.id}: the strip does not answer what was asked`);
    }

    const rs = ratioStrips(q);
    if (rs) {
      if (rs.valueA !== rs.ratioA * rs.unit || rs.valueB !== rs.ratioB * rs.unit) {
        wrong.push(`${q.id}: the two strips are not at the same unit size`);
      }
      const candidates = [rs.valueA, rs.valueB, Math.max(rs.valueA, rs.valueB), Math.min(rs.valueA, rs.valueB)];
      if (!candidates.includes(q.answer)) wrong.push(`${q.id}: neither strip's value is the answer`);
    }

    const lg = linearGraph(q);
    if (lg) {
      const onEveryLine = lg.lines.every(
        (l) => Math.abs(l.slope * lg.point.x + l.intercept - lg.point.y) < 0.001,
      );
      if (!onEveryLine) wrong.push(`${q.id}: the marked point is not on the line`);
    }
  }
  expect(wrong, `\n${wrong.join("\n")}\n`).toEqual([]);
});

test("every style id in the data has a name, and every name is used", () => {
  // `grade1.ts` writes style ids as plain strings and never imports them: importing
  // constants into a grade file is the circular edge that once took this app down with a
  // white screen, and TypeScript did not catch it. This rule is what buys back the safety
  // the compiler is not providing — and it has to run **both ways**, because a typo shows
  // up as an id with no name, while a rename shows up as a name nobody uses.
  const used = new Set<string>();
  const orphans: string[] = [];
  for (const { q } of everyQuestion()) {
    if (!q.style) continue;
    used.add(q.style);
    if (!(q.style in STYLE_META)) orphans.push(`${q.id} — style "${q.style}" has no name`);
  }
  expect(orphans, `\n${orphans.join("\n")}\n`).toEqual([]);

  const unused = Object.keys(STYLE_META).filter((id) => !used.has(id));
  expect(unused, `named but never used: ${unused.join(", ")}`).toEqual([]);
});

test("grade one is fully classified, and every style is big enough to be a lesson", () => {
  const grade1 = everyQuestion().filter(({ gradeId }) => gradeId === "1");
  const unclassified = grade1.filter(({ q }) => !q.style).map(({ q }) => q.id);
  expect(unclassified, `unclassified: ${unclassified.join(", ")}`).toEqual([]);
  expect(grade1.length, "grade one changed size").toBe(150);

  const styles = new Set(grade1.map(({ q }) => q.style));
  expect(styles.size, "the number of styles in grade one changed").toBe(15);

  // A style too small to repeat is not a lesson, and the spec puts the floor at three.
  const topics = grades.flatMap((g) => (g.id === "1" ? g.topicSets : []));
  const selectable = topics.flatMap((t) => (hasStyleLessons(t) ? stylesOf(t) : []));
  expect(selectable.length, "the number of selectable styles changed").toBe(13);

  const thin = selectable
    .filter((s) => s.questions.length < 3)
    .map((s) => `${s.id} has ${s.questions.length}`);
  expect(thin, `\n${thin.join("\n")}\n`).toEqual([]);

  // Two topics hold one style each, so they keep their level screen.
  expect(topics.filter(hasStyleLessons).length, "how many topics offer styles changed").toBe(3);
});

test("a lesson's questions climb from easy to hard", () => {
  // The criterion easiest to get backwards without noticing: most styles sit inside one
  // level, so a reversed or absent sort still looks right everywhere except the few that
  // span levels — which are exactly the ones a child would meet the hardest question in
  // first.
  const rank: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
  const wrong: string[] = [];
  let spanning = 0;

  for (const grade of grades) {
    for (const topic of grade.topicSets) {
      if (!hasStyleLessons(topic)) continue;
      for (const style of stylesOf(topic)) {
        const levels = style.questions.map(
          (q) => topic.levels.find((l) => l.questions.includes(q))!.id,
        );
        const ranks = levels.map((id) => rank[id]);
        if (new Set(ranks).size > 1) spanning++;
        for (let i = 1; i < ranks.length; i++) {
          if (ranks[i] < ranks[i - 1]) {
            wrong.push(`${style.id}: ${levels[i - 1]} came before ${levels[i]}`);
          }
        }
      }
    }
  }
  expect(wrong, `\n${wrong.join("\n")}\n`).toEqual([]);
  // Without a style that spans levels this test could not fail, whatever the order.
  expect(spanning, "no style spans more than one level, so the ordering is untested").toBeGreaterThan(0);
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

// ---------------------------------------------- runtime-generated questions (adaptive)

/**
 * `RULES` above only ever sees the static `grades` tree, so a question built at runtime
 * by `generateAdd100Question` (see docs/features/adaptive-difficulty) is invisible to
 * every check above no matter how wrong it is — the same hint/explanation/analogy rules
 * just never run on it. This is the check that closes that gap: the same `RULES`, run
 * against a large, deterministic sample of generated questions instead of the written
 * ones. A seeded RNG keeps the sample and any failure reproducible.
 */
function seededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("every generated חיבור עד 1000 question passes every content rule, across the whole difficulty range", () => {
  const rng = seededRng(42);
  const samplesPerDifficulty = 200;
  const violations: string[] = [];
  const outOfRange: string[] = [];
  const wrongAnswer: string[] = [];
  const badPrompt: string[] = [];

  for (let difficulty = 1; difficulty <= 8; difficulty++) {
    for (let i = 0; i < samplesPerDifficulty; i++) {
      const q = generateAdd100Question(difficulty, rng);

      for (const rule of RULES) {
        const problem = rule.check(q, "2");
        if (problem) violations.push(`${q.id} (difficulty ${difficulty}) — ${rule.name}: ${problem}`);
      }

      const m = q.prompt.trim().match(/^(\d+)\s*\+\s*(\d+)$/);
      if (!m) {
        badPrompt.push(`${q.id} — "${q.prompt}" is not a bare addition`);
        continue;
      }
      const [a, b] = [Number(m[1]), Number(m[2])];
      if (a + b !== q.answer) wrongAnswer.push(`${q.id} — "${q.prompt}" answer is ${q.answer}, not ${a + b}`);
      if (q.answer > 999 || q.answer < 0) outOfRange.push(`${q.id} — "${q.prompt}" = ${q.answer} is outside 0-999`);
    }
  }

  expect(badPrompt, `\n${badPrompt.join("\n")}\n`).toEqual([]);
  expect(wrongAnswer, `\n${wrongAnswer.join("\n")}\n`).toEqual([]);
  expect(outOfRange, `\n${outOfRange.join("\n")}\n`).toEqual([]);
  expect(violations, `\n${violations.join("\n")}\n`).toEqual([]);
});

/**
 * The same gap, for Mika's own three topics that moved to adaptive difficulty (see
 * docs/features/mika-adaptive-difficulty) — `חיבור עד 10` and `חיסור עד 10` (grade 1,
 * three difficulty tiers, not five: the 1–10 range is too small to support five distinct
 * tiers) and `חיסור עד 1000` (grade 2, a direct subtraction mirror of `חיבור עד 1000`'s
 * own five tiers).
 */
test("every generated חיבור עד 10 question passes every content rule, across the whole difficulty range", () => {
  const rng = seededRng(10);
  const samplesPerDifficulty = 200;
  const violations: string[] = [];
  const outOfRange: string[] = [];
  const wrongAnswer: string[] = [];
  const badPrompt: string[] = [];

  for (let difficulty = 1; difficulty <= 3; difficulty++) {
    for (let i = 0; i < samplesPerDifficulty; i++) {
      const q = generateAdd10Question(difficulty, rng);

      for (const rule of RULES) {
        const problem = rule.check(q, "1");
        if (problem) violations.push(`${q.id} (difficulty ${difficulty}) — ${rule.name}: ${problem}`);
      }

      const m = q.prompt.trim().match(/^(\d+)\s*\+\s*(\d+)$/);
      if (!m) {
        badPrompt.push(`${q.id} — "${q.prompt}" is not a bare addition`);
        continue;
      }
      const [a, b] = [Number(m[1]), Number(m[2])];
      if (a + b !== q.answer) wrongAnswer.push(`${q.id} — "${q.prompt}" answer is ${q.answer}, not ${a + b}`);
      if (q.answer > 10 || q.answer < 0) outOfRange.push(`${q.id} — "${q.prompt}" = ${q.answer} is outside 0-10`);
    }
  }

  expect(badPrompt, `\n${badPrompt.join("\n")}\n`).toEqual([]);
  expect(wrongAnswer, `\n${wrongAnswer.join("\n")}\n`).toEqual([]);
  expect(outOfRange, `\n${outOfRange.join("\n")}\n`).toEqual([]);
  expect(violations, `\n${violations.join("\n")}\n`).toEqual([]);
});

test("every generated חיסור עד 10 question passes every content rule, across the whole difficulty range", () => {
  const rng = seededRng(11);
  const samplesPerDifficulty = 200;
  const violations: string[] = [];
  const outOfRange: string[] = [];
  const wrongAnswer: string[] = [];
  const badPrompt: string[] = [];

  for (let difficulty = 1; difficulty <= 3; difficulty++) {
    for (let i = 0; i < samplesPerDifficulty; i++) {
      const q = generateSub10Question(difficulty, rng);

      for (const rule of RULES) {
        const problem = rule.check(q, "1");
        if (problem) violations.push(`${q.id} (difficulty ${difficulty}) — ${rule.name}: ${problem}`);
      }

      const m = q.prompt.trim().match(/^(\d+)\s*−\s*(\d+)$/);
      if (!m) {
        badPrompt.push(`${q.id} — "${q.prompt}" is not a bare subtraction`);
        continue;
      }
      const [a, b] = [Number(m[1]), Number(m[2])];
      if (a - b !== q.answer) wrongAnswer.push(`${q.id} — "${q.prompt}" answer is ${q.answer}, not ${a - b}`);
      if (q.answer > 10 || q.answer < 0) outOfRange.push(`${q.id} — "${q.prompt}" = ${q.answer} is outside 0-10`);
      if (a > 10) outOfRange.push(`${q.id} — "${q.prompt}" minuend ${a} is outside 0-10`);
    }
  }

  expect(badPrompt, `\n${badPrompt.join("\n")}\n`).toEqual([]);
  expect(wrongAnswer, `\n${wrongAnswer.join("\n")}\n`).toEqual([]);
  expect(outOfRange, `\n${outOfRange.join("\n")}\n`).toEqual([]);
  expect(violations, `\n${violations.join("\n")}\n`).toEqual([]);
});

test("every generated חיסור עד 1000 question passes every content rule, across the whole difficulty range", () => {
  const rng = seededRng(100);
  const samplesPerDifficulty = 200;
  const violations: string[] = [];
  const outOfRange: string[] = [];
  const wrongAnswer: string[] = [];
  const badPrompt: string[] = [];

  for (let difficulty = 1; difficulty <= 8; difficulty++) {
    for (let i = 0; i < samplesPerDifficulty; i++) {
      const q = generateSub100Question(difficulty, rng);

      for (const rule of RULES) {
        const problem = rule.check(q, "2");
        if (problem) violations.push(`${q.id} (difficulty ${difficulty}) — ${rule.name}: ${problem}`);
      }

      const m = q.prompt.trim().match(/^(\d+)\s*−\s*(\d+)$/);
      if (!m) {
        badPrompt.push(`${q.id} — "${q.prompt}" is not a bare subtraction`);
        continue;
      }
      const [a, b] = [Number(m[1]), Number(m[2])];
      if (a - b !== q.answer) wrongAnswer.push(`${q.id} — "${q.prompt}" answer is ${q.answer}, not ${a - b}`);
      if (q.answer > 999 || q.answer < 0) outOfRange.push(`${q.id} — "${q.prompt}" = ${q.answer} is outside 0-999`);
      if (a > 999) outOfRange.push(`${q.id} — "${q.prompt}" minuend ${a} is outside 0-999`);
    }
  }

  expect(badPrompt, `\n${badPrompt.join("\n")}\n`).toEqual([]);
  expect(wrongAnswer, `\n${wrongAnswer.join("\n")}\n`).toEqual([]);
  expect(outOfRange, `\n${outOfRange.join("\n")}\n`).toEqual([]);
  expect(violations, `\n${violations.join("\n")}\n`).toEqual([]);
});

test("every generated כפל וחילוק question passes every content rule, across the whole difficulty range", () => {
  const rng = seededRng(300);
  const samplesPerDifficulty = 200;
  const violations: string[] = [];
  const wrongAnswer: string[] = [];
  const badPrompt: string[] = [];

  for (let difficulty = 1; difficulty <= 3; difficulty++) {
    for (let i = 0; i < samplesPerDifficulty; i++) {
      const q = generateMulDivQuestion(difficulty, rng);

      for (const rule of RULES) {
        const problem = rule.check(q, "2");
        if (problem) violations.push(`${q.id} (difficulty ${difficulty}) — ${rule.name}: ${problem}`);
      }

      const mult = q.prompt.trim().match(/^(\d+)\s*×\s*(\d+)$/);
      const div = q.prompt.trim().match(/^(\d+)\s*÷\s*(\d+)$/);
      if (mult) {
        const [a, b] = [Number(mult[1]), Number(mult[2])];
        if (a * b !== q.answer) wrongAnswer.push(`${q.id} — "${q.prompt}" answer is ${q.answer}, not ${a * b}`);
      } else if (div) {
        const [n, k] = [Number(div[1]), Number(div[2])];
        if (n % k !== 0 || n / k !== q.answer) {
          wrongAnswer.push(`${q.id} — "${q.prompt}" answer is ${q.answer}, but ${n} ÷ ${k} is ${n / k}`);
        }
      } else {
        badPrompt.push(`${q.id} — "${q.prompt}" is not a bare multiplication or division`);
      }
    }
  }

  expect(badPrompt, `\n${badPrompt.join("\n")}\n`).toEqual([]);
  expect(wrongAnswer, `\n${wrongAnswer.join("\n")}\n`).toEqual([]);
  expect(violations, `\n${violations.join("\n")}\n`).toEqual([]);
});

test("every generated צורות וגופים question passes every content rule, across the whole difficulty range", () => {
  // An oracle independent of src/data/adaptiveShapes.ts's own lookup table — written
  // fresh from the same reviewed facts the 30 written questions already state, not
  // imported from the generator. A test that checked the generator's table against
  // itself could never catch the table being wrong in the first place.
  const PLANE_FACTS: Record<string, { צלעות: number; קדקודים: number }> = {
    משולש: { צלעות: 3, קדקודים: 3 },
    ריבוע: { צלעות: 4, קדקודים: 4 },
    מלבן: { צלעות: 4, קדקודים: 4 },
    עיגול: { צלעות: 0, קדקודים: 0 },
    מחומש: { צלעות: 5, קדקודים: 5 },
    משושה: { צלעות: 6, קדקודים: 6 },
  };
  const SOLID_FACTS: Record<string, Partial<Record<"פאות" | "קדקודים" | "מקצועות", number>>> = {
    קוביה: { פאות: 6, קדקודים: 8, מקצועות: 12 },
    כדור: { פאות: 0, קדקודים: 0 },
    גליל: { פאות: 2, קדקודים: 0 },
  };
  const SOLID_PAIR_TO_NAME: Record<string, string> = {
    "שתי קוביות": "קוביה",
    "שני כדורים": "כדור",
    "שני גלילים": "גליל",
  };

  const rng = seededRng(301);
  const samplesPerDifficulty = 200;
  const violations: string[] = [];
  const wrongAnswer: string[] = [];
  const badPrompt: string[] = [];

  for (let difficulty = 1; difficulty <= 3; difficulty++) {
    for (let i = 0; i < samplesPerDifficulty; i++) {
      const q = generateShapesQuestion(difficulty, rng);

      for (const rule of RULES) {
        const problem = rule.check(q, "2");
        if (problem) violations.push(`${q.id} (difficulty ${difficulty}) — ${rule.name}: ${problem}`);
      }

      const numbers = (q.prompt.match(/\d+/g) ?? []).map(Number);

      if (q.prompt.includes("בסך הכל")) {
        // Two facts summed — both operands are printed in the prompt itself.
        if (numbers.length !== 2) badPrompt.push(`${q.id} — "${q.prompt}" doesn't show exactly two numbers`);
        else if (numbers[0] + numbers[1] !== q.answer) {
          wrongAnswer.push(`${q.id} — "${q.prompt}" answer is ${q.answer}, not ${numbers[0] + numbers[1]}`);
        }
      } else if (q.prompt.includes("בכמה יותר")) {
        // Two facts subtracted — the larger is always stated first.
        if (numbers.length !== 2) badPrompt.push(`${q.id} — "${q.prompt}" doesn't show exactly two numbers`);
        else if (numbers[0] - numbers[1] !== q.answer) {
          wrongAnswer.push(`${q.id} — "${q.prompt}" answer is ${q.answer}, not ${numbers[0] - numbers[1]}`);
        }
      } else {
        const m = q.prompt.match(/^כמה (.+?) יש ל(.+)\?$/);
        if (!m) {
          badPrompt.push(`${q.id} — "${q.prompt}" matches no known shape/solid question form`);
          continue;
        }
        const [, rawAttr, subject] = m;
        if (subject.endsWith(" יחד")) {
          const pairName = subject.replace(/ יחד$/, "");
          const solid = SOLID_PAIR_TO_NAME[pairName];
          const attr = (rawAttr === "פאות שטוחות" ? "פאות" : rawAttr) as "פאות" | "קדקודים" | "מקצועות";
          const single = solid ? SOLID_FACTS[solid]?.[attr] : undefined;
          if (single === undefined) badPrompt.push(`${q.id} — "${q.prompt}" doesn't match a known doubled solid`);
          else if (single * 2 !== q.answer) {
            wrongAnswer.push(`${q.id} — "${q.prompt}" answer is ${q.answer}, not ${single * 2}`);
          }
        } else if (subject in PLANE_FACTS && (rawAttr === "צלעות" || rawAttr === "קדקודים")) {
          const expected = PLANE_FACTS[subject][rawAttr];
          if (expected !== q.answer) wrongAnswer.push(`${q.id} — "${q.prompt}" answer is ${q.answer}, not ${expected}`);
        } else if (subject in SOLID_FACTS) {
          const attr = (rawAttr === "פאות שטוחות" ? "פאות" : rawAttr) as "פאות" | "קדקודים" | "מקצועות";
          const expected = SOLID_FACTS[subject][attr];
          if (expected === undefined) badPrompt.push(`${q.id} — "${q.prompt}" — no such fact for ${subject}`);
          else if (expected !== q.answer) wrongAnswer.push(`${q.id} — "${q.prompt}" answer is ${q.answer}, not ${expected}`);
        } else {
          badPrompt.push(`${q.id} — "${q.prompt}" matches no known shape/solid`);
        }
      }
    }
  }

  expect(badPrompt, `\n${badPrompt.join("\n")}\n`).toEqual([]);
  expect(wrongAnswer, `\n${wrongAnswer.join("\n")}\n`).toEqual([]);
  expect(violations, `\n${violations.join("\n")}\n`).toEqual([]);
});

test("every generated שעון וזמן question passes every content rule, and clockFace() always draws it", () => {
  // The edge case docs/features/grade2-clock/architecture.md flags by name: unlike every
  // other diagram extractor, a clock question with no picture isn't a missing nice-to-have
  // — the prompt states no time at all ("איזו שעה מראה השעון?"), so a `null` here would
  // leave the student answering a question the screen never actually asked. `noPicture`
  // below is therefore checked as strictly as `wrongAnswer`, not folded into `violations`.
  const rng = seededRng(302);
  const samplesPerDifficulty = 200;
  const violations: string[] = [];
  const wrongAnswer: string[] = [];
  const badPrompt: string[] = [];
  const noPicture: string[] = [];

  for (let difficulty = 1; difficulty <= 3; difficulty++) {
    for (let i = 0; i < samplesPerDifficulty; i++) {
      const q = generateClockQuestion(difficulty, rng);

      for (const rule of RULES) {
        const problem = rule.check(q, "2");
        if (problem) violations.push(`${q.id} (difficulty ${difficulty}) — ${rule.name}: ${problem}`);
      }

      const face = clockFace(q);
      if (!face) {
        noPicture.push(`${q.id} (difficulty ${difficulty}) — clockFace() returned null for "${q.prompt}"`);
        continue;
      }

      if (difficulty === 1 || difficulty === 2) {
        if (q.prompt !== "איזו שעה מראה השעון?" && q.prompt !== "השעון מראה חצי שעה אחרי איזו שעה?") {
          badPrompt.push(`${q.id} — "${q.prompt}" is not a known easy/medium clock prompt`);
        }
        if (q.answer < 1 || q.answer > 12) {
          wrongAnswer.push(`${q.id} — "${q.prompt}" = ${q.answer} is outside 1-12`);
        }
        if (face.kind !== "single") badPrompt.push(`${q.id} — difficulty ${difficulty} drew a "${face.kind}" face, not "single"`);
      } else {
        if (q.prompt !== "כמה דקות עברו מההתחלה עד הסיום?") {
          badPrompt.push(`${q.id} — "${q.prompt}" is not the known duration prompt`);
        }
        if (q.answer < 30 || q.answer > 120 || q.answer % 30 !== 0) {
          wrongAnswer.push(`${q.id} — "${q.prompt}" = ${q.answer} is not a 30-120 multiple of 30`);
        }
        if (face.kind !== "duration") badPrompt.push(`${q.id} — difficulty 3 drew a "${face.kind}" face, not "duration"`);
      }
    }
  }

  expect(noPicture, `\n${noPicture.join("\n")}\n`).toEqual([]);
  expect(badPrompt, `\n${badPrompt.join("\n")}\n`).toEqual([]);
  expect(wrongAnswer, `\n${wrongAnswer.join("\n")}\n`).toEqual([]);
  expect(violations, `\n${violations.join("\n")}\n`).toEqual([]);
});

/**
 * `RULES` above only ever sees the static `grades` tree, so a question built at runtime
 * by any of the twelve generators under `src/data/adaptive*.ts` (see
 * docs/features/levels-as-practice) is invisible to every check above no matter how
 * wrong it is — the same gap `generateAdd100Question`'s own test closes, extended to
 * every topic that moved to adaptive difficulty after it. A seeded RNG keeps the sample
 * and any failure reproducible.
 */
const ADAPTIVE_GENERATORS: [string, string, (difficulty: number, rng: () => number) => Question][] = [
  ["שברים פשוטים", "6", generateFractionsQuestion],
  ["שברים עשרוניים", "6", generateDecimalsQuestion],
  ["אחוזים", "6", generatePercentQuestion],
  ["יחס ופרופורציה", "6", generateRatioQuestion],
  ["שטח והיקף", "6", generateAreaPerimeterQuestion],
  ["ממוצע", "6", generateAverageQuestion],
  ["ביטויים אלגבריים", "8", generateExpressionsQuestion],
  ["משוואות", "8", generateEquationsQuestion],
  ["חזקות ושורשים", "8", generatePowersQuestion],
  ["משפט פיתגורס", "8", generatePythagorasQuestion],
  ["פונקציה קווית", "8", generateLinearFunctionQuestion],
  ["בעיות מילוליות", "8", generateWordProblemsQuestion],
];

test("every generated question, across all twelve levels-as-practice topics, passes every content rule", () => {
  const violations: string[] = [];
  const badAnswer: string[] = [];
  const samplesPerDifficulty = 100;

  for (const [topic, gradeId, generate] of ADAPTIVE_GENERATORS) {
    const rng = seededRng(topic.length * 1000003);
    for (let difficulty = 1; difficulty <= 5; difficulty++) {
      for (let i = 0; i < samplesPerDifficulty; i++) {
        const q = generate(difficulty, rng);

        for (const rule of RULES) {
          const problem = rule.check(q, gradeId);
          if (problem) violations.push(`${q.id} (${topic}, difficulty ${difficulty}) — ${rule.name}: ${problem}`);
        }

        if (!Number.isFinite(q.answer)) {
          badAnswer.push(`${q.id} (${topic}, difficulty ${difficulty}) — "${q.prompt}" answer is ${q.answer}`);
        }
      }
    }
  }

  expect(badAnswer, `\n${badAnswer.join("\n")}\n`).toEqual([]);
  expect(violations, `\n${violations.join("\n")}\n`).toEqual([]);
});

/**
 * docs/features/algebraic-brackets-teaching/product-spec.md — combineLikeTerms ("כנסו
 * איברים", no brackets) also asks for the coefficient, and now defines the word. This is
 * deliberately not a RULES entry: the equivalent written questions in grade8.ts
 * (g8-expressions-e3/e5/e8/e10/m4/m9/h3/h8) were explicitly left out of this fix's scope
 * (see architecture.md's Risks/Tradeoffs), so a pattern-wide rule keyed on the prompt would
 * wrongly fail on them.
 */
test("every generated 'combine like terms' question defines מקדם in its first hint", () => {
  const rng = seededRng(4242);
  for (let i = 0; i < 200; i++) {
    const q = generateExpressionsQuestion(2, rng);
    if (!/^כנסו איברים:/.test(q.prompt)) continue; // difficulty 2 is always this pattern, but stay safe
    expect(q.hints[0], `${q.id} — "${q.prompt}"`).toContain("מקדם");
  }
});

/**
 * Second review round on docs/features/algebraic-brackets-teaching (2026-08-21): the old
 * hint 2 for "combine like terms" just stated the exact addition/subtraction as a finished
 * sentence ("`A` ועוד `B` מאותו סוג") — nothing left to compute. Fixed in both the generator
 * and the six written grade8.ts questions sharing that exact old string
 * (e3/e5/e8/e10/m4/m9 — h3/h8 are the different "open and combine" pattern, out of scope).
 * Checks the fix rather than re-checking the old bug (content-rules.md: describable as a
 * pattern, so it belongs here rather than being a one-off).
 */
test("'combine like terms' hint 2 names the coefficients instead of stating the sum", () => {
  const rng = seededRng(4242);
  let sawAny = false;
  for (let i = 0; i < 200; i++) {
    const q = generateExpressionsQuestion(2, rng);
    if (!/^כנסו איברים:/.test(q.prompt)) continue;
    sawAny = true;
    expect(q.hints[1], `${q.id} — "${q.prompt}"`).toContain("מקדמים");
    expect(q.hints[1], `${q.id} — "${q.prompt}"`).toMatch(/בלי לגעת/);
  }
  expect(sawAny).toBe(true);

  const written = everyQuestion()
    .map(({ q }) => q)
    .filter((q) => ["g8-expressions-e3", "g8-expressions-e5", "g8-expressions-e8", "g8-expressions-e10", "g8-expressions-m4", "g8-expressions-m9"].includes(q.id));
  expect(written).toHaveLength(6);
  for (const q of written) {
    expect(q.hints[1], `${q.id} — "${q.prompt}"`).toContain("מקדמים");
    expect(q.hints[1], `${q.id} — "${q.prompt}"`).toMatch(/בלי לגעת/);
  }
});

/**
 * docs/features/difficulty-number-scaling/product-spec.md's Acceptance Criteria, checked
 * directly against generated output rather than relying on `RULES` (which never looked at
 * digit counts or decimal precision — a 3-digit number or a 3-decimal answer passes every
 * existing rule just fine).
 */
function numbersIn(text: string): number[] {
  return (text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
}

function integerDigits(n: number): number {
  return String(Math.trunc(Math.abs(n))).length;
}

function decimalDigits(n: number): number {
  const s = String(n);
  const dot = s.indexOf(".");
  return dot === -1 ? 0 : s.length - dot - 1;
}

test("every difficulty-1 question, across all twelve topics, uses only single/double-digit numbers", () => {
  const violations: string[] = [];
  const samples = 200;

  for (const [topic, , generate] of ADAPTIVE_GENERATORS) {
    const rng = seededRng(topic.length * 7919 + 1);
    for (let i = 0; i < samples; i++) {
      const q = generate(1, rng);
      for (const n of [...numbersIn(q.prompt), q.answer]) {
        if (integerDigits(n) > 2) {
          violations.push(`${q.id} (${topic}, difficulty 1) — "${q.prompt}" = ${q.answer} has a ${integerDigits(n)}-digit number (${n})`);
        }
      }
    }
  }

  expect(violations, `\n${violations.join("\n")}\n`).toEqual([]);
});

test("the reported bug does not come back: אחוזים difficulty 1-2 never produces a 3-digit base", () => {
  // The exact complaint: "כמה זה 10% מ-960?" as a difficulty-1 question, and "50% מ-78"
  // being reachable almost immediately (difficulty 2 — a two-correct-streak away).
  const rng = seededRng(99);
  const violations: string[] = [];
  for (let difficulty = 1; difficulty <= 2; difficulty++) {
    for (let i = 0; i < 300; i++) {
      const q = generatePercentQuestion(difficulty, rng);
      const m = q.prompt.match(/^כמה זה (\d+)% מ-(\d+)\?$/);
      if (!m) continue; // difficulty 2 can occasionally land elsewhere via retry; skip
      const base = Number(m[2]);
      if (base >= 100) violations.push(`${q.id} (difficulty ${difficulty}) — "${q.prompt}" has a 3-digit base`);
    }
  }
  expect(violations, `\n${violations.join("\n")}\n`).toEqual([]);
});

test("the five decimal-eligible generators sometimes produce a non-integer answer, always at most two decimal digits", () => {
  // Per design.md's table: which topic, which difficulty tier(s) actually carry the ~30%
  // decimal draw. A later review ruled that a question must never show a decimal among its
  // own GIVEN numbers, only the answer may land on one — which removed decimal capability
  // entirely from ממוצע, ביטויים אלגבריים, and יחס ופרופורציה (each one's only decimal-capable
  // spot was a given, with no way to move it onto the answer instead), and narrowed
  // אחוזים/שטח והיקף down to just the one tier apiece where the answer alone can carry it.
  // שברים פשוטים/חזקות ושורשים/משפט פיתגורס were already integer-only from the start — see
  // architecture.md's Risks for why those three stay that way.
  const DECIMAL_TIERS: Record<string, number[]> = {
    "אחוזים": [5],
    "שטח והיקף": [4],
    "משוואות": [5],
    "פונקציה קווית": [5],
    "בעיות מילוליות": [5],
  };
  const samplesPerTier = 300;
  const tooManyDecimals: string[] = [];
  const neverWentDecimal: string[] = [];

  for (const [topic, , generate] of ADAPTIVE_GENERATORS) {
    const tiers = DECIMAL_TIERS[topic];
    if (!tiers) continue;
    for (const difficulty of tiers) {
      const rng = seededRng(topic.length * 104729 + difficulty);
      let sawDecimal = false;
      for (let i = 0; i < samplesPerTier; i++) {
        const q = generate(difficulty, rng);
        for (const n of [...numbersIn(q.prompt), q.answer]) {
          const dd = decimalDigits(n);
          if (dd > 0) sawDecimal = true;
          if (dd > 2) {
            tooManyDecimals.push(`${q.id} (${topic}, difficulty ${difficulty}) — "${q.prompt}" = ${q.answer} has a number with ${dd} decimal digits (${n})`);
          }
        }
      }
      if (!sawDecimal) {
        neverWentDecimal.push(`${topic} (difficulty ${difficulty}) never produced a decimal in ${samplesPerTier} samples`);
      }
    }
  }

  expect(tooManyDecimals, `\n${tooManyDecimals.join("\n")}\n`).toEqual([]);
  expect(neverWentDecimal, `\n${neverWentDecimal.join("\n")}\n`).toEqual([]);
});

test("a question never shows a decimal among its own given numbers — only the answer may land on one", () => {
  // The rule this test guards: a generated question's PROMPT numbers (the givens a child
  // reads and works from) must always be whole. Only the ANSWER — a number the child
  // computes, never one handed to them — may come out decimal. This was a real review
  // finding (14.5 as a triangle's base, 24.5 as an average's sum, x = 8.5 shown directly in
  // a prompt) across several generators; each was redesigned so the decimal draw lands on
  // the answer or an unshown intermediate instead of a given.
  // שברים עשרוניים is the one exception: decimal numbers ARE the subject matter there, so
  // they're expected right in the prompt ("1.5 + 1.5"), not a violation of this rule.
  const violations: string[] = [];
  const samplesPerTier = 150;

  for (const [topic, , generate] of ADAPTIVE_GENERATORS) {
    if (topic === "שברים עשרוניים") continue;
    for (let difficulty = 1; difficulty <= 5; difficulty++) {
      const rng = seededRng(topic.length * 65599 + difficulty);
      for (let i = 0; i < samplesPerTier; i++) {
        const q = generate(difficulty, rng);
        for (const n of numbersIn(q.prompt)) {
          if (decimalDigits(n) > 0) {
            violations.push(`${q.id} (${topic}, difficulty ${difficulty}) — "${q.prompt}" has a decimal given (${n})`);
          }
        }
      }
    }
  }

  expect(violations, `\n${violations.join("\n")}\n`).toEqual([]);
});

test("a generated question's 'X זה Y עשרות ו-Z יחידה/יחידות' hint stays singular/plural-correct", () => {
  // The exact mistake the hand-written questions had to get right first (see
  // docs/features/mika-grade2-content/tests.md, "סבב שני"): "יחידה" only when the count
  // named right next to it is really 1, never "1 יחידות".
  //
  // Scoped to this one sentence shape on purpose. A hint like "`4`+`3` עשרות, ו-`7`+`1`
  // יחידות" also contains a literal `1`, but it is naming the units *place* for a sum of
  // two numbers, not counting a single item — "יחידות" is correct there regardless of
  // either addend's value, and is not the pattern this check is about.
  //
  // Runs against both `add100` and its subtraction mirror `sub100` — same sentence shape,
  // same mistake to guard against (docs/features/mika-adaptive-difficulty).
  const rng = seededRng(7);
  const wrong: string[] = [];
  for (const generate of [generateAdd100Question, generateSub100Question]) {
    for (let difficulty = 1; difficulty <= 5; difficulty++) {
      for (let i = 0; i < 200; i++) {
        const q = generate(difficulty, rng);
        for (const hint of q.hints) {
          const m = hint.match(/זה\s*`\d+`\s*עשרות ו-`(\d+)`\s*(יחידה|יחידות)\b/);
          if (!m) continue;
          const [, count, word] = m;
          const shouldBeSingular = count === "1";
          if (shouldBeSingular && word !== "יחידה") {
            wrong.push(`${q.id} — "1" paired with plural "${word}": "${hint}"`);
          }
          if (!shouldBeSingular && word !== "יחידות") {
            wrong.push(`${q.id} — "${count}" paired with singular "${word}": "${hint}"`);
          }
        }
      }
    }
  }
  expect(wrong, `\n${wrong.join("\n")}\n`).toEqual([]);
});

test("a generated question's 'X עשרה/עשרות ועוד/פחות Y עשרה/עשרות' hint stays singular/plural-correct", () => {
  // Same distinction, different sentence: the whole-tens pattern (`30 + 40` / `70 − 30`)
  // names each operand's own ten count directly. The two hand-written add100 examples
  // (e6: 3+4, e7: 5+3) never happened to land on a tens digit of exactly 1, so this shape
  // of the mistake had nothing to be caught against until the generator started sampling
  // the full 1-8 range — this is the check that closes that gap, now also for sub100's
  // own whole-tens pattern (docs/features/mika-adaptive-difficulty).
  const rng = seededRng(13);
  const wrong: string[] = [];
  for (const generate of [generateAdd100Question, generateSub100Question]) {
    for (let difficulty = 1; difficulty <= 5; difficulty++) {
      for (let i = 0; i < 200; i++) {
        const q = generate(difficulty, rng);
        for (const hint of q.hints) {
          for (const m of hint.matchAll(/`(\d+)`\s*(עשרה|עשרות)\b/g)) {
            const [, count, word] = m;
            const shouldBeSingular = count === "1";
            if (shouldBeSingular && word !== "עשרה") {
              wrong.push(`${q.id} — "1" paired with plural "${word}": "${hint}"`);
            }
            if (!shouldBeSingular && word !== "עשרות") {
              wrong.push(`${q.id} — "${count}" paired with singular "${word}": "${hint}"`);
            }
          }
        }
      }
    }
  }
  expect(wrong, `\n${wrong.join("\n")}\n`).toEqual([]);
});
