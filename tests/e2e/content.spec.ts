import { test, expect } from "@playwright/test";
import { grades, promptSegments } from "../../src/data/curriculum";
import type { Question } from "../../src/data/curriculum";
import { explainQuestion } from "../../src/data/explain";
import { fractionDiagram } from "../../src/data/fractionDiagram";
import { verticalSum } from "../../src/data/verticalSum";
import { numberLine } from "../../src/data/numberLine";
import { tenFrame } from "../../src/data/tenFrame";
import { twentyStrip } from "../../src/data/twentyStrip";
import { STYLE_META, stylesOf, hasStyleLessons } from "../../src/data/style";

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

test("exactly thirty questions write themselves in columns", () => {
  // Eligibility is recomputed here from the spec's own words — a bare `a + b` / `a − b`,
  // columns worth aligning, no borrowing, and column arithmetic that lands on the
  // recorded answer — independently of the module that draws the block. If the two ever
  // disagree, one of them is wrong about what the product promised, and this is what
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
      for (let i = 0; i < width; i++) if (digit(A, i) < digit(B, i)) return false; // borrow
    }
    const result = m[2] === "+" ? A + B : A - B;
    return result === Math.round(q.answer * 10 ** scale);
  };

  const all = everyQuestion();
  const expected = all.filter(({ q }) => eligible(q));
  // Grew from 30 to 80 when grade 2 landed: every add100 question (carrying included —
  // this rule only excludes borrowing, not carrying) plus every no-borrow sub100
  // question is itself column-writable arithmetic, independently of the diagram module.
  expect(expected.length, "the set of column-writable questions changed size").toBe(80);

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
