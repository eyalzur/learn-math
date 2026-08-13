import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test (docs/features/perfect-score-message/product-spec.md):
 * 1. A 100% score shows a message different from the 80-99% message.
 * 2. A score below 100% still shows exactly one of the existing three messages, unchanged.
 * 3. The special message only ever appears on the result screen.
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

// Answers every problem in the currently open practice set, optionally answering
// one problem incorrectly, and returns to the result screen.
async function completeSet(page: Page, { missOne }: { missOne: boolean }) {
  let answeredWrong = false;
  while (true) {
    const problemText = await page.locator(".problem-text").innerText();
    const match = problemText.match(/(\d+)\s*([+\-×÷])\s*(\d+)\s*=/);
    if (!match) throw new Error(`Could not parse problem text: "${problemText}"`);
    const [, aStr, op, bStr] = match;
    const correct = computeAnswer(Number(aStr), op, Number(bStr));

    const answer = missOne && !answeredWrong ? correct + 1000 : correct;
    if (missOne && !answeredWrong) answeredWrong = true;

    await page.locator(".answer-input").fill(String(answer));
    await page.getByRole("button", { name: "בדיקה" }).click();

    const nextButton = page.getByRole("button", { name: /^(הבא|סיום)$/ });
    const isLast = (await nextButton.innerText()) === "סיום";
    await nextButton.click();
    if (isLast) break;
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto("/learn-math/");
});

test("shows the perfect-score message when every answer is correct", async ({ page }) => {
  await page.locator(".set-card").first().click();
  await completeSet(page, { missOne: false });

  await expect(page.locator(".result h1")).toHaveText("🌟 ציון מושלם! פתרת הכל נכון!");
  await expect(page.locator(".score")).toContainText("100%");
});

test("keeps the existing message when the score is below 100%", async ({ page }) => {
  await page.locator(".set-card").first().click();
  await completeSet(page, { missOne: true });

  await expect(page.locator(".result h1")).toHaveText("מצוין! שליטה מלאה!");
  await expect(page.locator(".score")).not.toContainText("100%");
});

test("the perfect-score message never appears during practice, only on the result screen", async ({
  page,
}) => {
  await page.locator(".set-card").first().click();
  await expect(page.locator(".practice")).not.toContainText("ציון מושלם");
  await completeSet(page, { missOne: false });
  await expect(page.locator(".result")).toContainText("ציון מושלם");
});
