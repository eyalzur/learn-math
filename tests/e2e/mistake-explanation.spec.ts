import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test
 * (docs/features/mistake-explanation/product-spec.md):
 *  1. A wrong answer shows an explanation alongside the existing message + answer.
 *  2. It appears automatically, with no extra click.
 *  3. It shows working steps, not only the result.
 *  4. It refers to the numbers of the problem that was actually failed.
 *  5. A correct answer shows no explanation at all.
 *  6. Every question that CAN be broken down automatically has an explanation.
 *
 * Criterion 6 was narrowed when the curriculum replaced {a, b, op} questions with
 * free-text prompts: only bare arithmetic can be explained by computing from its
 * operands. Word problems and equations show no block until the teacher feature adds
 * written explanations — see architecture.md's Implementation Notes.
 */

/** A bare "a op b" prompt, the only shape that can be explained automatically. */
const BARE_EXPRESSION = /^\s*\d+\s*[+−\-×÷]\s*\d+\s*=?\s*$/;

async function startGrade1Easy(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").first().click();
  await page.locator(".level-card").first().click();
}

async function answerWrong(page: Page) {
  await page.locator(".answer-input").fill("999999");
  await page.getByRole("button", { name: "בדיקה" }).click();
}

async function goNext(page: Page) {
  await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
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

  await page.getByRole("button", { name: "← חזרה" }).click();
  await page.locator(".level-card").first().click();

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

test("every bare arithmetic question is explained, and no other question claims to be", async ({
  page,
}) => {
  // Walks all three grades. A bare expression must produce a block with steps; anything
  // else must produce none — a guess dressed up as a worked solution would be worse for
  // a student than staying quiet.
  for (let studentIndex = 0; studentIndex < 3; studentIndex++) {
    for (let levelIndex = 0; levelIndex < 3; levelIndex++) {
      await page.goto("/learn-math/");
      await page.evaluate(() => localStorage.clear());
      await page.goto("/learn-math/");
      await page.locator(".student-card").nth(studentIndex).click();
      await page.locator(".level-card").nth(levelIndex).click();

      for (let q = 0; q < 10; q++) {
        const prompt = await page.locator(".problem-text").innerText();
        await answerWrong(page);

        const blocks = await page.locator(".explanation").count();
        if (BARE_EXPRESSION.test(prompt)) {
          expect(blocks, `expected an explanation for "${prompt}"`).toBe(1);
          expect(
            await page.locator(".explanation-step").count(),
            `expected steps for "${prompt}"`,
          ).toBeGreaterThan(0);
        } else {
          expect(blocks, `expected no explanation for "${prompt}"`).toBe(0);
        }
        await goNext(page);
      }
    }
  }
});
