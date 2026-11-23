import { test, expect, type Page } from "@playwright/test";
import { answerQuestion, waitForNextQuestionOrEnd } from "./helpers/answerQuestion";
import { createAndSelectStudent } from "./helpers/selectStudent";

/**
 * Acceptance criteria under test (docs/features/stitch-visual-refresh/product-spec.md).
 *
 * Reuses the same deterministic lesson other specs already rely on: מיקה ← כיתה א׳ ←
 * "מספרים עד 20" ← "מה בא אחרי" (fixed written questions, 8 in total, every "right"
 * answer known in advance — see scored-answer-practice.spec.ts's own header comment).
 * "חיבור עד 10" is adaptive (random operands within the topic's own ≤10 range), so its
 * tests read the real prompt at runtime instead of assuming a fixed one.
 */

const DETERMINISTIC_ANSWERS = [4, 6, 7, 9, 13, 16, 18, 20]; // every "מה בא אחרי" answer, in order

async function openDeterministicTopic(page: Page) {
  await page.goto("/learn-math/");
  await createAndSelectStudent(page);
  await page.getByRole("button", { name: "כיתה א׳" }).click();
}

/** Assumes the caller already navigated to the topic list (openDeterministicTopic) —
 *  does not navigate itself, so it composes with a test that needs to look at that list
 *  before practicing. Picking a reviewed topic now opens its lesson first
 *  (lesson-always-first), so "דלג לתרגול" (skip to practice) is needed to reach the
 *  same style picker a direct topic click used to land on. */
async function practiceDeterministicLesson(page: Page) {
  await page.getByRole("button", { name: "מספרים עד 20", exact: true }).click();
  await page.getByRole("button", { name: "דלג לתרגול" }).click();
  await page.getByRole("button", { name: "מה בא אחרי" }).click();
  for (const value of DETERMINISTIC_ANSWERS) {
    await answerQuestion(page, value);
    await waitForNextQuestionOrEnd(page);
  }
  await expect(page.locator(".score")).toBeVisible({ timeout: 3000 });
}

async function finishDeterministicLesson(page: Page) {
  await openDeterministicTopic(page);
  await practiceDeterministicLesson(page);
}

test("each student's card shows a fixed visual badge beside their name, consistent across reloads", async ({
  page,
}) => {
  await page.goto("/learn-math/");
  const name = await createAndSelectStudent(page);
  await page.getByRole("button", { name: /החלף תלמיד/ }).click();

  const card = page.locator(".student-card", { hasText: name });
  await expect(card.locator(".student-name")).toHaveText(name);
  const badge = card.locator(".student-badge");
  await expect(badge).toBeVisible();
  const before = await badge.textContent();
  expect(before?.trim()).not.toBe("");

  await page.reload();
  const after = await page.locator(".student-card", { hasText: name }).locator(".student-badge").textContent();
  expect(after).toBe(before);
});

test("a topic's star rating starts empty and reflects real accuracy after practicing it", async ({ page }) => {
  await openDeterministicTopic(page);
  const topicCard = page.locator(".topic-card", { hasText: "מספרים עד 20" });
  await expect(topicCard.locator(".topic-star-on")).toHaveCount(0);

  await practiceDeterministicLesson(page);
  await page.getByRole("button", { name: "חזרה לתפריט" }).click();
  await page.getByRole("button", { name: "← חזרה" }).click(); // out of the style list, back to topics

  // Every answer above was correct — 100% accuracy earns all 3 stars.
  await expect(page.locator(".topic-card", { hasText: "מספרים עד 20" }).locator(".topic-star-on")).toHaveCount(3);
});

test("there is no daily-challenge banner or similar element on the topic list", async ({ page }) => {
  await openDeterministicTopic(page);
  await expect(page.getByText(/אתגר יומי/)).toHaveCount(0);
});

test("digits can be entered on-screen, and the quantity illustration matches this question's own numbers", async ({
  page,
}) => {
  await openDeterministicTopic(page);
  await page.getByRole("button", { name: "חיבור עד 10", exact: true }).click();
  await page.getByRole("button", { name: "דלג לתרגול" }).click(); // lesson-always-first

  // On-screen digit entry writes into the same answer field a physical keyboard would.
  const pad = page.locator(".number-pad");
  await expect(pad).toBeVisible();
  await pad.getByRole("button", { name: "5", exact: true }).click();
  await expect(page.locator(".answer-input")).toHaveValue("5");
  await pad.getByRole("button", { name: "מחיקת ספרה" }).click();
  await expect(page.locator(".answer-input")).toHaveValue("");

  // The illustration's own contract (design.md): shown for a bare add/subtract question
  // with both operands small enough to count (1–10), matching the real numbers — absent
  // otherwise. Read the real prompt rather than assuming one, since this topic is adaptive.
  const prompt = (await page.locator(".problem-text").innerText()).trim();
  const match = prompt.match(/^(\d+)\s*\+\s*(\d+)\s*=?$/);
  expect(match, `expected a bare addition prompt, got "${prompt}"`).not.toBeNull();
  const a = Number(match![1]);
  const b = Number(match![2]);
  const dots = page.locator(".quantity-dots");
  if (a >= 1 && a <= 10 && b >= 1 && b <= 10) {
    await expect(dots).toBeVisible();
    await expect(dots.locator(".qd-dot")).toHaveCount(a + b);
  } else {
    await expect(dots).toHaveCount(0);
  }

  // The arithmetic expression itself still reads left-to-right either way.
  const box = page.locator(".problem-box").first();
  await expect(box).toHaveCSS("direction", "ltr");
});

test("a subtraction question's illustration shows the starting amount, with the subtracted part outlined", async ({
  page,
}) => {
  await openDeterministicTopic(page);
  await page.getByRole("button", { name: "חיסור עד 10", exact: true }).click();
  await page.getByRole("button", { name: "דלג לתרגול" }).click(); // lesson-always-first

  const prompt = (await page.locator(".problem-text").innerText()).trim();
  const match = prompt.match(/^(\d+)\s*[−-]\s*(\d+)\s*=?$/);
  expect(match, `expected a bare subtraction prompt, got "${prompt}"`).not.toBeNull();
  const a = Number(match![1]);
  const b = Number(match![2]);
  const dots = page.locator(".quantity-dots");
  if (a >= 1 && a <= 10 && b >= 1 && b <= 10) {
    await expect(dots).toBeVisible();
    await expect(dots.locator(".qd-dot")).toHaveCount(a);
    await expect(dots.locator(".qd-dot-outline")).toHaveCount(b);
  } else {
    await expect(dots).toHaveCount(0);
  }
});

test("the result screen shows no coins, points, or streak — only the existing score", async ({ page }) => {
  await finishDeterministicLesson(page);
  const result = page.locator(".result");
  await expect(result).not.toContainText(/מטבע|נקוד|סטריק/);
  await expect(page.locator(".score")).toContainText("מתוך");
});

test("history summarizes by topic and difficulty, with no new gamification element", async ({ page }) => {
  await finishDeterministicLesson(page);
  await page.getByRole("button", { name: "חזרה לתפריט" }).click();
  await page.getByRole("button", { name: "← חזרה" }).click();
  await page.getByText("ההתקדמות שלי").click();

  const history = page.locator(".history");
  await expect(history.getByRole("heading", { name: "סיכום לפי נושא" })).toBeVisible();
  await expect(history.getByRole("heading", { name: "סיכום לפי רמת קושי" })).toBeVisible();
  await expect(history).not.toContainText(/מטבע|נקוד|סטריק|באדג|תג הישג/);
});
