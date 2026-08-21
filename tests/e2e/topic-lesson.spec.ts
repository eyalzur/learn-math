import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test (docs/features/topic-lesson/product-spec.md, including
 * the 2026-08-21 revision on how many worked examples the lesson screen shows):
 *  1. Every topic has a separate entry into "lesson" and a separate entry into "practice";
 *     the practice entry (the topic card itself) behaves exactly as before.
 *  2. The lesson screen shows no answer input and no "בדיקה" button.
 *  3. The lesson screen shows real learning content (not a blank/placeholder screen).
 *  4. You can move lesson -> practice ("→ לתרגול") and back to the topic list ("← חזרה")
 *     without losing your place (student/topic).
 *  5. For an adaptive topic (רותם/עומר — `topic.adaptive`), the lesson shows one worked
 *     example per difficulty tier, headed "דוגמה N מתוך M", counted correctly and in
 *     increasing order.
 *  6. For a non-adaptive topic (מיקה), the lesson still shows exactly one example, with no
 *     "דוגמה N מתוך M" heading at all.
 *  7. A topic that isn't reviewed yet offers no lesson button either (same "בקרוב" gate as
 *     practice) — see the note below on why this can only be tested conditionally today.
 */

async function open(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

const MIKA = 0;
const ROTEM = 1;
const OMER = 2;

test.beforeEach(async ({ page }) => {
  await open(page);
});

test("a topic card still enters practice directly, unchanged, with a separate lesson button beside it", async ({
  page,
}) => {
  await page.locator(".student-card").nth(ROTEM).click();

  const row = page.locator(".topic-row").first();
  await expect(row.locator(".lesson-link")).toBeVisible();

  // The card itself — not the lesson button — goes straight into practice, exactly like
  // before this feature existed: a question with an answer input and a "בדיקה" button.
  await row.locator(".topic-card").click();
  await expect(page.locator(".answer-input")).toBeVisible();
  await expect(page.getByRole("button", { name: "בדיקה" })).toBeVisible();
});

test("the lesson screen has no answer input and no check button", async ({ page }) => {
  await page.locator(".student-card").nth(OMER).click();
  await page.locator(".lesson-link").first().click();

  await expect(page.locator(".answer-input")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "בדיקה" })).toHaveCount(0);
});

test("the lesson screen shows real learning content, not a blank screen", async ({ page }) => {
  await page.locator(".student-card").nth(OMER).click();
  const topicTitle = await page.locator(".topic-title").first().innerText();
  await page.locator(".lesson-link").first().click();

  await expect(page.locator("h2")).toHaveText(topicTitle);
  // At least one worked example: a problem box, at least one hint, and the "how do we
  // solve it" explanation panel that already exists elsewhere in the app.
  await expect(page.locator(".problem-box").first()).toBeVisible();
  await expect(page.locator(".hint").first()).toBeVisible();
  await expect(page.locator(".explanation").first()).toBeVisible();
});

test("moving from lesson to practice and back to the topic list keeps the same student and topic", async ({
  page,
}) => {
  await page.locator(".student-card").nth(ROTEM).click();
  const topicTitle = await page.locator(".topic-title").first().innerText();
  await page.locator(".lesson-link").first().click();

  await page.getByRole("button", { name: "→ לתרגול" }).click();
  // Practice for the same topic — the header names it, just like every other entry into
  // practice for a topic does.
  await expect(page.locator("h2")).toHaveText(topicTitle);
  await expect(page.locator(".answer-input")).toBeVisible();
});

test("'← חזרה' from the lesson screen returns to the same student's topic list", async ({
  page,
}) => {
  await page.locator(".student-card").nth(ROTEM).click();
  const topicsBefore = await page.locator(".topic-title").allInnerTexts();
  await page.locator(".lesson-link").first().click();

  await page.getByRole("button", { name: "← חזרה" }).click();
  await expect(page.locator(".topic-title")).toHaveCount(topicsBefore.length);
  expect(await page.locator(".topic-title").allInnerTexts()).toEqual(topicsBefore);
});

test("an adaptive topic's lesson shows one worked example per difficulty tier, numbered in order", async ({
  page,
}) => {
  await page.locator(".student-card").nth(OMER).click();
  await page.locator(".lesson-link").first().click();

  const headings = await page.locator("h3").allInnerTexts();
  const tierHeadings = headings.filter((h) => /^דוגמה \d+ מתוך \d+$/.test(h));
  expect(tierHeadings.length).toBeGreaterThan(1);

  const total = Number(tierHeadings[0].match(/מתוך (\d+)/)![1]);
  expect(tierHeadings).toHaveLength(total);
  tierHeadings.forEach((h, i) => {
    expect(h).toBe(`דוגמה ${i + 1} מתוך ${total}`);
  });

  // Every heading agrees on the total, and each worked example has its own problem box.
  await expect(page.locator(".problem-box")).toHaveCount(total);
});

test("a non-adaptive topic's lesson shows exactly one example, with no 'דוגמה N מתוך M' heading", async ({
  page,
}) => {
  await page.locator(".student-card").nth(MIKA).click();
  await page.locator(".grade-card").first().click();
  await page.locator(".lesson-link").first().click();

  await expect(page.locator(".problem-box")).toHaveCount(1);
  const headings = await page.locator("h3").allInnerTexts();
  expect(headings.some((h) => /^דוגמה \d+ מתוך \d+$/.test(h))).toBe(false);
});

test("wherever a topic is still unreviewed, it offers no lesson button either", async ({
  page,
}) => {
  // Conditional on purpose, same convention as review-status.spec.ts: every topic is
  // reviewed right now, so this passes without exercising real content — it stays ready
  // for the day a topic goes back to `reviewed: false`.
  for (const idx of [MIKA, ROTEM, OMER]) {
    await open(page);
    await page.locator(".student-card").nth(idx).click();
    if (await page.locator(".grade-card").count()) {
      await page.locator(".grade-card").first().click();
    }
    const blockedRows = page.locator(".topic-row").filter({ has: page.locator(".topic-soon") });
    const count = await blockedRows.count();
    for (let i = 0; i < count; i++) {
      await expect(blockedRows.nth(i).locator(".lesson-link")).toHaveCount(0);
    }
  }
});
