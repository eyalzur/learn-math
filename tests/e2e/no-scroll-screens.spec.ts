import { test, expect, devices, type Page } from "@playwright/test";
import { createAndSelectStudent } from "./helpers/selectStudent";

/**
 * Acceptance criteria under test (docs/features/no-scroll-screens/product-spec.md):
 *  - Every full navigation screen other than practice/lesson (already covered by
 *    question-screen-template) must fit a 390x664 phone viewport (devices['iPhone 13'] —
 *    its real usable viewport, not the 844 screen-size figure) without the whole page
 *    needing to scroll.
 *  - A screen already measured as fitting must not regress.
 *  - A screen with content that can grow without bound (History) must stay within the
 *    viewport regardless of how much content has accumulated, by scrolling only an
 *    inner region — not the page — while its header stays visible throughout.
 *
 * `devices['iPhone 13']` sets `defaultBrowserType: 'webkit'`, which this environment
 * does not have installed (only Chromium, per playwright.config.ts's own comment) — so
 * every use below strips that field out before spreading the rest into `test.use()`.
 */
const { defaultBrowserType: _unused, ...iPhone13 } = devices["iPhone 13"];
test.use(iPhone13);

async function fitsWithoutScrolling(page: Page) {
  const { scrollHeight, viewport } = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    viewport: window.innerHeight,
  }));
  expect(scrollHeight, `page scrollHeight (${scrollHeight}) should not exceed the viewport (${viewport})`).toBeLessThanOrEqual(viewport);
}

test("TopicPicker fits without scrolling for a grade with the most topics (ח, 7 topics)", async ({ page }) => {
  await page.goto("/learn-math/");
  await createAndSelectStudent(page, "8");
  await page.locator(".grade-card").nth(3).click(); // grade ח — 7 topics, the most of any grade
  await expect(page.locator(".topic-card")).toHaveCount(7);
  await fitsWithoutScrolling(page);
});

test("StudentPicker fits without scrolling for 5 students", async ({ page }) => {
  await page.goto("/learn-math/");
  for (let i = 0; i < 5; i++) {
    await page.locator(".student-card-add").click();
    await page.getByLabel("שם").fill(`תלמיד-מדידה-${i}`);
    await page.getByRole("button", { name: "יצירה" }).click();
  }
  await expect(page.locator(".student-card-wrap")).toHaveCount(5); // real students, not the "add" card
  await fitsWithoutScrolling(page);
});

test("StudentPicker and TopicPicker still fit at today's real scale (regression guard)", async ({ page }) => {
  await page.goto("/learn-math/");
  await fitsWithoutScrolling(page); // empty StudentPicker
  await createAndSelectStudent(page, "1");
  await fitsWithoutScrolling(page); // GradePicker
  await page.locator(".grade-card").first().click();
  await fitsWithoutScrolling(page); // TopicPicker, grade א — 5 topics
});

test("History never requires scrolling the whole page, however many records have piled up — only its own list scrolls, and the header stays put", async ({
  page,
}) => {
  await page.goto("/learn-math/");
  await createAndSelectStudent(page, "6", "היסטוריה-ארוכה");
  const studentId = await page.evaluate(() => localStorage.getItem("learn-math:student"));

  // A long-term real family's accumulated practice history, not a contrived edge case —
  // 25 sessions is a few weeks of normal use, far more than fits in one 664px viewport.
  await page.evaluate((id) => {
    const records = Array.from({ length: 25 }, (_, i) => ({
      at: new Date(2026, 0, 1 + i).toISOString(),
      studentId: id,
      gradeLabel: "כיתה ו׳",
      topicTitle: `נושא ${i}`,
      levelTitle: "קל",
      correct: 7,
      total: 10,
    }));
    localStorage.setItem("learn-math:history", JSON.stringify(records));
  }, studentId);

  await page.reload();
  await page.locator(".grade-card").nth(2).click(); // grade ו
  await page.locator(".history-link").click();
  await expect(page.locator(".history-row")).toHaveCount(25);

  // The whole page must not need scrolling, even though 25 records clearly would not
  // fit in one viewport on their own.
  await fitsWithoutScrolling(page);

  const headerBefore = await page.locator(".grade-header").boundingBox();
  const studentNameVisible = await expect(page.locator(".history .greeting")).toBeVisible();

  // Scroll the inner history list region specifically.
  await page.locator(".history-list").evaluate((el) => el.scrollBy(0, 1000));

  // The header (back link + student name) must still be exactly where it was —
  // it did not scroll away with the list.
  const headerAfter = await page.locator(".grade-header").boundingBox();
  expect(headerAfter).toEqual(headerBefore);
  await expect(page.locator(".history .greeting")).toBeVisible();
  await expect(page.locator(".history h1")).toBeVisible();

  // The page itself did not scroll either — only the inner region moved.
  const pageScrollY = await page.evaluate(() => window.scrollY);
  expect(pageScrollY).toBe(0);
});

test("History's empty state is unaffected by the new scrolling region", async ({ page }) => {
  await page.goto("/learn-math/");
  await createAndSelectStudent(page, "1", "היסטוריה-ריקה");
  await page.locator(".grade-card").first().click();
  await page.locator(".history-link").click();
  await expect(page.locator(".history-empty")).toBeVisible();
  await fitsWithoutScrolling(page);
});

test("Practice screen with a figure (grade ח angles) fits one phone screen — the figure shrinks, the keypad stays visible", async ({ page }) => {
  await page.goto("/learn-math/");
  await createAndSelectStudent(page, "8");
  await page.locator(".grade-card").nth(3).click();
  await page.locator(".topic-card", { hasText: "זוויות" }).click();
  const skip = page.getByRole("button", { name: "דלג לתרגול" }).first();
  if (await skip.count()) await skip.click();
  for (let i = 0; i < 4; i++) {
    await expect(page.locator(".angle-figure-inline")).toBeVisible();
    await fitsWithoutScrolling(page);
    const pad = await page.locator(".number-pad").boundingBox();
    const viewport = page.viewportSize()!;
    expect(pad!.y + pad!.height).toBeLessThanOrEqual(viewport.height);
    await page.locator(".number-pad-button").first().click();
    await page.getByRole("button", { name: "בדיקה" }).click();
    await page.getByRole("button", { name: /הבא|המשך/ }).first().click().catch(() => {});
  }
});
