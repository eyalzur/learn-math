import { test, expect, type Page } from "@playwright/test";
import { answerQuestion, waitForNextQuestionOrEnd } from "./helpers/answerQuestion";
import { createAndSelectStudent } from "./helpers/selectStudent";

/**
 * Acceptance criteria under test
 * (docs/features/no-repeat-consecutive-questions/product-spec.md).
 *
 * Uses חיבור עד 10 (Mika, grade א׳) on purpose, not a wider-range topic like חיבור עד 1000:
 * its sums are small and its patterns few, so a coincidental back-to-back repeat is far more
 * likely to slip through by chance if the fix weren't working — the same reasoning
 * mika-adaptive-difficulty.spec.ts documents for picking it as a tight-range topic.
 *
 * "Doesn't hang when the range is too narrow to find a different wording" (the product
 * spec's reliability criterion) isn't asserted directly — if the retry loop ever failed to
 * terminate, the whole test below would simply time out rather than complete, which is
 * exactly the failure mode that criterion rules out.
 */

async function open(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

async function enterAdd10(page: Page) {
  await createAndSelectStudent(page); // default gradeId "1" — כיתה א׳
  await page.locator(".grade-card").nth(0).click(); // כיתה א׳
  await page.locator(".topic-card", { hasText: "חיבור עד 10" }).click();
  // A topic card now opens its lesson first (docs/features/lesson-always-first) — skip
  // straight to practice, same as every other call site that used to land there directly.
  await page.getByRole("button", { name: "דלג לתרגול →" }).click();
}

function operands(prompt: string): [number, number] {
  const m = prompt.trim().match(/^(\d+)\s*\+\s*(\d+)\s*=?$/);
  if (!m) throw new Error(`not a bare addition: "${prompt}"`);
  return [Number(m[1]), Number(m[2])];
}

async function currentPrompt(page: Page): Promise<string> {
  return (await page.locator(".problem-text").innerText()).trim();
}

/** A correct answer advances on its own (docs/features/scored-answer-practice/) — no
 *  "הבא" button for that path, unlike a wrong one — same pattern
 *  adaptive-difficulty.spec.ts's own `answer` helper uses. */
async function answerUsingPrompt(page: Page, prompt: string, correct: boolean) {
  const [a, b] = operands(prompt);
  await answerQuestion(page, correct ? a + b : a + b + 1000);
  const nextButton = page.getByRole("button", { name: /^(הבא|סיום)$/ });
  if (await nextButton.count()) {
    await nextButton.click();
  } else {
    // Only the correct-answer path lands here, and only runFullSession(page, true)
    // installs a fake clock (right below) — fast-forward past the real 2s post-answer
    // celebration delay (src/components/Practice.tsx) instead of actually waiting it out.
    await page.clock.runFor(2000);
    await waitForNextQuestionOrEnd(page);
  }
}

/** Runs a full 20-question session answering every question the same way (always right, or
 *  always wrong), and returns every prompt shown, in order. */
async function runFullSession(page: Page, correct: boolean): Promise<string[]> {
  await enterAdd10(page);
  if (correct) await page.clock.install();
  const prompts: string[] = [];
  for (let i = 0; i < 20; i++) {
    const prompt = await currentPrompt(page);
    prompts.push(prompt);
    await answerUsingPrompt(page, prompt, correct);
  }
  await expect(page.locator(".result")).toBeVisible();
  return prompts;
}

function assertNoAdjacentRepeat(prompts: string[]) {
  for (let i = 1; i < prompts.length; i++) {
    expect(prompts[i], `question ${i + 1} repeated question ${i} ("${prompts[i - 1]}")`).not.toBe(
      prompts[i - 1],
    );
  }
}

test.beforeEach(async ({ page }) => {
  await open(page);
});

test("a run of correct answers (climbing difficulty) never repeats the question just answered", async ({
  page,
}) => {
  // 20 correct answers in a row, each waiting out the post-answer celebration delay
  // (2s, src/components/Practice.tsx) — comfortably over the default 30s test timeout.
  test.setTimeout(60000);
  const prompts = await runFullSession(page, true);
  assertNoAdjacentRepeat(prompts);
});

test("a run of wrong answers (difficulty staying put) never repeats the question just answered", async ({
  page,
}) => {
  // The narrowest-range run: difficulty never moves off its easiest tier, so this is the
  // scenario most likely to hit a coincidental repeat if the fix weren't working.
  const prompts = await runFullSession(page, false);
  assertNoAdjacentRepeat(prompts);
});

test("a question may still repeat later in the session, just not back-to-back", async ({ page }) => {
  // Out of scope per product-spec.md: only the adjacent pair is protected. A long enough
  // wrong-only run (stuck on the same easiest tier, few possible prompts) should eventually
  // produce a non-adjacent repeat — proving the fix isn't accidentally over-broad (e.g. by
  // tracking every prompt ever seen instead of just the previous one).
  const prompts = await runFullSession(page, false);
  const seen = new Set<string>();
  let sawNonAdjacentRepeat = false;
  for (const p of prompts) {
    if (seen.has(p)) sawNonAdjacentRepeat = true;
    seen.add(p);
  }
  expect(sawNonAdjacentRepeat, "20 questions on the easiest tier never repeated at all, even non-adjacently").toBe(
    true,
  );
});
