import { test, expect, type Page } from "@playwright/test";
import { createAndSelectStudent } from "./helpers/selectStudent";
import { answerQuestion } from "./helpers/answerQuestion";

/**
 * Acceptance criteria under test (docs/features/playful-redesign/product-spec.md,
 * design.md's "bounce & pop" direction). Most of this feature is visual/motion feel,
 * which isn't meaningfully assertable in e2e — these are the parts that are:
 *  - a correct answer gets a visible star, a wrong one doesn't.
 *  - prefers-reduced-motion actually removes the motion, not just in theory.
 *  - the version button stays the deliberately-quiet exception design.md calls out.
 *  - a long streak of correct answers doesn't stall or slow down (this exact class of
 *    regression was found and fixed live while building this feature).
 */

async function freshStart(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

/** Lands on a fresh student's grade-1 "מה בא אחרי" style lesson — a fixed, non-adaptive
 *  question set, so re-entering it (via "נסו שוב") reproduces the same questions in the
 *  same order. That's required for the harvest-then-replay pattern below: there's no
 *  way to answer a question wrong and then retry the *same* question with the right
 *  answer ("הבא" always advances to a new one), so getting a real "correct" feedback
 *  means knowing the answer before submitting — discovered by deliberately answering
 *  everything wrong once, then doing a second pass with what that revealed. */
async function startFixedLesson(page: Page) {
  await createAndSelectStudent(page, "1");
  await page.locator(".grade-card").first().click();
  await page.locator(".topic-card").first().click();
  await page.getByRole("button", { name: "דלג לתרגול →" }).click();
  await page.locator(".style-card").first().click();
}

/** Answers every question wrong, collecting each real answer from the feedback, then
 *  returns to the start via "נסו שוב" — same technique as
 *  perfect-score-message.spec.ts's harvestAnswers. */
async function harvestAnswers(page: Page): Promise<number[]> {
  const total = Number((await page.locator(".progress").innerText()).match(/(\d+)\s*$/)![1]);
  const answers: number[] = [];
  for (let i = 0; i < total; i++) {
    await answerQuestion(page, 999999);
    const feedback = await page.locator(".feedback.wrong").innerText();
    answers.push(Number(feedback.match(/(-?\d+(?:\.\d+)?)\s*$/)![1]));
    await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
  }
  await page.getByRole("button", { name: "נסו שוב" }).click();
  return answers;
}

test("a correct answer shows a star; a wrong answer does not", async ({ page }) => {
  await freshStart(page);
  await startFixedLesson(page);
  const answers = await harvestAnswers(page);

  await answerQuestion(page, 999999);
  await expect(page.locator(".feedback-star")).toHaveCount(0);
  await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();

  await answerQuestion(page, answers[1]);
  await expect(page.locator(".feedback-star")).toBeVisible();
});

test("prefers-reduced-motion actually removes the motion, not just in theory", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await freshStart(page);

  // Any card on the very first screen already exists once a student is created — the
  // add-card itself is enough, no need to go further in.
  await page.locator(".student-card-add").click();
  await page.getByLabel("שם").fill("דנה");
  await page.getByRole("button", { name: "יצירה" }).click();

  const card = page.locator(".student-card").first();
  const animationName = await card.evaluate((el) => getComputedStyle(el).animationName);
  expect(animationName).toBe("none");
});

test("the version button stays visually quiet — no ledge-shadow like the cards get", async ({
  page,
}) => {
  await freshStart(page);
  await page.locator(".student-card-add").click();
  await page.getByLabel("שם").fill("דנה");
  await page.getByRole("button", { name: "יצירה" }).click();

  const versionShadow = await page
    .locator(".app-version")
    .evaluate((el) => getComputedStyle(el).boxShadow);
  const cardShadow = await page
    .locator(".student-card")
    .first()
    .evaluate((el) => getComputedStyle(el).boxShadow);

  expect(versionShadow).toBe("none");
  expect(cardShadow).not.toBe("none");
});

test("a long streak of correct answers stays fast — regression guard", async ({ page }) => {
  // The harvest pass itself (answering everything wrong once) plus several deliberate
  // 800ms settle-waits in the replay pass legitimately take longer than the suite's
  // default per-test timeout even with no regression at all — raised here, not to
  // hide a slow test, but so a real regression fails on this test's own elapsed-time
  // assertion with a clear message instead of a generic Playwright timeout.
  test.setTimeout(40000);
  await freshStart(page);
  await startFixedLesson(page);
  const answers = await harvestAnswers(page);

  // Real correct answers this time, back to back — exactly the shape of interaction
  // (many right answers in a row) that caused real timeouts earlier in this feature's
  // own development: an entrance animation that replayed on every question because
  // the "בדיקה" button remounts fresh each time, and a transitioned :active state
  // that never finished settling between rapid clicks.
  const started = Date.now();
  for (const value of answers) {
    await answerQuestion(page, value);
    // A correct answer advances on its own — no "הבא" button for that path (same
    // pattern already established elsewhere in this suite, e.g.
    // perfect-score-message.spec.ts's completeLevel).
    const nextButton = page.getByRole("button", { name: /^(הבא|סיום)$/ });
    if (await nextButton.count()) await nextButton.click();
    else await page.waitForTimeout(800);
  }
  const elapsedMs = Date.now() - started;

  // Generous on purpose — this isn't timing the animation itself, it's catching the
  // specific failure mode already seen once: an effect that re-fires every question
  // and compounds into real, cumulative slowdown across a streak. The deliberate
  // 800ms settle-waits alone account for several seconds of this; a real regression
  // of the kind already found (an animation replaying every question) added multiple
  // extra seconds per iteration, which this bound comfortably still catches.
  expect(elapsedMs).toBeLessThan(25000);
});
