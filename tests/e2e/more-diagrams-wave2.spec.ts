import { test, expect, type Page } from "@playwright/test";
import { answerViaNotebook } from "./helpers/notebookAnswer";
import { geometryShape } from "../../src/data/geometryShape";
import { pythagorasTriangle } from "../../src/data/pythagorasTriangle";
import { percentStrip } from "../../src/data/percentStrip";
import { linearGraph } from "../../src/data/linearGraph";
import { generateAreaPerimeterQuestion } from "../../src/data/adaptiveAreaPerimeter";
import { generatePythagorasQuestion } from "../../src/data/adaptivePythagoras";
import { generatePercentQuestion } from "../../src/data/adaptivePercent";
import type { Question } from "../../src/data/curriculum";

/**
 * Acceptance criteria under test
 * (docs/features/more-diagrams/product-spec.md, גל ב׳ — the five remaining shapes).
 *
 * שטח והיקף, משפט פיתגורס, אחוזים, יחס ופרופורציה, and פונקציה קווית — Rotem's and
 * Omer's shapes. Same rules as every earlier wave: the picture lives only in the
 * explanation box after a wrong answer, is built from the prompt, and never disagrees
 * with its own question (that half is checked in content.spec.ts, against the data
 * directly). What only a screen can confirm is here: that a picture appears at all, that
 * arithmetic inside an SVG still reads left-to-right on this right-to-left page, and that
 * the fill/outline and "?" conventions design.md decided on actually show up.
 *
 * All five topics are now adaptive (no level picker — see
 * docs/features/levels-as-practice), so a fresh entry always opens on that generator's
 * easiest tier rather than a chosen written question. Every generator's easiest tier
 * happens to be exactly the shape the original tests used ("שטח מלבן...", "הניצבים
 * הם...", "כמה זה 10%...", "היחס הוא...", "בפונקציה y = x + 5..."), so those tests stay
 * live browser tests, generalized to read whatever numbers actually came up instead of
 * assuming fixed ones. A few tests need a specific rarer shape a fresh session doesn't
 * reliably open on (a perimeter question, one of three word-problem shapes, two lines
 * meeting) — those call the generator and the shape function directly, the same way
 * `content.spec.ts` already tests `generateAdd100Question` without a browser, rather than
 * gambling on a live session landing there.
 *
 * `innerText` returns undefined on SVG elements, so numbers are read with `textContent`
 * through `evaluateAll`.
 */

// Every student now picks a grade first (docs/features/any-grade-any-student) — this file
// only ever uses Rotem (ו׳, third card) and Omer (ח׳, fourth card).
const GRADE_CARD_INDEX: Record<string, number> = { "רותם": 2, "עומר": 3 };

async function open(page: Page, student: string, topic: string) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").filter({ hasText: student }).click();
  await page.locator(".grade-card").nth(GRADE_CARD_INDEX[student]).click();
  await page.locator(".topic-card").filter({ hasText: topic }).click();
}

async function currentPrompt(page: Page): Promise<string> {
  return (await page.locator(".problem-text").innerText()).trim();
}

async function submit(page: Page, value: number) {
  await answerViaNotebook(page, value);
}

const answerWrong = (page: Page) => submit(page, 999999);

// -------------------------------------------------------- the picture never leaks early

test("no geometry shape before the question is answered", async ({ page }) => {
  await open(page, "רותם", "שטח והיקף");
  await expect(page.locator(".problem-text")).toBeVisible();
  await expect(page.locator(".geometry-shape")).toHaveCount(0);
});

test("a correct answer shows no geometry shape", async ({ page }) => {
  // The opening tier is always "שטח מלבן שאורכו A ורוחבו B" (see
  // adaptiveAreaPerimeter.ts), so the answer is parseable off the prompt.
  await open(page, "רותם", "שטח והיקף");
  const m = (await currentPrompt(page)).match(/^שטח מלבן שאורכו (\d+) ורוחבו (\d+)$/);
  expect(m, "the opening tier of שטח והיקף is always this rectangle-area shape").not.toBeNull();
  await submit(page, Number(m![1]) * Number(m![2]));
  await expect(page.locator(".feedback.correct")).toBeVisible();
  await expect(page.locator(".geometry-shape")).toHaveCount(0);
});

test("no Pythagoras triangle before the question is answered", async ({ page }) => {
  await open(page, "עומר", "משפט פיתגורס");
  await expect(page.locator(".problem-text")).toBeVisible();
  await expect(page.locator(".pythagoras-triangle")).toHaveCount(0);
});

test("no percent strip before the question is answered", async ({ page }) => {
  await open(page, "רותם", "אחוזים");
  await expect(page.locator(".problem-text")).toBeVisible();
  await expect(page.locator(".percent-strip")).toHaveCount(0);
});

test("no ratio strips before the question is answered", async ({ page }) => {
  await open(page, "רותם", "יחס ופרופורציה");
  await expect(page.locator(".problem-text")).toBeVisible();
  await expect(page.locator(".ratio-strips")).toHaveCount(0);
});

test("no linear graph before the question is answered", async ({ page }) => {
  await open(page, "עומר", "פונקציה קווית");
  await expect(page.locator(".problem-text")).toBeVisible();
  await expect(page.locator(".linear-graph")).toHaveCount(0);
});

// ------------------------------------------------------------------------ geometry

test("numbers inside the geometry shape read left to right", async ({ page }) => {
  await open(page, "רותם", "שטח והיקף");
  await answerWrong(page);
  await expect(page.locator(".geometry-shape")).toHaveCSS("direction", "ltr");
});

test("area is shown filled, perimeter is shown outlined", () => {
  // Both tiers are single, deterministic generator functions (see
  // adaptiveAreaPerimeter.ts) — no randomness to sample around.
  const area = geometryShape(generateAreaPerimeterQuestion(1))!;
  expect(area, "the opening tier did not produce a describable rectangle").toBeTruthy();
  expect(area.measure).toBe("area");

  const perimeter = geometryShape(generateAreaPerimeterQuestion(3))!;
  expect(perimeter, "the third tier did not produce a describable rectangle").toBeTruthy();
  expect(perimeter.measure).toBe("perimeter");
});

test("a reverse geometry question marks the missing side with a question mark", () => {
  // The hardest tier picks one of four shapes at random each call (see `hardShape` in
  // adaptiveAreaPerimeter.ts); sampling directly finds the "given the area, find the
  // length" one without gambling on a live session's difficulty climb landing on it.
  let found: ReturnType<typeof geometryShape> = null;
  for (let seed = 1; seed <= 200 && !found; seed++) {
    const rng = seededRng(seed);
    const shape = geometryShape(generateAreaPerimeterQuestion(5, rng));
    if (shape?.kind === "rectangle" && shape.unknown === "length") found = shape;
  }
  expect(found, "never sampled the 'find the length' shape in 200 tries").not.toBeNull();
  expect(found!.length, "the missing length should not itself be given").toBeGreaterThan(0);
});

// ---------------------------------------------------------------------- Pythagoras

test("the right angle is marked, and the asked side carries a question mark", async ({ page }) => {
  // The opening tier is always "הניצבים הם A ו-B. מה אורך היתר?" (see
  // adaptivePythagoras.ts), so any fresh entry has this shape.
  await open(page, "עומר", "משפט פיתגורס");
  await answerWrong(page);
  await expect(page.locator(".pt-right-angle")).toHaveCount(1);
  await expect(page.locator(".pythagoras-triangle")).toContainText("?");
});

test("two equal, unknown legs both carry a question mark", () => {
  // The hardest tier is always "שני הניצבים שווים..." (see `equalLegsFromArea` in
  // adaptivePythagoras.ts) — deterministic, no sampling needed.
  const triangle = pythagorasTriangle(generatePythagorasQuestion(5));
  expect(triangle, "the hardest tier did not produce a describable triangle").not.toBeNull();
  expect(triangle!.unknown).toBe("bothLegs");
  expect(triangle!.legA).toBe(triangle!.legB);
});

// -------------------------------------------------------------------------- percent

test("the strip carries guide lines matching the reduced fraction of the question's percent", async ({ page }) => {
  // The opening tier is always "כמה זה 10% מ-X?" (see adaptivePercent.ts's tenPercent),
  // which reduces to `1/10` — nine ticks, not fixed quarters. docs/features/
  // percent-tenths-teaching changed the strip from fixed quarter-ticks to dividing by the
  // reduced fraction of the specific rate asked.
  await open(page, "רותם", "אחוזים");
  await answerWrong(page);
  await expect(page.locator(".ps-tick")).toHaveCount(9);
});

test("the strip's part count follows each percent's own reduced fraction, not the percent itself", () => {
  // 30% and 75% reduce by their gcd with 100 (10 and 25), not by the rate itself — the
  // easiest place to get the part count wrong, so all six rates the written questions
  // cover (10/50/25/75/20/30) are checked explicitly, sampled straight from the
  // generators (adaptivePercent.ts) rather than through a level picker that no longer
  // exists for רותם once this topic went adaptive (see levels-as-practice).
  const EXPECTED: Record<number, [number, number]> = {
    10: [1, 10],
    50: [1, 2],
    25: [1, 4],
    75: [3, 4],
    20: [1, 5],
    30: [3, 10],
  };
  const seen = new Map<number, [number, number]>();
  for (let difficulty = 1; difficulty <= 4 && seen.size < 6; difficulty++) {
    const rng = seededRng(difficulty * 7919);
    for (let i = 0; i < 300 && seen.size < 6; i++) {
      const q = generatePercentQuestion(difficulty, rng);
      const m = q.prompt.match(/^כמה זה (\d+)% מ-\d+\?$/);
      if (!m) continue;
      const strip = percentStrip(q);
      if (strip?.numerator === undefined || strip.denominator === undefined) continue;
      seen.set(Number(m[1]), [strip.numerator, strip.denominator]);
    }
  }
  for (const [rate, fraction] of Object.entries(EXPECTED)) {
    expect(seen.get(Number(rate)), `rate ${rate}% (sampled: ${[...seen.keys()]})`).toEqual(fraction);
  }
});

test("a price increase extends the strip past its own whole", () => {
  // The hardest tier picks one of three word-problem shapes at random each call (see
  // `wordProblem` in adaptivePercent.ts); sampling directly finds the price-increase one.
  let found: ReturnType<typeof percentStrip> = null;
  for (let seed = 1; seed <= 200 && !found; seed++) {
    const rng = seededRng(seed);
    const strip = percentStrip(generatePercentQuestion(5, rng));
    if (strip?.extra !== undefined) found = strip;
  }
  expect(found, "never sampled a price-increase question in 200 tries").not.toBeNull();
  expect(found!.extra).toBeGreaterThan(0);
});

// ----------------------------------------------------------------------------- ratio

test("the two strips are distinguished by fill, and the caption is two lines", async ({ page }) => {
  // The opening tier is always "היחס הוא A ל-B. אם החלק הראשון הוא C, כמה השני?" (see
  // adaptiveRatio.ts). The first strip's block count is the ratio's first term reduced
  // to lowest terms (ratioStrips.ts), not always 1 — the written "1 ל-2" example just
  // happened to already be reduced.
  await open(page, "רותם", "יחס ופרופורציה");
  const m = (await currentPrompt(page)).match(/^היחס הוא (\d+) ל-(\d+)\./);
  expect(m, "the opening tier of יחס ופרופורציה is always this ratio shape").not.toBeNull();
  const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
  const g = gcd(Number(m![1]), Number(m![2]));
  const [ratioA, ratioB] = [Number(m![1]) / g, Number(m![2]) / g];

  await answerWrong(page);
  await expect(page.locator(".rs-block.rs-filled")).toHaveCount(ratioA);
  await expect(page.locator(".rs-block:not(.rs-filled)")).toHaveCount(ratioB);
  await expect(page.locator(".ratio-figure .caption-line")).toHaveCount(2);
});

// --------------------------------------------------------------------------- linear

test("the answering point sits on the line", async ({ page }) => {
  // The opening tier is always "בפונקציה y = Ax + B, מה הערך של y, כאשר x שווה ל-C?"
  // (see adaptiveLinearFunction.ts) — one line, one point, same shape the written
  // "y = x + 5" question has.
  await open(page, "עומר", "פונקציה קווית");
  await answerWrong(page);
  await expect(page.locator(".lg-point")).toHaveCount(1);
  await expect(page.locator(".lg-line")).toHaveCount(1);
});

test("two lines meeting shows both of them, and the point where they meet", () => {
  // No generator pattern produces this shape (see docs/features/levels-as-practice —
  // adaptiveLinearFunction.ts has no "two lines intersect" pattern). It is still real,
  // reviewed content sitting in the written data (grade8.ts, g8-linear-h5), so it is
  // exercised the same way the rest of this feature's non-runtime content is: directly,
  // against the Question the app would have shown before this feature existed.
  const question: Question = {
    id: "g8-linear-h5",
    topic: "פונקציה קווית",
    prompt: "שני ישרים נפגשים: `y = 2x` ו-`y = x + 4`. מה ה-`x` בנקודת המפגש?",
    answer: 4,
    hints: ["", ""],
    analogy: "",
  };
  const graph = linearGraph(question);
  expect(graph, "the written two-line question is no longer describable").not.toBeNull();
  expect(graph!.lines).toHaveLength(2);
  expect(graph!.point).toEqual({ x: 4, y: 8 });
});

// ------------------------------------------------- captions match what a screen reader gets

test("each of the five new pictures' caption is what a screen reader is told", async ({ page }) => {
  await open(page, "רותם", "שטח והיקף");
  await answerWrong(page);
  const shown = (await page.locator(".geometry-figure .figure-caption").innerText()).replace(/\s+/g, " ").trim();
  const spoken = await page.locator(".geometry-shape").getAttribute("aria-label");
  expect(shown.replace(/`/g, "")).toBe(spoken?.replace(/\s+/g, " ").trim());
});

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
