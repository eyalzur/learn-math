import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test (docs/features/adaptive-difficulty/product-spec.md),
 * and the flow they were built against (docs/features/adaptive-difficulty/design.md).
 *
 *  1. חיבור עד 100 is built from a template — entering it skips the level picker
 *     entirely and lands straight on practice (design.md, "לחיצה על 'חיבור עד 100'").
 *  2. The difficulty responds to real-time success: a run of correct answers should
 *     eventually need carrying past a ten (a wider range), a run of wrong answers should
 *     not (product-spec.md, "מעברי עשרה/שאילה שכיחים יותר").
 *  3. A generated question still carries two hints and shows a real explanation after a
 *     wrong answer, the same content rules that apply to every written question.
 *  4. Questions vary between sessions, even starting from the same initial difficulty.
 *  5. History keeps recording the topic, without inventing a level label that no longer
 *     exists (design.md, "היסטוריה").
 *
 * Criterion 6 used to live here: "חיסור עד 100, the topic not in the pilot, still shows
 * three levels exactly like before" (this feature's own product-spec.md explicitly left
 * it Out of Scope). docs/features/mika-adaptive-difficulty converted חיסור עד 100 too —
 * grade ב׳ now has zero level-based topics — so that criterion is superseded, not broken;
 * see tests/e2e/mika-adaptive-difficulty.spec.ts for its replacement coverage.
 */

const MIKA = 0;

async function open(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

async function toGradeB(page: Page) {
  await page.locator(".student-card").nth(MIKA).click();
  await page.locator(".grade-card").nth(1).click(); // כיתה ב׳
}

async function enterAdd100(page: Page) {
  await toGradeB(page);
  await page.locator(".topic-card", { hasText: "חיבור עד 100" }).click();
}

/** `"47 + 8 ="` → `[47, 8]`. Every add100 question, written or generated, is this shape. */
function operands(prompt: string): [number, number] {
  const m = prompt.trim().match(/^(\d+)\s*\+\s*(\d+)\s*=?$/);
  if (!m) throw new Error(`not a bare addition: "${prompt}"`);
  return [Number(m[1]), Number(m[2])];
}

const needsCarrying = ([a, b]: [number, number]) => (a % 10) + (b % 10) >= 10;

async function currentPrompt(page: Page): Promise<[number, number]> {
  return operands(await page.locator(".problem-text").innerText());
}

async function answer(page: Page, value: number) {
  await page.locator(".answer-input").fill(String(value));
  await page.getByRole("button", { name: "בדיקה" }).click();
  await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
}

test.beforeEach(async ({ page }) => {
  await open(page);
});

test("חיבור עד 100 skips the level picker and lands straight on practice", async ({ page }) => {
  await toGradeB(page);
  await page.locator(".topic-card", { hasText: "חיבור עד 100" }).click();

  await expect(page.locator(".level-card")).toHaveCount(0);
  await expect(page.locator(".problem-text")).toBeVisible();
  await expect(page.locator(".progress")).toContainText("מתוך 20");
});

test("a streak of correct answers climbs to needing carrying, a streak of wrong answers never does", async ({
  page,
}) => {
  // Run A: never answer correctly. Difficulty can only ever back off from its starting
  // point, so no question in this run should require carrying past a ten. Runs the full
  // session (20 questions, not 10) so it actually reaches the result screen below.
  await enterAdd100(page);
  const wrongRunCarries: boolean[] = [];
  for (let i = 0; i < 20; i++) {
    const ops = await currentPrompt(page);
    wrongRunCarries.push(needsCarrying(ops));
    await answer(page, ops[0] + ops[1] + 1000); // guaranteed wrong
  }
  expect(wrongRunCarries.some(Boolean), "a streak of wrong answers still needed carrying").toBe(false);
  await expect(page.locator(".result")).toBeVisible();

  // Run B: always answer correctly. The difficulty should climb over ten questions, so by
  // the end of the run at least one question should require carrying.
  await page.getByRole("button", { name: "חזרה לתפריט" }).click(); // back to the topics screen
  await page.locator(".topic-card", { hasText: "חיבור עד 100" }).click();
  const correctRunCarries: boolean[] = [];
  for (let i = 0; i < 10; i++) {
    const ops = await currentPrompt(page);
    correctRunCarries.push(needsCarrying(ops));
    await answer(page, ops[0] + ops[1]);
  }
  expect(correctRunCarries.some(Boolean), "a streak of correct answers never needed carrying").toBe(true);
});

test("a generated question still has two hints and shows a real explanation after a wrong answer", async ({
  page,
}) => {
  await enterAdd100(page);

  await expect(page.locator(".hint-button")).toBeVisible();
  await page.locator(".hint-button").click();
  await expect(page.locator(".hint")).toHaveCount(1);
  await page.locator(".hint-button").click();
  await expect(page.locator(".hint")).toHaveCount(2);
  await expect(page.locator(".hint-button")).toHaveCount(0);

  const [a, b] = await currentPrompt(page);
  await page.locator(".answer-input").fill(String(a + b + 1000));
  await page.getByRole("button", { name: "בדיקה" }).click();

  await expect(page.locator(".feedback.wrong")).toBeVisible();
  await expect(page.locator(".explanation")).toContainText(String(a));
});

test("questions vary between sessions, even at the same starting difficulty", async ({ page }) => {
  await toGradeB(page);

  const seen = new Set<string>();
  for (let i = 0; i < 6; i++) {
    await page.locator(".topic-card", { hasText: "חיבור עד 100" }).click();
    seen.add((await page.locator(".problem-text").innerText()).trim());
    await page.locator(".link-button").first().click(); // ← חזרה
  }
  expect(seen.size, "every fresh entry showed the exact same first question").toBeGreaterThan(1);
});

test("history records the topic without a level suffix", async ({ page }) => {
  await enterAdd100(page);
  for (let i = 0; i < 20; i++) {
    const ops = await currentPrompt(page);
    await answer(page, ops[0] + ops[1]);
  }
  await expect(page.locator(".result")).toBeVisible();

  await page.getByRole("button", { name: "חזרה לתפריט" }).click();
  await page.getByRole("button", { name: "← חזרה" }).click();
  await page.getByRole("button", { name: "ההתקדמות שלי →" }).click();

  const row = page.locator(".history-row").first();
  await expect(row).toBeVisible();
  await expect(row.locator(".history-what")).toHaveText("חיבור עד 100");
  await expect(row.locator(".history-score")).toHaveText("20/20");
});
