import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test (docs/features/practice-notebook/product-spec.md):
 *  1. During practice, there's access to a notebook — a free writing surface.
 *  2. A new blank page can be added.
 *  3. An existing page can be removed, except the last one (always at least one page).
 *  4. Pages can be navigated (previous/next).
 *  5. The existing answer-checking flow is completely unaffected: the current question,
 *     typed input, and the ability to check an answer survive opening and closing the
 *     notebook.
 *  6. Nothing written in the notebook affects whether an answer is marked right or wrong.
 *  7. There is no submit/export action anywhere on the notebook screen.
 */

const ALWAYS_WRONG = "999999";

/** Mika's "מספרים עד 20" — a style-based topic, entered by picking a style (not a level).
 *  Same fixed entry point countdown-next.spec.ts uses, for the same reason: predictable
 *  navigation to a real Practice screen without depending on this feature's own UI, and
 *  deliberately not one of the topics that moved to adaptive difficulty
 *  (docs/features/mika-adaptive-difficulty), which no longer have a level/style card to
 *  click at all. */
async function openLevel(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").first().click();
  await page.locator(".grade-card").first().click();
  await page.locator(".topic-card").first().click();
  await page.locator(".style-card").first().click();
}

/** Answers the first question wrong to read the right answer off the feedback, then
 *  restarts the level fresh — a one-question variant of the harvest technique
 *  countdown-next.spec.ts and perfect-score-message.spec.ts use for a whole lesson.
 *  "נסו שוב" only appears on the result screen after every question is answered, so
 *  restarting via openLevel (not that button) is what gets back to a fresh question 1. */
async function harvestFirstAnswer(page: Page): Promise<string> {
  await page.locator(".answer-input").fill(ALWAYS_WRONG);
  await page.getByRole("button", { name: "בדיקה" }).first().click();
  const feedback = await page.locator(".feedback.wrong").innerText();
  const answer = feedback.match(/(-?\d+(?:\.\d+)?)\s*$/)![1];
  await openLevel(page);
  return answer;
}

function notebookButton(page: Page) {
  return page.getByRole("button", { name: "📝 מחברת" });
}

/** A drag across the visible drawing surface — enough to leave a mark. */
async function drawOnCanvas(page: Page) {
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("notebook canvas not found");
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 30, cy + 30, { steps: 5 });
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await openLevel(page);
});

test("there is access to a notebook with a writing surface", async ({ page }) => {
  await expect(notebookButton(page)).toBeVisible();
  await notebookButton(page).click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByText(/^דף \d+ מתוך \d+$/)).toBeVisible();
});

test("a new page can be added", async ({ page }) => {
  await notebookButton(page).click();
  await expect(page.getByText("דף 1 מתוך 1")).toBeVisible();

  await page.getByRole("button", { name: "+ דף חדש" }).click();
  await expect(page.getByText("דף 2 מתוך 2")).toBeVisible();
});

test("a page can be removed, but not the last one", async ({ page }) => {
  await notebookButton(page).click();
  await page.getByRole("button", { name: "+ דף חדש" }).click();
  await expect(page.getByText("דף 2 מתוך 2")).toBeVisible();

  const removeButton = page.getByRole("button", { name: "🗑 הסר דף" });
  await removeButton.click();
  await expect(page.getByText("דף 1 מתוך 1")).toBeVisible();

  // Only one page left — removing it entirely is not offered.
  await expect(removeButton).toBeDisabled();
});

test("pages can be navigated back and forth", async ({ page }) => {
  await notebookButton(page).click();
  await page.getByRole("button", { name: "+ דף חדש" }).click();
  await expect(page.getByText("דף 2 מתוך 2")).toBeVisible();

  await page.getByRole("button", { name: "◀ דף קודם" }).click();
  await expect(page.getByText("דף 1 מתוך 2")).toBeVisible();

  await page.getByRole("button", { name: "דף הבא ▶" }).click();
  await expect(page.getByText("דף 2 מתוך 2")).toBeVisible();
});

test("closing the notebook returns to the same question with the typed answer intact, and checking still works", async ({
  page,
}) => {
  const answer = await harvestFirstAnswer(page);
  await page.locator(".answer-input").fill("42");

  await notebookButton(page).click();
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: "← חזרה לתרגול" }).click();

  // Same question, same typed value, nothing lost.
  await expect(page.locator(".answer-input")).toHaveValue("42");
  await expect(page.getByRole("button", { name: "בדיקה" })).toBeVisible();

  await page.locator(".answer-input").fill(answer);
  await page.getByRole("button", { name: "בדיקה" }).first().click();
  await expect(page.locator(".feedback.correct")).toBeVisible();
});

test("writing in the notebook does not change whether an answer is marked right or wrong", async ({ page }) => {
  const answer = await harvestFirstAnswer(page);

  await notebookButton(page).click();
  await drawOnCanvas(page);
  await page.getByRole("button", { name: "← חזרה לתרגול" }).click();

  // Wrong is still wrong after writing in the notebook.
  await page.locator(".answer-input").fill(ALWAYS_WRONG);
  await page.getByRole("button", { name: "בדיקה" }).first().click();
  await expect(page.locator(".feedback.wrong")).toBeVisible();
  await openLevel(page);

  // Right is still right after writing in the notebook.
  await notebookButton(page).click();
  await drawOnCanvas(page);
  await page.getByRole("button", { name: "← חזרה לתרגול" }).click();
  await page.locator(".answer-input").fill(answer);
  await page.getByRole("button", { name: "בדיקה" }).first().click();
  await expect(page.locator(".feedback.correct")).toBeVisible();
});

test("the notebook has no submit or export action", async ({ page }) => {
  await notebookButton(page).click();
  await expect(page.locator("canvas")).toBeVisible();

  // The regular practice "check" button belongs to the question flow, not the notebook —
  // it should not still be reachable while the notebook is open.
  await expect(page.getByRole("button", { name: "בדיקה" })).toHaveCount(0);
  await expect(page.locator("button", { hasText: /שלח|ייצוא|הגש/ })).toHaveCount(0);
});
