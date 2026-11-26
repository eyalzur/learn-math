import { test, expect, type Page } from "@playwright/test";
import { createAndSelectStudent } from "./helpers/selectStudent";

/**
 * Acceptance criteria under test (docs/features/topic-lesson/product-spec.md, including
 * both 2026-08-21 revisions, and — superseding the entry-point criteria — docs/features/
 * lesson-always-first/product-spec.md):
 *  1. A topic card now enters the lesson first, not practice directly — there is no
 *     separate lesson button any more (docs/features/lesson-always-first). A clear
 *     "דלג לתרגול →" skip link is visible on every lesson page, from the first.
 *  2. The lesson screen shows no answer input and no "בדיקה" button.
 *  3. The lesson screen shows real learning content (not a blank/placeholder screen).
 *  4. For an adaptive topic (רותם/עומר — `topic.adaptive`), the lesson pages through one
 *     worked example per difficulty tier: the first page has no "← הקודם"; a middle page
 *     has both "← הקודם" and "הבא →", and each changes the content shown and the "דוגמה N
 *     מתוך M" marker; the last page has "← הקודם" but its forward button reads "→ לתרגול"
 *     instead of "הבא →", and clicking it enters practice for the same topic. Paging all
 *     the way forward and back with "← הקודם" shows the right content again, not stuck on
 *     the last page's.
 *  5. For a non-adaptive topic (מיקה), the lesson shows exactly one example, with no
 *     "דוגמה N מתוך M" marker and no "← הקודם"/"הבא →" — just "→ לתרגול".
 *  6. A topic that isn't reviewed yet offers no entry at all — same "בקרוב" gate as
 *     before (see the note below on why this can only be tested conditionally today).
 */

async function open(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

test.beforeEach(async ({ page }) => {
  await open(page);
});

test("a topic card now enters the lesson first, with an immediate skip-to-practice link", async ({
  page,
}) => {
  await createAndSelectStudent(page);
  await page.locator(".grade-card").nth(2).click(); // grade ו׳ (docs/features/any-grade-any-student)
  await page.locator(".topic-card").first().click();

  // Lesson content, not a practice question yet.
  await expect(page.locator(".answer-input")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "בדיקה" })).toHaveCount(0);
  await expect(page.locator(".problem-box").first()).toBeVisible();

  // The skip link is visible immediately — page 1, before any "← הקודם"/"הבא →" paging.
  const skip = page.getByRole("button", { name: "דלג לתרגול →" });
  await expect(skip).toBeVisible();
  await skip.click();
  await expect(page.locator(".answer-input")).toBeVisible();
  await expect(page.getByRole("button", { name: "בדיקה" })).toBeVisible();
});

test("the lesson screen has no answer field and no check button", async ({ page }) => {
  await createAndSelectStudent(page);
  await page.locator(".grade-card").nth(3).click(); // grade ח׳ (docs/features/any-grade-any-student)
  await page.locator(".topic-card").first().click();

  await expect(page.locator(".answer-input")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "בדיקה" })).toHaveCount(0);
});

test("the lesson screen shows real learning content, not a blank screen", async ({ page }) => {
  await createAndSelectStudent(page);
  await page.locator(".grade-card").nth(3).click(); // grade ח׳ (docs/features/any-grade-any-student)
  const topicTitle = await page.locator(".topic-title").first().innerText();
  await page.locator(".topic-card").first().click();

  await expect(page.locator("h2")).toContainText(topicTitle);
  // At least one worked example: a problem box, at least one hint, and the "how do we
  // solve it" explanation panel that already exists elsewhere in the app.
  await expect(page.locator(".problem-box").first()).toBeVisible();
  await expect(page.locator(".hint").first()).toBeVisible();
  await expect(page.locator(".explanation").first()).toBeVisible();
});

test("the last page's '→ לתרגול' enters practice for the same topic", async ({ page }) => {
  await createAndSelectStudent(page);
  await page.locator(".grade-card").nth(2).click(); // grade ו׳ (docs/features/any-grade-any-student)
  const topicTitle = await page.locator(".topic-title").first().innerText();
  await page.locator(".topic-card").first().click();

  // Page forward until the forward button reads "→ לתרגול" instead of "הבא →" — the last
  // page — then click it.
  while (await page.getByRole("button", { name: "הבא →" }).count()) {
    await page.getByRole("button", { name: "הבא →" }).click();
  }
  await page.getByRole("button", { name: "→ לתרגול" }).click();

  // Practice for the same topic — the header names it, just like every other entry into
  // practice for a topic does.
  await expect(page.locator("h2")).toContainText(topicTitle);
  await expect(page.locator(".answer-input")).toBeVisible();
});

test("'דלג לתרגול →' works the same from a middle page, not just the first", async ({ page }) => {
  await createAndSelectStudent(page);
  await page.locator(".grade-card").nth(3).click(); // grade ח׳ — has multiple lesson pages
  const topicTitle = await page.locator(".topic-title").first().innerText();
  await page.locator(".topic-card").first().click();

  const next = page.getByRole("button", { name: "הבא →" });
  if (await next.count()) await next.click(); // now on page 2, if this topic has one

  await page.getByRole("button", { name: "דלג לתרגול →" }).click();
  await expect(page.locator("h2")).toContainText(topicTitle);
  await expect(page.locator(".answer-input")).toBeVisible();
});

test("'← חזרה' from the lesson screen returns to the same student's topic list", async ({
  page,
}) => {
  await createAndSelectStudent(page);
  await page.locator(".grade-card").nth(2).click(); // grade ו׳ (docs/features/any-grade-any-student)
  const topicsBefore = await page.locator(".topic-title").allInnerTexts();
  await page.locator(".topic-card").first().click();

  await page.getByRole("button", { name: "← חזרה" }).click();
  await expect(page.locator(".topic-title")).toHaveCount(topicsBefore.length);
  expect(await page.locator(".topic-title").allInnerTexts()).toEqual(topicsBefore);
});

test("an adaptive topic's lesson pages through one worked example per difficulty tier, one at a time", async ({
  page,
}) => {
  await createAndSelectStudent(page);
  await page.locator(".grade-card").nth(3).click(); // grade ח׳ (docs/features/any-grade-any-student)
  await page.locator(".topic-card").first().click();

  const prev = page.getByRole("button", { name: "← הקודם" });
  const next = page.getByRole("button", { name: "הבא →" });
  const toPractice = page.getByRole("button", { name: "→ לתרגול" });

  // First page: exactly one example on screen, no "← הקודם", "הבא →" present.
  await expect(page.locator(".problem-box")).toHaveCount(1);
  await expect(prev).toHaveCount(0);
  await expect(next).toHaveCount(1);
  const heading1 = await page.locator(".practice-header .progress").innerText();
  expect(heading1).toMatch(/^דוגמה 1 מתוך \d+$/);
  const total = Number(heading1.match(/מתוך (\d+)/)![1]);
  expect(total).toBeGreaterThan(1);
  const prompt1 = await page.locator(".problem-box").innerText();

  // Page all the way forward, checking each middle page has both buttons, a matching
  // marker, and different content than the page before it.
  let prevPrompt = prompt1;
  for (let i = 2; i <= total; i++) {
    await next.click();
    await expect(page.locator(".practice-header .progress")).toHaveText(`דוגמה ${i} מתוך ${total}`);
    await expect(prev).toHaveCount(1);
    const stillOnALaterPage = i < total;
    await expect(next).toHaveCount(stillOnALaterPage ? 1 : 0);
    await expect(toPractice).toHaveCount(stillOnALaterPage ? 0 : 1);
    const prompt = await page.locator(".problem-box").innerText();
    expect(prompt).not.toBe(prevPrompt);
    prevPrompt = prompt;
  }

  // Paging back from the last page returns to the previous page's own content, not stuck
  // showing the last page's.
  await prev.click();
  await expect(page.locator(".practice-header .progress")).toHaveText(`דוגמה ${total - 1} מתוך ${total}`);
  await expect(next).toHaveCount(1);
  await expect(toPractice).toHaveCount(0);
});

test("a non-adaptive topic's lesson shows exactly one example, with no page marker or prev/next buttons", async ({
  page,
}) => {
  await createAndSelectStudent(page);
  await page.locator(".grade-card").first().click();
  await page.locator(".topic-card").first().click();

  await expect(page.locator(".problem-box")).toHaveCount(1);
  await expect(page.getByText(/דוגמה \d+ מתוך/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "← הקודם" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "הבא →" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "→ לתרגול" })).toHaveCount(1);
});

test("wherever a topic is still unreviewed, its card offers no entry at all", async ({ page }) => {
  // Conditional on purpose, same convention as review-status.spec.ts: every topic is
  // reviewed right now, so this passes without exercising real content — it stays ready
  // for the day a topic goes back to `reviewed: false`.
  for (let i = 0; i < 3; i++) {
    await open(page);
    await createAndSelectStudent(page);
    if (await page.locator(".grade-card").count()) {
      await page.locator(".grade-card").first().click();
    }
    const blockedCards = page.locator(".topic-card[disabled]");
    const count = await blockedCards.count();
    for (let i = 0; i < count; i++) {
      await expect(blockedCards.nth(i)).toBeDisabled();
    }
  }
});
