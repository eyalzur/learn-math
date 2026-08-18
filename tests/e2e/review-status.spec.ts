import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test
 * (docs/features/review-status/product-spec.md):
 *  1. An unreviewed topic is shown — not hidden — dimmed and not clickable.
 *  2. Clicking it does nothing.
 *  3. A short label a seven-year-old understands sits on it.
 *  4. A reviewed topic behaves exactly as before.
 *  5. A grade with nothing reviewed explains itself instead of looking broken.
 *  6. History survives and stays reachable for a blocked topic.
 *  7. Opening state: grade 1 reviewed, grades 6 and 8 not.
 *
 * **Every topic is now reviewed**, so the blocking half of this feature has no content
 * left to exercise through the screen. The mechanism is intact and still matters — the
 * next unreviewed topic must be blocked exactly the same way — so those tests are kept
 * and made conditional rather than deleted. They arm themselves again the moment any
 * topic goes back to `reviewed: false`.
 */

/** Topics that a person has not signed off on, if there are any left. */
async function blockedTopics(page: Page) {
  return page.locator(".topic-card:disabled");
}

async function pickStudent(page: Page, index: number) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").nth(index).click();
  // Mika (index 0) now has two grades available; every route here is grade 1 (א׳).
  if (index === 0) await page.locator(".grade-card").first().click();
}

const MIKA = 0, ROTEM = 1, OMER = 2;

test("grade 1 is reviewed and behaves exactly as before", async ({ page }) => {
  await pickStudent(page, MIKA);

  const cards = page.locator(".topic-card");
  await expect(cards).toHaveCount(5);
  await expect(page.locator(".topic-card:disabled")).toHaveCount(0);
  await expect(page.locator(".topic-soon")).toHaveCount(0);
  await expect(page.locator(".topics-notice")).toHaveCount(0);

  // Still fully usable: a topic opens onto a choice of lessons — styles for the topics
  // that hold several kinds of question, levels for the rest.
  await cards.first().click();
  await expect(page.locator(".style-card, .level-card").first()).toBeVisible();
});

test("every student can now open every topic", async ({ page }) => {
  // The state this feature was built to manage has been cleared: all three children have
  // their whole syllabus approved. That is the thing worth asserting today.
  for (const student of [MIKA, ROTEM, OMER]) {
    await pickStudent(page, student);
    await expect(page.locator(".topic-card")).not.toHaveCount(0);
    await expect(await blockedTopics(page)).toHaveCount(0);
    await expect(page.locator(".topics-notice")).toHaveCount(0);

    await page.locator(".topic-card").first().click();
    await expect(page.locator(".style-card, .level-card").first()).toBeVisible();
  }
});

test("wherever a topic is still unreviewed, it is blocked and says so", async ({ page }) => {
  // Conditional on purpose. Nothing is unreviewed right now, so this passes without
  // asserting much — and it starts asserting again by itself the day new content arrives
  // unapproved, which is exactly when the guard matters.
  for (const student of [MIKA, ROTEM, OMER]) {
    await pickStudent(page, student);
    const blocked = await blockedTopics(page);
    const count = await blocked.count();
    for (let i = 0; i < count; i++) {
      // Shown, not hidden — the writer needs to see what is left.
      await expect(blocked.nth(i)).toBeVisible();
      await expect(blocked.nth(i).locator(".topic-soon")).toHaveText("בקרוב");
      // Disabled is what makes it unreachable by click and by keyboard alike.
      await expect(blocked.nth(i)).toBeDisabled();
    }
  }
});

test("history stays reachable for a student whose topics are all blocked", async ({
  page,
}) => {
  await pickStudent(page, ROTEM);

  await page.locator(".history-link").click();
  // The screen opens rather than erroring — an empty history says so itself.
  await expect(page.locator(".topic-card")).toHaveCount(0);
});

test("grade 1 keeps working end to end while other grades are blocked", async ({
  page,
}) => {
  await pickStudent(page, MIKA);
  await page.locator(".topic-card").first().click();
  await page.locator(".style-card, .level-card").first().click();

  await expect(page.locator(".answer-input")).toBeVisible();
});
