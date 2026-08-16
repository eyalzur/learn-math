import { test, expect, type Page } from "@playwright/test";

/** Grade 1 practises topic-by-topic, so its levels sit one screen deeper. */
async function openLevels(page: Page, studentIndex: number, topicIndex = 0) {
  await page.locator(".student-card").nth(studentIndex).click();
  if (studentIndex === 0) await page.locator(".topic-card").nth(topicIndex).click();
}


/**
 * Acceptance criteria under test
 * (docs/features/mistake-explanation/product-spec.md):
 *  1. A wrong answer shows an explanation alongside the existing message + answer.
 *  2. It appears automatically, with no extra click.
 *  3. It shows working steps, not only the result.
 *  4. It refers to the numbers of the problem that was actually failed.
 *  5. A correct answer shows no explanation at all.
 *  6. Every question has an explanation.
 *
 * Criterion 6 is now covered by teaching-explanations.spec.ts, which sweeps all 90
 * questions across the three grades. What stays here is the behaviour of the block
 * itself on a computed, bare-arithmetic question.
 */

async function startGrade1Easy(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await openLevels(page, 0);
  // Grade 1's first topic is entered by style rather than by level. Any lesson serves —
  // these tests are about what a wrong answer produces, not about which question.
  await page.locator(".style-card").first().click();
}

async function answerWrong(page: Page) {
  await page.locator(".answer-input").fill("999999");
  await page.getByRole("button", { name: "בדיקה" }).click();
}

test.beforeEach(async ({ page }) => {
  await startGrade1Easy(page);
});

test("a wrong answer shows an explanation alongside the correct answer", async ({ page }) => {
  await answerWrong(page);

  await expect(page.locator(".feedback.wrong")).toContainText("התשובה היא");
  await expect(page.locator(".explanation")).toBeVisible();
  await expect(page.locator(".explanation")).toContainText("איך פותרים?");
});

test("the explanation appears without any extra click", async ({ page }) => {
  await expect(page.locator(".explanation")).toHaveCount(0);
  await answerWrong(page);
  await expect(page.locator(".explanation")).toBeVisible();
});

test("the explanation shows working steps, not just the final answer", async ({ page }) => {
  await answerWrong(page);

  const steps = page.locator(".explanation-step");
  expect(await steps.count()).toBeGreaterThan(0);
  await expect(steps.first().locator("span").first()).not.toBeEmpty();
});

test("the explanation refers to the numbers of the problem that was failed", async ({
  page,
}) => {
  const prompt = await page.locator(".problem-text").innerText();
  const operands = prompt.match(/\d+/g) ?? [];
  expect(operands.length).toBeGreaterThan(0);

  await answerWrong(page);

  const text = await page.locator(".explanation").innerText();
  expect(text).toContain(operands[0]);
});

test("a correct answer shows no explanation", async ({ page }) => {
  // Learn the answer from a first wrong pass, then replay the level and get it right.
  const answer = (await (async () => {
    await answerWrong(page);
    return (await page.locator(".feedback.wrong").innerText()).match(
      /(-?\d+(?:\.\d+)?)\s*$/,
    )?.[1];
  })())!;
  expect(answer).toBeTruthy();

  // Back lands on the styles, because that is where this lesson was entered from.
  await page.getByRole("button", { name: "← חזרה" }).click();
  await page.locator(".style-card").first().click();

  await page.locator(".answer-input").fill(String(answer));
  await page.getByRole("button", { name: "בדיקה" }).click();

  await expect(page.locator(".feedback.correct")).toBeVisible();
  await expect(page.locator(".explanation")).toHaveCount(0);
});

test("arithmetic inside the explanation stays left-to-right", async ({ page }) => {
  // Guards the RTL bug this app already shipped once: equations rendered reversed
  // because they inherited the page's RTL direction.
  await answerWrong(page);

  const maths = page.locator(".explanation-math");
  const count = await maths.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    await expect(maths.nth(i)).toHaveCSS("direction", "ltr");
  }
});
