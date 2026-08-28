import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test (docs/features/topic-lesson/product-spec.md, including
 * both 2026-08-21 revisions: how many worked examples the lesson screen covers, and —
 * revision ב׳ — that it pages through them one at a time ("notebook") instead of
 * scrolling through all of them at once):
 *  1. Every topic has a separate entry into "lesson" and a separate entry into "practice";
 *     the practice entry (the topic card itself) behaves exactly as before.
 *  2. The lesson screen shows no answer input and no "בדיקה" button.
 *  3. The lesson screen shows real learning content (not a blank/placeholder screen).
 *  4. For an adaptive topic (רותם/עומר — `topic.adaptive`), the lesson pages through one
 *     worked example per difficulty tier: the first page has no "← הקודם"; a middle page
 *     has both "← הקודם" and "הבא →", and each changes the content shown and the "דוגמה N
 *     מתוך M" heading; the last page has "← הקודם" but its forward button reads "→ לתרגול"
 *     instead of "הבא →", and clicking it enters practice for the same topic. Paging all
 *     the way forward and back with "← הקודם" shows the right content again, not stuck on
 *     the last page's.
 *  5. For a non-adaptive topic (מיקה), the lesson shows exactly one example, with no
 *     "דוגמה N מתוך M" heading and no "← הקודם"/"הבא →" — just "→ לתרגול".
 *  6. A topic that isn't reviewed yet offers no lesson button either (same "בקרוב" gate as
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
  await page.locator(".grade-card").nth(2).click(); // grade ו׳ (docs/features/any-grade-any-student)

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
  await page.locator(".grade-card").nth(3).click(); // grade ח׳ (docs/features/any-grade-any-student)
  await page.locator(".lesson-link").first().click();

  await expect(page.locator(".answer-input")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "בדיקה" })).toHaveCount(0);
});

test("the lesson screen shows real learning content, not a blank screen", async ({ page }) => {
  await page.locator(".student-card").nth(OMER).click();
  await page.locator(".grade-card").nth(3).click(); // grade ח׳ (docs/features/any-grade-any-student)
  const topicTitle = await page.locator(".topic-title").first().innerText();
  await page.locator(".lesson-link").first().click();

  await expect(page.locator("h2")).toHaveText(topicTitle);
  // At least one worked example: a problem box, at least one hint, and the "how do we
  // solve it" explanation panel that already exists elsewhere in the app.
  await expect(page.locator(".problem-box").first()).toBeVisible();
  await expect(page.locator(".hint").first()).toBeVisible();
  await expect(page.locator(".explanation").first()).toBeVisible();
});

test("the last page's '→ לתרגול' enters practice for the same topic", async ({ page }) => {
  await page.locator(".student-card").nth(ROTEM).click();
  await page.locator(".grade-card").nth(2).click(); // grade ו׳ (docs/features/any-grade-any-student)
  const topicTitle = await page.locator(".topic-title").first().innerText();
  await page.locator(".lesson-link").first().click();

  // Page forward until the forward button reads "→ לתרגול" instead of "הבא →" — the last
  // page — then click it.
  while (await page.getByRole("button", { name: "הבא →" }).count()) {
    await page.getByRole("button", { name: "הבא →" }).click();
  }
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
  await page.locator(".grade-card").nth(2).click(); // grade ו׳ (docs/features/any-grade-any-student)
  const topicsBefore = await page.locator(".topic-title").allInnerTexts();
  await page.locator(".lesson-link").first().click();

  await page.getByRole("button", { name: "← חזרה" }).click();
  await expect(page.locator(".topic-title")).toHaveCount(topicsBefore.length);
  expect(await page.locator(".topic-title").allInnerTexts()).toEqual(topicsBefore);
});

test("an adaptive topic's lesson pages through one worked example per difficulty tier, one at a time", async ({
  page,
}) => {
  await page.locator(".student-card").nth(OMER).click();
  await page.locator(".grade-card").nth(3).click(); // grade ח׳ (docs/features/any-grade-any-student)
  await page.locator(".lesson-link").first().click();

  const prev = page.getByRole("button", { name: "← הקודם" });
  const next = page.getByRole("button", { name: "הבא →" });
  const toPractice = page.getByRole("button", { name: "→ לתרגול" });

  // First page: exactly one example on screen, no "← הקודם", "הבא →" present.
  await expect(page.locator(".problem-box")).toHaveCount(1);
  await expect(prev).toHaveCount(0);
  await expect(next).toHaveCount(1);
  const heading1 = await page.locator(".lesson-page-heading").innerText();
  expect(heading1).toMatch(/^דוגמה 1 מתוך \d+$/);
  const total = Number(heading1.match(/מתוך (\d+)/)![1]);
  expect(total).toBeGreaterThan(1);
  const prompt1 = await page.locator(".problem-box").innerText();

  // Page all the way forward, checking each middle page has both buttons, a matching
  // heading, and different content than the page before it.
  let prevPrompt = prompt1;
  for (let i = 2; i <= total; i++) {
    await next.click();
    await expect(page.locator(".lesson-page-heading")).toHaveText(`דוגמה ${i} מתוך ${total}`);
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
  await expect(page.locator(".lesson-page-heading")).toHaveText(`דוגמה ${total - 1} מתוך ${total}`);
  await expect(next).toHaveCount(1);
  await expect(toPractice).toHaveCount(0);
});

test("a non-adaptive topic's lesson shows exactly one example, with no page heading or prev/next buttons", async ({
  page,
}) => {
  await page.locator(".student-card").nth(MIKA).click();
  await page.locator(".grade-card").first().click();
  await page.locator(".lesson-link").first().click();

  await expect(page.locator(".problem-box")).toHaveCount(1);
  const headings = await page.locator(".lesson-page-heading").allInnerTexts();
  expect(headings.some((h) => /^דוגמה \d+ מתוך \d+$/.test(h))).toBe(false);
  await expect(page.getByRole("button", { name: "← הקודם" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "הבא →" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "→ לתרגול" })).toHaveCount(1);
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
