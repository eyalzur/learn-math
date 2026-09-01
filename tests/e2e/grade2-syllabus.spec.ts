import { test, expect, type Page } from "@playwright/test";
import { answerViaNotebook } from "./helpers/notebookAnswer";

/**
 * Acceptance criteria under test (docs/features/grade2-syllabus/product-spec.md and
 * design.md):
 *
 *  1. חיבור עד 1000 / חיסור עד 1000 (already adaptive) now also reach three-digit
 *     problems — not just carrying/borrowing under 100 — when answered correctly enough.
 *  2. Grade ב׳ shows four topic cards, including the two new ones: כפל וחילוק and
 *     צורות וגופים.
 *  3. כפל וחילוק and צורות וגופים are both **adaptive** — no level to pick, straight into
 *     a 20-question practice session — the same mechanism חיבור/חיסור עד 1000 already
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
 */

const MIKA = 0;
const GRADE_B = 1;

async function open(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

async function toGradeB(page: Page) {
  await page.locator(".student-card").nth(MIKA).click();
  await page.locator(".grade-card").nth(GRADE_B).click();
}

async function openTopic(page: Page, name: string) {
  await toGradeB(page);
  await page.locator(".topic-card", { hasText: name }).click();
}

async function nextOrFinish(page: Page) {
  await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
}

test.beforeEach(async ({ page }) => {
  await open(page);
});

test("grade ב׳ shows four topics, including כפל וחילוק and צורות וגופים", async ({ page }) => {
  await toGradeB(page);
  const topics = page.locator(".topic-card");
  await expect(topics).toHaveCount(4);
  for (const title of ["חיבור עד 1000", "חיסור עד 1000", "כפל וחילוק", "צורות וגופים"]) {
    await expect(page.locator(".topic-card", { hasText: title })).toHaveCount(1);
  }
});

test("both new topics still offer a lesson (📖) alongside practice, like every other topic", async ({
  page,
}) => {
  await toGradeB(page);
  for (const title of ["כפל וחילוק", "צורות וגופים"]) {
    const row = page.locator(".topic-row", { has: page.locator(".topic-card", { hasText: title }) });
    await expect(row.locator(".lesson-link")).toBeVisible();
  }
});

for (const title of ["כפל וחילוק", "צורות וגופים"]) {
  test(`${title} is adaptive, entered directly with no level to pick`, async ({ page }) => {
    await openTopic(page, title);
    await expect(page.locator(".level-card")).toHaveCount(0);
    await expect(page.locator(".progress")).toContainText("מתוך 20");
  });
}

test("a כפל וחילוק question is a bare expression, shown left-to-right", async ({ page }) => {
  await openTopic(page, "כפל וחילוק");

  const box = page.locator(".problem-box");
  await expect(box).toBeVisible();
  await expect(box).toHaveCSS("direction", "ltr");
  await expect(page.locator(".problem-text")).toContainText("×");
  await expect(page.locator(".problem-text")).toContainText("=");
});

test("a צורות וגופים question is a plain Hebrew sentence, with no arithmetic to isolate", async ({
  page,
}) => {
  await openTopic(page, "צורות וגופים");

  const box = page.locator(".problem-box");
  await expect(box).toBeVisible();
  await expect(box).not.toHaveClass(/box-ltr/);
  await expect(box).toHaveCSS("direction", "rtl");
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

  await answerViaNotebook(page, -1); // guaranteed wrong for every question in this topic
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
  await answerViaNotebook(page, 4);
  const feedback = page.locator(".feedback");
  await expect(feedback).toBeVisible();
  expect(await feedback.getAttribute("class")).toMatch(/\b(correct|wrong)\b/);
});

test("a full practice session of כפל וחילוק ends on a score summary", async ({ page }) => {
  await openTopic(page, "כפל וחילוק");

  const total = Number((await page.locator(".progress").innerText()).match(/מתוך (\d+)/)![1]);
  for (let i = 0; i < total; i++) {
    await answerViaNotebook(page, -1); // wrong every time — the score itself isn't the point here
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
  await answerViaNotebook(page, operator === "+" ? a + b : a - b);
  await nextOrFinish(page);
}

test("a streak of correct answers on חיבור עד 1000 eventually reaches a three-digit problem", async ({
  page,
}) => {
  await openTopic(page, "חיבור עד 1000");
  let sawThreeDigits = false;
  for (let i = 0; i < 20; i++) {
    const [a, b] = await currentOperands(page, "+");
    if (a >= 100 || b >= 100 || a + b >= 100) sawThreeDigits = true;
    await answerCorrectly(page, "+");
  }
  expect(sawThreeDigits, "a full streak of correct answers never reached a 3-digit problem").toBe(true);
});

test("a streak of correct answers on חיסור עד 1000 eventually reaches a three-digit problem", async ({
  page,
}) => {
  await openTopic(page, "חיסור עד 1000");
  let sawThreeDigits = false;
  for (let i = 0; i < 20; i++) {
    const [a] = await currentOperands(page, "−");
    if (a >= 100) sawThreeDigits = true;
    await answerCorrectly(page, "−");
  }
  expect(sawThreeDigits, "a full streak of correct answers never reached a 3-digit problem").toBe(true);
});
