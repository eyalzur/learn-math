import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test
 * (docs/features/perfect-score-message/product-spec.md):
 *  1. A 100% score shows a message different from the 80-99% message.
 *  2. A score below 100% still shows exactly one of the existing three messages.
 *  3. The special message only ever appears on the result screen.
 *
 * Reworked for the student/grade/level navigation added by students-and-syllabus;
 * the behaviour being tested is unchanged.
 */

/** No real answer is this, so every question is guaranteed to come back wrong. */
const ALWAYS_WRONG = 999999;

/**
 * Plays the level answering everything wrong, harvesting each correct answer from the
 * feedback line, and returns to the start via "נסו שוב".
 *
 * Doing it through the UI rather than importing the question data keeps the test honest
 * to what a student actually sees, and means it does not have to re-implement the maths
 * for fractions, equations and geometry.
 */
async function harvestAnswers(page: Page, count: number): Promise<number[]> {
  const answers: number[] = [];
  for (let i = 0; i < count; i++) {
    await page.locator(".answer-input").fill(String(ALWAYS_WRONG));
    await page.getByRole("button", { name: "בדיקה" }).click();
    const feedback = await page.locator(".feedback.wrong").innerText();
    const match = feedback.match(/(-?\d+(?:\.\d+)?)\s*$/);
    if (!match) throw new Error(`Could not read the answer out of "${feedback}"`);
    answers.push(Number(match[1]));
    await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
  }
  await page.getByRole("button", { name: "נסו שוב" }).click();
  return answers;
}

async function startLevel(page: Page, studentIndex: number, levelIndex: number) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").nth(studentIndex).click();
  await page.locator(".level-card").nth(levelIndex).click();
}

async function completeLevel(page: Page, answers: number[], { missOne }: { missOne: boolean }) {
  for (let i = 0; i < answers.length; i++) {
    const value = missOne && i === 0 ? answers[i] + 1000 : answers[i];
    await page.locator(".answer-input").fill(String(value));
    await page.getByRole("button", { name: "בדיקה" }).click();
    await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
  }
}

test("shows the perfect-score message when every answer is correct", async ({ page }) => {
  await startLevel(page, 0, 0);
  const answers = await harvestAnswers(page, 10);
  await completeLevel(page, answers, { missOne: false });

  await expect(page.locator(".result h1")).toHaveText("🌟 ציון מושלם! פתרת הכל נכון!");
  await expect(page.locator(".score")).toContainText("100%");
});

test("keeps the existing message when the score is below 100%", async ({ page }) => {
  await startLevel(page, 0, 0);
  const answers = await harvestAnswers(page, 10);
  await completeLevel(page, answers, { missOne: true });

  await expect(page.locator(".result h1")).toHaveText("מצוין! שליטה מלאה!");
  await expect(page.locator(".score")).not.toContainText("100%");
});

test("the perfect-score message never appears during practice, only on the result screen", async ({
  page,
}) => {
  await startLevel(page, 0, 0);
  await expect(page.locator(".practice")).not.toContainText("ציון מושלם");

  const answers = await harvestAnswers(page, 10);
  await completeLevel(page, answers, { missOne: false });
  await expect(page.locator(".result")).toContainText("ציון מושלם");
});
