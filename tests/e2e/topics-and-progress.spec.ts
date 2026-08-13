import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test
 * (docs/features/topics-and-progress/product-spec.md):
 *  1. Picking a student shows that grade's topics as buttons.
 *  2. Picking a topic shows three levels for it.
 *  3. Picking a level practises only that topic and level.
 *  4. Grade 1 has three levels per topic and ten questions per level.
 *  5. You can walk back level -> topic -> student.
 *  6. Finishing a practice records date, topic, level and score.
 *  7. History survives a reload.
 *  8. Each student's history is their own.
 *  9. History is reachable and shows newest first.
 * 10. An empty history says so rather than showing a blank screen.
 */

const MIKA = 0;
const ROTEM = 1;

async function open(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

async function playLevel(page: Page, answerWith: string) {
  const total = Number((await page.locator(".progress").innerText()).match(/מתוך (\d+)/)![1]);
  for (let i = 0; i < total; i++) {
    await page.locator(".answer-input").fill(answerWith);
    await page.getByRole("button", { name: "בדיקה" }).click();
    await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
  }
  return total;
}

test.beforeEach(async ({ page }) => {
  await open(page);
});

test("picking a student shows the grade's topics, and a topic shows its levels", async ({
  page,
}) => {
  await page.locator(".student-card").nth(MIKA).click();

  await expect(page.locator(".topic-picker h1")).toHaveText("מה נתרגל היום?");
  const topics = page.locator(".topic-card");
  await expect(topics).toHaveCount(5);
  await expect(topics.first().locator(".topic-title")).not.toBeEmpty();

  // A topic card shows its name and nothing else — the level count told a child
  // nothing they could act on, and every card said the same number anyway.
  await expect(topics.first()).toHaveText(
    await topics.first().locator(".topic-title").innerText(),
  );

  await topics.nth(1).click();
  await expect(page.locator(".level-card")).toHaveCount(3);
});

test("grade 1 has three levels of ten questions for every topic", async ({ page }) => {
  await page.locator(".student-card").nth(MIKA).click();
  const topicCount = await page.locator(".topic-card").count();
  expect(topicCount).toBe(5);

  for (let t = 0; t < topicCount; t++) {
    await page.locator(".topic-card").nth(t).click();
    const levels = page.locator(".level-card");
    await expect(levels).toHaveCount(3);

    for (let l = 0; l < 3; l++) {
      await expect(levels.nth(l).locator(".level-count")).toHaveText("10 שאלות");
      await levels.nth(l).click();
      await expect(page.locator(".progress")).toContainText("מתוך 10");
      await page.getByRole("button", { name: "← חזרה" }).click();
    }
    await page.getByRole("button", { name: "← חזרה" }).click();
  }
});

test("a level practises only its own topic", async ({ page }) => {
  // Every question in "חיסור עד 10" must be a subtraction — the whole point of choosing
  // a topic is not getting a mixed sample.
  await page.locator(".student-card").nth(MIKA).click();
  await page.getByText("חיסור עד 10", { exact: true }).click();
  await page.locator(".level-card").first().click();

  for (let i = 0; i < 10; i++) {
    const prompt = await page.locator(".problem-text").innerText();
    expect(prompt, `"${prompt}" is not a subtraction`).toContain("−");
    await page.locator(".answer-input").fill("0");
    await page.getByRole("button", { name: "בדיקה" }).click();
    await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
  }
});

test("you can walk back from level to topic to student", async ({ page }) => {
  await page.locator(".student-card").nth(MIKA).click();
  await page.locator(".topic-card").first().click();
  await expect(page.locator(".level-card")).toHaveCount(3);

  await page.getByRole("button", { name: "← חזרה" }).click();
  await expect(page.locator(".topic-card")).toHaveCount(5);

  await page.getByRole("button", { name: "← החלף תלמיד" }).click();
  await expect(page.locator(".student-card")).toHaveCount(3);
});

test("an empty history says so instead of showing a blank screen", async ({ page }) => {
  await page.locator(".student-card").nth(MIKA).click();
  await page.getByRole("button", { name: "ההתקדמות שלי →" }).click();

  await expect(page.locator(".history h1")).toHaveText("ההתקדמות שלי");
  await expect(page.locator(".history-empty")).toBeVisible();
  await expect(page.locator(".history-row")).toHaveCount(0);
});

test("finishing a practice records the topic, level and score, and it survives a reload", async ({
  page,
}) => {
  await page.locator(".student-card").nth(MIKA).click();
  const topicTitle = await page.locator(".topic-card").first().locator(".topic-title").innerText();
  await page.locator(".topic-card").first().click();
  const levelTitle = await page.locator(".level-card").first().locator(".level-title").innerText();
  await page.locator(".level-card").first().click();

  const total = await playLevel(page, "999999");
  await expect(page.locator(".result")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "ההתקדמות שלי →" }).click();

  const row = page.locator(".history-row").first();
  await expect(row).toBeVisible();
  await expect(row.locator(".history-what")).toContainText(topicTitle);
  await expect(row.locator(".history-what")).toContainText(levelTitle);
  await expect(row.locator(".history-score")).toHaveText(`0/${total}`);
  await expect(row.locator(".history-when")).not.toBeEmpty();
});

test("history is newest first", async ({ page }) => {
  await page.locator(".student-card").nth(MIKA).click();

  for (const topicIndex of [0, 1]) {
    await page.locator(".topic-card").nth(topicIndex).click();
    await page.locator(".level-card").first().click();
    await playLevel(page, "999999");
    await page.getByRole("button", { name: "חזרה לתפריט" }).click();
    await page.getByRole("button", { name: "← חזרה" }).click();
  }

  const second = await page.locator(".topic-card").nth(1).locator(".topic-title").innerText();
  await page.getByRole("button", { name: "ההתקדמות שלי →" }).click();

  await expect(page.locator(".history-row")).toHaveCount(2);
  await expect(page.locator(".history-row").first().locator(".history-what")).toContainText(
    second,
  );
});

test("each student's history is their own", async ({ page }) => {
  await page.locator(".student-card").nth(MIKA).click();
  await page.locator(".topic-card").first().click();
  await page.locator(".level-card").first().click();
  await playLevel(page, "999999");
  await page.getByRole("button", { name: "חזרה לתפריט" }).click();
  await page.getByRole("button", { name: "← חזרה" }).click();
  await page.getByRole("button", { name: "← החלף תלמיד" }).click();

  // Rotem's grade still practises straight from levels, and his history starts empty.
  await page.locator(".student-card").nth(ROTEM).click();
  await page.getByRole("button", { name: "ההתקדמות שלי →" }).click();
  await expect(page.locator(".history-empty")).toBeVisible();

  await page.getByRole("button", { name: "← חזרה" }).click();
  await page.getByRole("button", { name: "← החלף תלמיד" }).click();
  await page.locator(".student-card").nth(MIKA).click();
  await page.getByRole("button", { name: "ההתקדמות שלי →" }).click();
  await expect(page.locator(".history-row")).toHaveCount(1);
});
