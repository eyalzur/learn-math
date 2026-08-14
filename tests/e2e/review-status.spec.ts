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
 */

async function pickStudent(page: Page, index: number) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").nth(index).click();
}

const MIKA = 0, ROTEM = 1, OMER = 2;

test("grade 1 is reviewed and behaves exactly as before", async ({ page }) => {
  await pickStudent(page, MIKA);

  const cards = page.locator(".topic-card");
  await expect(cards).toHaveCount(5);
  await expect(page.locator(".topic-card:disabled")).toHaveCount(0);
  await expect(page.locator(".topic-soon")).toHaveCount(0);
  await expect(page.locator(".topics-notice")).toHaveCount(0);

  // Still fully usable: a topic opens its levels.
  await cards.first().click();
  await expect(page.locator(".level-card").first()).toBeVisible();
});

test("an unreviewed topic is shown but disabled, and says so", async ({ page }) => {
  await pickStudent(page, ROTEM);

  const cards = page.locator(".topic-card");
  await expect(cards).toHaveCount(6);
  // Shown, not hidden — the writer needs to see what is left.
  await expect(cards.first()).toBeVisible();
  await expect(page.locator(".topic-card:disabled")).toHaveCount(6);
  await expect(page.locator(".topic-soon").first()).toHaveText("בקרוב");
});

test("clicking a blocked topic does nothing at all", async ({ page }) => {
  await pickStudent(page, ROTEM);

  await page.locator(".topic-card").first().click({ force: true });

  // Still on the topic screen: no levels, no navigation, no dialog.
  await expect(page.locator(".level-card")).toHaveCount(0);
  await expect(page.locator(".topic-card")).toHaveCount(6);
});

test("a blocked card cannot be reached with the keyboard either", async ({ page }) => {
  await pickStudent(page, ROTEM);

  // A dimmed-but-focusable card would be a block you can walk around.
  const focusable = await page
    .locator(".topic-card")
    .evaluateAll((els) => els.filter((el) => !(el as HTMLButtonElement).disabled).length);
  expect(focusable, "a blocked topic was still focusable").toBe(0);
});

test("a grade with nothing reviewed explains itself", async ({ page }) => {
  await pickStudent(page, OMER);

  const notice = page.locator(".topics-notice");
  await expect(notice).toBeVisible();
  await expect(notice).toContainText("עוד מעט");
  // Not a dead end: the cards stay, so the student sees what is coming.
  await expect(page.locator(".topic-card")).toHaveCount(6);
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
  await page.locator(".level-card").first().click();

  await expect(page.locator(".answer-input")).toBeVisible();
});
