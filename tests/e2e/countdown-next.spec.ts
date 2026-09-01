import { test, expect, type Page } from "@playwright/test";
import { answerViaNotebook } from "./helpers/notebookAnswer";

/**
 * Acceptance criteria under test (docs/features/countdown-next/product-spec.md).
 *
 * A correct answer rests on screen for five seconds and then opens the next question by
 * itself. The point of most of these is not that it advances — it is that it advances
 * only where it should, and that a child who wants to stay can.
 *
 * **These are time-dependent, so none of them asserts a particular digit at a particular
 * moment.** They assert that the digit *falls*, and that the change *happens* inside a
 * generous window. A test that expects "3 after two seconds" would go amber on a slow
 * machine and teach everyone to ignore it.
 */

const ALWAYS_WRONG = "999999";

/**
 * Mika's "מספרים עד 20" — a style-based topic, entered by picking a style (not a level).
 * Deliberately **not** one of her topics that moved to adaptive difficulty
 * (docs/features/mika-adaptive-difficulty: חיבור/חיסור עד 10): this suite harvests wrong
 * answers and then replays the exact same questions from the start via "נסו שוב" — which
 * only works against a fixed, written question list. An adaptive topic regenerates fresh
 * random questions on every fresh entry, so the harvested answers would no longer match.
 */
async function openLevel(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").first().click();
  // Mika now has two grades available; this suite is about her grade 1 (א׳) content.
  await page.locator(".grade-card").first().click();
  await page.locator(".topic-card").first().click();
  await page.locator(".style-card").first().click();
}

/**
 * Answers every question wrong to read the answers off the feedback, then replays the
 * same lesson from the start. The only way to answer correctly without hard-coding the
 * content — borrowed from perfect-score-message.spec.ts.
 */
async function harvestAnswers(page: Page): Promise<string[]> {
  const total = Number((await page.locator(".progress").innerText()).match(/(\d+)\s*$/)![1]);
  const answers: string[] = [];
  for (let i = 0; i < total; i++) {
    await answerViaNotebook(page, ALWAYS_WRONG);
    const feedback = await page.locator(".feedback.wrong").innerText();
    answers.push(feedback.match(/(-?\d+(?:\.\d+)?)\s*$/)![1]);
    await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
  }
  await page.getByRole("button", { name: "נסו שוב" }).click();
  return answers;
}

const answerWith = async (page: Page, value: string) => {
  await answerViaNotebook(page, value);
};

const questionNumber = async (page: Page) =>
  Number((await page.locator(".progress").innerText()).match(/(\d+)/)![1]);

// ------------------------------------------------------------- when it runs at all

test("a correct answer starts a visible countdown", async ({ page }) => {
  await openLevel(page);
  const answers = await harvestAnswers(page);
  await answerWith(page, answers[0]);

  await expect(page.locator(".feedback.correct")).toBeVisible();
  await expect(page.locator(".countdown")).toBeVisible();
});

test("a wrong answer starts nothing — the explanation is not on a timer", async ({ page }) => {
  // The screen after a mistake carries the method sentence, the picture and sometimes a
  // conversation. Everything this app was built for is on it, and nothing may push a
  // child off it.
  await openLevel(page);
  await answerWith(page, ALWAYS_WRONG);

  await expect(page.locator(".feedback.wrong")).toBeVisible();
  await expect(page.locator(".countdown")).toHaveCount(0);

  // …and it stays absent, rather than appearing a moment later.
  await page.waitForTimeout(2000);
  await expect(page.locator(".countdown")).toHaveCount(0);
  await expect(page.locator(".explanation")).toBeVisible();
});

test("the last question gets no countdown, not even a stalled one", async ({ page }) => {
  // This shipped broken once: the row appeared on the last question and sat at five
  // forever, because the guard was on the ticking and not on the row. Without this test
  // it comes back.
  await openLevel(page);
  const answers = await harvestAnswers(page);

  for (let i = 0; i < answers.length - 1; i++) {
    await answerWith(page, ALWAYS_WRONG);
    await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
  }
  await expect(page.locator(".progress")).toContainText(`שאלה ${answers.length} מתוך`);

  await answerWith(page, answers[answers.length - 1]);
  await expect(page.locator(".feedback.correct")).toBeVisible();
  await expect(page.locator(".countdown")).toHaveCount(0);

  // Still on the practice screen — finishing is something you arrive at.
  await page.waitForTimeout(2500);
  await expect(page.locator(".progress")).toBeVisible();
});

// -------------------------------------------------------------- what it actually does

test("the countdown falls, rather than sitting still", async ({ page }) => {
  await openLevel(page);
  const answers = await harvestAnswers(page);
  await answerWith(page, answers[0]);

  const first = Number(await page.locator(".countdown-digit").innerText());
  expect(first).toBeGreaterThan(0);
  await expect
    .poll(async () => Number(await page.locator(".countdown-digit").innerText()), {
      timeout: 4000,
    })
    .toBeLessThan(first);
});

test("when it runs out, the next question opens by itself", async ({ page }) => {
  await openLevel(page);
  const answers = await harvestAnswers(page);
  const before = await questionNumber(page);
  await answerWith(page, answers[0]);

  await expect
    .poll(() => questionNumber(page), { timeout: 10000 })
    .toBe(before + 1);
  await expect(page.locator(".countdown"), "the row outlived the question").toHaveCount(0);
});

// ------------------------------------------------------------------ staying put

test("one tap stops it, and it does not start again on that question", async ({ page }) => {
  // A child who stopped it said "give me a moment". A countdown that restarts a second
  // later says nobody was listening.
  await openLevel(page);
  const answers = await harvestAnswers(page);
  const before = await questionNumber(page);
  await answerWith(page, answers[0]);

  await page.locator(".countdown").click();
  await expect(page.locator(".countdown")).toHaveCount(0);

  await page.waitForTimeout(7000);
  expect(await questionNumber(page), "it advanced after being stopped").toBe(before);
  await expect(page.locator(".countdown"), "it came back uninvited").toHaveCount(0);
  await expect(page.getByRole("button", { name: /^(הבא|סיום)$/ })).toBeVisible();
});

test("pressing next works immediately, without waiting for the count", async ({ page }) => {
  await openLevel(page);
  const answers = await harvestAnswers(page);
  const before = await questionNumber(page);
  await answerWith(page, answers[0]);

  await expect(page.locator(".countdown")).toBeVisible();
  await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
  expect(await questionNumber(page)).toBe(before + 1);
  await expect(page.locator(".countdown")).toHaveCount(0);
});

// --------------------------------------------------------------------- the score

test("advancing on its own counts exactly like pressing next", async ({ page }) => {
  // The countdown is a convenience, not a scoring rule.
  await openLevel(page);
  const answers = await harvestAnswers(page);

  // The first two are advanced by the countdown and the rest by pressing, so the score
  // has to be blind to which. Waiting out all ten would be fifty seconds of clock for a
  // claim that two already prove.
  for (let i = 0; i < answers.length; i++) {
    await answerWith(page, answers[i]);
    const last = i === answers.length - 1;
    if (!last && i < 2) {
      await expect(page.locator(".countdown")).toBeVisible();
      await expect.poll(() => questionNumber(page), { timeout: 10000 }).toBe(i + 2);
      continue;
    }
    await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
  }

  await expect(page.locator(".result")).toBeVisible();
  await expect(page.locator(".score")).toContainText("100%");
});

// ------------------------------------------------------------------ accessibility

test("the row announces itself and hides the ticking digit from a screen reader", async ({
  page,
}) => {
  // A screen that changes on its own has to be announced. The digit is not: reading
  // "5, 4, 3" aloud would drown out everything else on the screen.
  await openLevel(page);
  const answers = await harvestAnswers(page);
  await answerWith(page, answers[0]);

  const row = page.locator(".countdown");
  await expect(row).toHaveAttribute("aria-live", "polite");
  expect(await row.getAttribute("aria-label")).toContain("להישאר");
  await expect(page.locator(".countdown-digit")).toHaveAttribute("aria-hidden", "true");
});
