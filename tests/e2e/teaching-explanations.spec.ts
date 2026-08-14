import { test, expect, type Page } from "@playwright/test";

/** Every grade now practises topic by topic, so levels always sit one screen deeper. */
async function openLevels(page: Page, studentIndex: number, topicIndex = 0) {
  await page.locator(".student-card").nth(studentIndex).click();
  await page.locator(".topic-card").nth(topicIndex).click();
}


/**
 * Acceptance criteria under test
 * (docs/features/teaching-explanations/product-spec.md):
 *  5. The explanation refers to the failed question's numbers.
 *  6. A correct answer shows no explanation.
 *
 * Criteria 1-4 — that every question has an explanation, steps, and its own analogy —
 * moved to `content.spec.ts`, which reads the data instead of walking the UI. The walk
 * here was slower, and it was also lying: it only ever opened topic index 0, so it
 * checked 3 topics out of 17 while claiming to cover every question.
 */

async function startLevel(page: Page, studentIndex: number, levelIndex: number) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await openLevels(page, studentIndex);
  await page.locator(".level-card").nth(levelIndex).click();
}

async function answerWrong(page: Page) {
  await page.locator(".answer-input").fill("999999");
  await page.getByRole("button", { name: "בדיקה" }).click();
}

test("the explanation refers to the numbers of the failed question", async ({ page }) => {
  // Grade 1, because grades 6 and 8 are blocked until reviewed. The explanation is built
  // by one shared code path, so which grade exercises it does not change what is proved.
  await startLevel(page, 0, 0);
  const prompt = await page.locator(".problem-text").innerText();
  const operands = prompt.match(/\d+/g) ?? [];
  expect(operands.length).toBeGreaterThan(0);

  await answerWrong(page);
  await expect(page.locator(".explanation")).toContainText(operands[0]);
});

test("a correct answer still shows no explanation", async ({ page }) => {
  await startLevel(page, 0, 0);
  await answerWrong(page);
  const answer = (await page.locator(".feedback.wrong").innerText()).match(
    /(-?\d+(?:\.\d+)?)\s*$/,
  )?.[1];
  expect(answer).toBeTruthy();

  await page.getByRole("button", { name: "← חזרה" }).click();
  await page.locator(".level-card").first().click();
  await page.locator(".answer-input").fill(String(answer));
  await page.getByRole("button", { name: "בדיקה" }).click();

  await expect(page.locator(".feedback.correct")).toBeVisible();
  await expect(page.locator(".explanation")).toHaveCount(0);
});
