import { test, expect, type Page } from "@playwright/test";
import { answerQuestion } from "./helpers/answerQuestion";
import { createAndSelectStudent } from "./helpers/selectStudent";

/**
 * Acceptance criteria under test (docs/features/scored-answer-practice/product-spec.md).
 *
 * Uses מיקה ← כיתה א׳ ← "מספרים עד 20" ← "מה בא אחרי" as a deterministic style lesson
 * (fixed written questions, not runtime-generated) so a test can know the real correct
 * answer in advance — "איזה מספר בא אחרי 3?" → 4 is its first question, found by reading
 * src/data/grade1.ts's content directly (data, not implementation logic). 8 questions in
 * this style in total, confirmed live ("שאלה 1 מתוך 8").
 */

async function openDeterministicLesson(page: Page) {
  await page.goto("/learn-math/");
  await createAndSelectStudent(page);
  await page.getByRole("button", { name: "כיתה א׳" }).click();
  await page.getByRole("button", { name: "מספרים עד 20", exact: true }).click();
  await page.getByRole("button", { name: "מה בא אחרי" }).click();
}

test("a typed final-answer field is offered, with no drawing canvas", async ({ page }) => {
  await openDeterministicLesson(page);
  await expect(page.locator(".answer-input")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
});

test("a correct answer gives brief positive feedback and advances on its own", async ({ page }) => {
  await openDeterministicLesson(page);
  await answerQuestion(page, 4); // "איזה מספר בא אחרי 3?" → 4
  await expect(page.locator(".feedback")).toContainText("נכון מאוד");
  // No further click — the next question should appear by itself.
  await expect(page.locator(".progress")).toContainText("שאלה 2 מתוך", { timeout: 2000 });
});

test("a wrong answer shows the right answer and an explanation, and waits for a manual continue", async ({
  page,
}) => {
  await openDeterministicLesson(page);
  await answerQuestion(page, 999); // "איזה מספר בא אחרי 3?" is 4, not 999
  await expect(page.locator(".feedback")).toContainText("לא נכון. התשובה היא 4");
  await expect(page.getByText("איך פותרים?")).toBeVisible();
  const nextButton = page.getByRole("button", { name: /^(הבא|סיום)$/ });
  await expect(nextButton).toBeVisible();
  // Give an auto-advance a real chance to fire wrongly before asserting it didn't.
  await page.waitForTimeout(1500);
  await expect(page.locator(".progress")).toContainText("שאלה 1 מתוך");
  await nextButton.click();
  await expect(page.locator(".progress")).toContainText("שאלה 2 מתוך");
});

test("works the same way for a different grade/student (עומר, כיתה ח׳)", async ({ page }) => {
  await page.goto("/learn-math/");
  await createAndSelectStudent(page);
  await page.getByRole("button", { name: "כיתה ח׳" }).click();
  await page.locator(".topic-card").first().click();
  await expect(page.locator(".answer-input")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
});

test("arithmetic expressions still render left-to-right", async ({ page }) => {
  await page.goto("/learn-math/");
  await createAndSelectStudent(page);
  await page.getByRole("button", { name: "כיתה א׳" }).click();
  await page.getByRole("button", { name: "חיבור עד 10", exact: true }).click();
  const box = page.locator(".problem-box").first();
  await expect(box).toHaveClass(/box-ltr/);
  await expect(box).toHaveCSS("direction", "ltr");
});

test("finishing a lesson records cumulative score stats, viewable by topic and by difficulty", async ({ page }) => {
  await openDeterministicLesson(page);
  // Every "מה בא אחרי" question across easy+medium, in order (verified live).
  const answers = [4, 6, 7, 9, 13, 16, 18, 20];
  for (const value of answers) {
    await answerQuestion(page, value);
    // Correct every time — the "wait for auto-advance" effect needs a moment to fire.
    await page.waitForTimeout(800);
  }
  // Last question's auto-advance calls onFinish, landing on the result screen.
  await expect(page.locator(".score")).toBeVisible({ timeout: 3000 });
  await page.getByRole("button", { name: "חזרה לתפריט" }).click();
  // Lands back on the style list (this topic's own screen), not the top-level topic list
  // where the history link lives — one more "← חזרה" to get there.
  await page.getByRole("button", { name: "← חזרה" }).click();
  await page.getByText("ההתקדמות שלי").click();
  await expect(page.getByRole("heading", { name: "סיכום לפי נושא" })).toBeVisible();
  await expect(page.locator(".history-stats-label").filter({ hasText: "מספרים עד 20" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "סיכום לפי רמת קושי" })).toBeVisible();
  await expect(page.locator(".history-stats-label").filter({ hasText: "מה בא אחרי" })).toBeVisible();
});
