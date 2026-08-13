import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test
 * (docs/features/mistake-explanation/product-spec.md):
 *  1. A wrong answer shows an explanation alongside the existing message + answer.
 *  2. It appears automatically, with no extra click.
 *  3. It shows working steps, not only the result.
 *  4. It refers to the numbers of the problem that was actually failed.
 *  5. A correct answer shows no explanation at all.
 *  6. Every problem in all six exercise sets has an explanation.
 *
 * Layout and copy come from design.md (heading "איך פותרים?", steps under the
 * feedback line, arithmetic kept LTR inside the RTL page).
 */

function computeAnswer(a: number, op: string, b: number): number {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return a / b;
    default:
      throw new Error(`Unknown operator: ${op}`);
  }
}

async function readProblem(page: Page) {
  const text = await page.locator(".problem-text").innerText();
  const match = text.match(/(\d+)\s*([+\-×÷])\s*(\d+)\s*=/);
  if (!match) throw new Error(`Could not parse problem text: "${text}"`);
  const [, a, op, b] = match;
  return { a: Number(a), op, b: Number(b), answer: computeAnswer(Number(a), op, Number(b)) };
}

async function answer(page: Page, value: number) {
  await page.locator(".answer-input").fill(String(value));
  await page.getByRole("button", { name: "בדיקה" }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/learn-math/");
});

test("a wrong answer shows an explanation alongside the correct answer", async ({ page }) => {
  await page.locator(".set-card").first().click();
  const problem = await readProblem(page);
  await answer(page, problem.answer + 1);

  await expect(page.locator(".feedback.wrong")).toContainText(`התשובה היא ${problem.answer}`);
  await expect(page.locator(".explanation")).toBeVisible();
  await expect(page.locator(".explanation")).toContainText("איך פותרים?");
});

test("the explanation appears without any extra click", async ({ page }) => {
  await page.locator(".set-card").first().click();
  const problem = await readProblem(page);

  await expect(page.locator(".explanation")).toHaveCount(0);
  await answer(page, problem.answer + 1);
  // Visible straight after checking — nothing else was clicked in between.
  await expect(page.locator(".explanation")).toBeVisible();
});

test("the explanation shows working steps, not just the final answer", async ({ page }) => {
  // "חיבור עד 100" — design.md specifies a two-step tens-then-units breakdown here.
  await page.locator(".set-card").nth(2).click();
  const problem = await readProblem(page);
  await answer(page, problem.answer + 1);

  const steps = page.locator(".explanation-step");
  await expect(steps).toHaveCount(2);

  // The first step must land on an intermediate value, not the final answer.
  const tens = Math.floor(problem.b / 10) * 10;
  await expect(steps.first()).toContainText(String(problem.a + tens));
});

test("the explanation refers to the numbers of the problem that was failed", async ({ page }) => {
  await page.locator(".set-card").nth(2).click();
  const problem = await readProblem(page);
  await answer(page, problem.answer + 1);

  const text = await page.locator(".explanation").innerText();
  expect(text).toContain(String(problem.a));
  expect(text).toContain(String(problem.answer));
});

test("a correct answer shows no explanation", async ({ page }) => {
  await page.locator(".set-card").first().click();
  const problem = await readProblem(page);
  await answer(page, problem.answer);

  await expect(page.locator(".feedback.correct")).toBeVisible();
  await expect(page.locator(".explanation")).toHaveCount(0);
});

test("arithmetic inside the explanation stays left-to-right", async ({ page }) => {
  // Guards the RTL bug this app already shipped once: equations rendered reversed
  // because they inherited the page's RTL direction.
  await page.locator(".set-card").nth(2).click();
  const problem = await readProblem(page);
  await answer(page, problem.answer + 1);

  const maths = page.locator(".explanation-math");
  const count = await maths.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const direction = await maths
      .nth(i)
      .evaluate((el) => getComputedStyle(el).direction);
    expect(direction).toBe("ltr");
  }
});

test("every problem in every exercise set has an explanation", async ({ page }) => {
  const setCount = await page.locator(".set-card").count();
  expect(setCount).toBe(6);

  for (let setIndex = 0; setIndex < setCount; setIndex++) {
    await page.locator(".set-card").nth(setIndex).click();

    while (true) {
      const problem = await readProblem(page);
      await answer(page, problem.answer + 1);

      await expect(
        page.locator(".explanation"),
        `no explanation for ${problem.a} ${problem.op} ${problem.b}`,
      ).toBeVisible();
      await expect(
        page.locator(".explanation-step"),
        `no explanation steps for ${problem.a} ${problem.op} ${problem.b}`,
      ).not.toHaveCount(0);

      const nextButton = page.getByRole("button", { name: /^(הבא|סיום)$/ });
      const isLast = (await nextButton.innerText()) === "סיום";
      await nextButton.click();
      if (isLast) break;
    }

    await page.getByRole("button", { name: "חזרה לתפריט" }).click();
  }
});
