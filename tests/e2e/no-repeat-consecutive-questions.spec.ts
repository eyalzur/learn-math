import { test, expect, type Page } from "@playwright/test";
import { answerViaNotebook } from "./helpers/notebookAnswer";

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

const MIKA = 0;

async function open(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

async function enterAdd10(page: Page) {
  await page.locator(".student-card").nth(MIKA).click();
  await page.locator(".grade-card").nth(0).click(); // כיתה א׳
  await page.locator(".topic-card", { hasText: "חיבור עד 10" }).click();
}

function operands(prompt: string): [number, number] {
  const m = prompt.trim().match(/^(\d+)\s*\+\s*(\d+)\s*=?$/);
  if (!m) throw new Error(`not a bare addition: "${prompt}"`);
  return [Number(m[1]), Number(m[2])];
}

async function currentPrompt(page: Page): Promise<string> {
  return (await page.locator(".problem-text").innerText()).trim();
}

async function answerUsingPrompt(page: Page, prompt: string, correct: boolean) {
  const [a, b] = operands(prompt);
  await answerViaNotebook(page, correct ? a + b : a + b + 1000);
  await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
}

/** Runs a full 20-question session answering every question the same way (always right, or
 *  always wrong), and returns every prompt shown, in order. */
async function runFullSession(page: Page, correct: boolean): Promise<string[]> {
  await enterAdd10(page);
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
