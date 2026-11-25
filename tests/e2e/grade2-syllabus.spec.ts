import { test, expect, type Page } from "@playwright/test";
import { answerQuestion, waitForNextQuestionOrEnd } from "./helpers/answerQuestion";
import { createAndSelectStudent } from "./helpers/selectStudent";

/**
 * Acceptance criteria under test (docs/features/grade2-syllabus/product-spec.md and
 * design.md):
 *
 *  1. (Superseded by docs/features/grade2-addsub-to-100) חיבור/חיסור used to reach
 *     three-digit problems; now they must stay at or under 100.
 *  2. Grade ב׳ shows four topic cards, including the two new ones: כפל וחילוק and
 *     צורות וגופים.
 *  3. כפל וחילוק and צורות וגופים are both **adaptive** — no level to pick, straight into
 *     a 20-question practice session — the same mechanism חיבור/חיסור עד 100 already
 *     use (corrected 2026-09-01: an earlier pass built them as three fixed levels, which
 *     was wrong).
 *  4. A כפל וחילוק question is a bare expression, rendered left-to-right inside the RTL
 *     page — the same rule that already applies everywhere else.
 *  5. A צורות וגופים question is a plain Hebrew sentence with a numeric answer — no
 *     arithmetic expression, so no LTR-forcing is needed or expected.
 *  6. Both new topics keep working with the existing mechanics: hints, the explanation
 *     shown after a wrong answer, the notebook-based answer flow, and a lesson (📖)
 *     button alongside practice.
 *  7. A full practice session of either new topic still ends on a score summary.
 *  8. A streak of correct answers on כפל וחילוק eventually reaches a basic division
 *     question (product-spec.md: "לפחות בדרגות הקושי הגבוהות... חלק מהשאלות עוסקות
 *     במושג בסיסי של חילוק").
 */

const GRADE_B = 1;

async function open(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

async function toGradeB(page: Page) {
  await createAndSelectStudent(page);
  await page.locator(".grade-card").nth(GRADE_B).click();
}

async function openTopic(page: Page, name: string) {
  await toGradeB(page);
  await page.locator(".topic-card", { hasText: name }).click();
  // A topic card now opens its lesson first (docs/features/lesson-always-first) — skip
  // straight to practice, same as every other call site that used to land there directly.
  await page.getByRole("button", { name: "דלג לתרגול →" }).click();
}

async function nextOrFinish(page: Page) {
  await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
}

test.beforeEach(async ({ page }) => {
  await open(page);
});

test("grade ב׳ shows five topics, including כפל וחילוק and צורות וגופים", async ({ page }) => {
  // Five, not the four this feature originally shipped with — grade2-clock added a fifth
  // topic (שעון וזמן) afterwards. This assertion tracks the current syllabus, not the
  // count at the time this test was written.
  await toGradeB(page);
  const topics = page.locator(".topic-card");
  await expect(topics).toHaveCount(5);
  for (const title of ["חיבור עד 100", "חיסור עד 100", "כפל וחילוק", "צורות וגופים", "שעון וזמן"]) {
    await expect(page.locator(".topic-card", { hasText: title })).toHaveCount(1);
  }
});

test("both new topics enter a real lesson on click, like every other topic", async ({
  page,
}) => {
  await toGradeB(page);
  for (const title of ["כפל וחילוק", "צורות וגופים"]) {
    await page.locator(".topic-card", { hasText: title }).click();
    await expect(page.locator(".problem-box").first()).toBeVisible();
    await expect(page.locator(".answer-input")).toHaveCount(0);
    await page.getByRole("button", { name: "← חזרה" }).click();
  }
});

test("both new topics are adaptive, entered directly with no level to pick", async ({ page }) => {
  for (const title of ["כפל וחילוק", "צורות וגופים"]) {
    // beforeEach only resets once per test, not per loop iteration — each pass needs its
    // own fresh start, or the second openTopic() finds mid-practice state instead of the
    // student/grade pickers it expects.
    await open(page);
    await openTopic(page, title);
    await expect(page.locator(".level-card"), title).toHaveCount(0);
    await expect(page.locator(".progress"), title).toContainText("מתוך 20");
  }
});

test("כפל וחילוק is a bare expression shown left-to-right; צורות וגופים is a plain Hebrew sentence", async ({
  page,
}) => {
  await openTopic(page, "כפל וחילוק");
  // scored-answer-practice removed the notebook — the question is back to a plain
  // .problem-box, same as TopicLesson.tsx. See docs/features/scored-answer-practice/.
  const multBox = page.locator(".problem-box");
  await expect(multBox).toBeVisible();
  await expect(multBox).toHaveCSS("direction", "ltr");
  await expect(page.locator(".problem-text")).toContainText("×");
  await expect(page.locator(".problem-text")).toContainText("=");

  await open(page); // beforeEach only resets once — the second topic needs its own fresh start
  await openTopic(page, "צורות וגופים");
  const shapeBox = page.locator(".problem-box");
  await expect(shapeBox).toBeVisible();
  await expect(shapeBox).not.toHaveClass(/box-ltr/);
  await expect(shapeBox).toHaveCSS("direction", "rtl");
  await expect(page.locator(".problem-text")).toContainText("?");
});

test("a wrong answer in כפל וחילוק still shows two hints and a real explanation", async ({ page }) => {
  await openTopic(page, "כפל וחילוק");

  await expect(page.locator(".hint")).toHaveCount(0);
  await page.locator(".hint-button").click();
  await expect(page.locator(".hint")).toHaveCount(1);
  await page.locator(".hint-button").click();
  await expect(page.locator(".hint")).toHaveCount(2);
  await expect(page.locator(".hint-button")).toHaveCount(0);

  await answerQuestion(page, 99999); // guaranteed wrong for every question in this topic
  await expect(page.locator(".feedback.wrong")).toBeVisible();
  await expect(page.locator(".explanation")).toBeVisible();
  expect(await page.locator(".explanation-step").count()).toBeGreaterThan(0);
});

test("a numeric answer to a צורות וגופים question still runs through the usual feedback path", async ({
  page,
}) => {
  // Geometry questions read like ordinary word problems, with no arithmetic expression to
  // compute from — unlike every arithmetic topic this suite otherwise tests, there's no
  // way to derive the right answer from the prompt text alone here. What this confirms is
  // that the mechanism itself still works for this shape of question: a typed number goes
  // in through the notebook, and real feedback (right or wrong) comes back — not a blank
  // or broken screen.
  await openTopic(page, "צורות וגופים");

  await expect(page.locator(".problem-text")).not.toBeEmpty();
  await answerQuestion(page, 4);
  const feedback = page.locator(".feedback");
  await expect(feedback).toBeVisible();
  expect(await feedback.getAttribute("class")).toMatch(/\b(correct|wrong)\b/);
});

test("a full practice session of כפל וחילוק ends on a score summary", async ({ page }) => {
  await openTopic(page, "כפל וחילוק");

  const total = Number((await page.locator(".progress").innerText()).match(/מתוך (\d+)/)![1]);
  for (let i = 0; i < total; i++) {
    await answerQuestion(page, 99999); // wrong every time — the score itself isn't the point here
    await nextOrFinish(page);
  }
  await expect(page.locator(".result .score")).toContainText(`מתוך ${total}`);
});

/** `"247 + 68"` → `[247, 68]`. Every add100/sub100 question, written or generated. */
function operands(prompt: string, operator: "+" | "−"): [number, number] {
  const escaped = operator === "+" ? "\\+" : "−";
  const m = prompt.trim().match(new RegExp(`^(\\d+)\\s*${escaped}\\s*(\\d+)\\s*=?$`));
  if (!m) throw new Error(`not a bare "${operator}" expression: "${prompt}"`);
  return [Number(m[1]), Number(m[2])];
}

async function currentOperands(page: Page, operator: "+" | "−"): Promise<[number, number]> {
  return operands(await page.locator(".problem-text").innerText(), operator);
}

async function answerCorrectly(page: Page, operator: "+" | "−") {
  const [a, b] = await currentOperands(page, operator);
  await answerQuestion(page, operator === "+" ? a + b : a - b);
  // A correct answer advances on its own (docs/features/scored-answer-practice/) — no
  // "הבא" button exists for this path, unlike a wrong one. The caller installs a fake
  // clock first, so fast-forward it past the real 2s post-answer celebration delay
  // (src/components/Practice.tsx) instead of actually waiting it out.
  await page.clock.runFor(2000);
  await waitForNextQuestionOrEnd(page);
}

test("a streak of correct answers on חיבור עד 100 never leaves the 100 range", async ({
  page,
}) => {
  // Superseded 2026-11-25 (docs/features/grade2-addsub-to-100): the user capped grade ב׳
  // add/sub at 100, so the old "eventually reaches a three-digit problem" is now the
  // opposite: the top tier (reached by a full streak) must still stay at or under 100.
  test.setTimeout(60000);
  await openTopic(page, "חיבור עד 100");
  await page.clock.install();
  for (let i = 0; i < 20; i++) {
    const [a, b] = await currentOperands(page, "+");
    expect(a, "operand over 100").toBeLessThanOrEqual(100);
    expect(b, "operand over 100").toBeLessThanOrEqual(100);
    expect(a + b, "sum over 100").toBeLessThanOrEqual(100);
    await answerCorrectly(page, "+");
  }
});

test("a streak of correct answers on חיסור עד 100 never leaves the 100 range", async ({
  page,
}) => {
  test.setTimeout(60000);
  await openTopic(page, "חיסור עד 100");
  await page.clock.install();
  for (let i = 0; i < 20; i++) {
    const [a, b] = await currentOperands(page, "−");
    expect(a, "minuend over 100").toBeLessThanOrEqual(100);
    expect(b).toBeLessThanOrEqual(a);
    await answerCorrectly(page, "−");
  }
});

test("a streak of correct answers on כפל וחילוק eventually reaches a basic division question", async ({
  page,
}) => {
  // 20 correct answers in a row — same fake-clock fast-forward as the two tests above.
  test.setTimeout(60000);
  await openTopic(page, "כפל וחילוק");
  await page.clock.install();
  let sawDivision = false;
  for (let i = 0; i < 20; i++) {
    const prompt = (await page.locator(".problem-text").innerText()).trim();
    const mult = prompt.match(/^(\d+)\s*×\s*(\d+)\s*=?$/);
    const div = prompt.match(/^(\d+)\s*÷\s*(\d+)\s*=?$/);
    if (div) {
      sawDivision = true;
      const [n, k] = [Number(div[1]), Number(div[2])];
      await answerQuestion(page, n / k);
    } else if (mult) {
      const [a, b] = [Number(mult[1]), Number(mult[2])];
      await answerQuestion(page, a * b);
    } else {
      throw new Error(`not a bare multiplication or division: "${prompt}"`);
    }
    // A correct answer advances on its own — no "הבא" button for this path.
    await page.clock.runFor(2000);
    await waitForNextQuestionOrEnd(page);
  }
  expect(sawDivision, "a full streak of correct answers never reached a division question").toBe(true);
});
