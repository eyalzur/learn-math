import { test, expect, type Page } from "@playwright/test";
import { createAndSelectStudent } from "./helpers/selectStudent";

/**
 * Acceptance criteria under test (docs/features/two-choice-buttons/product-spec.md and
 * design.md): a question with exactly two possible answers ("מה גדול יותר, 6 או 2?") shows two
 * big buttons instead of the number pad; every other question keeps the pad.
 */

async function openStyle(page: Page, style: "מה גדול יותר" | "מה קטן יותר" | "מה בא אחרי") {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await createAndSelectStudent(page);
  await page.locator(".grade-card").nth(0).click(); // כיתה א׳
  await page.locator(".topic-card").nth(0).click(); // מספרים עד 20
  await page.getByRole("button", { name: "דלג לתרגול →" }).click();
  await page.locator(".style-card").filter({ hasText: style }).click();
  await expect(page.locator(".problem-text")).toBeVisible();
}

const group = (page: Page) => page.getByRole("group", { name: "בחרו תשובה" });
const choicesOf = (page: Page) => group(page).getByRole("button");

/** The two numbers the question names, in the order it names them. */
async function namedNumbers(page: Page): Promise<[number, number]> {
  const text = await page.locator(".problem-text").innerText();
  const nums = (text.match(/\d+/g) ?? []).map(Number);
  expect(nums, `the prompt "${text}" should name exactly two numbers`).toHaveLength(2);
  return [nums[0], nums[1]];
}

async function correctChoice(page: Page, kind: "bigger" | "smaller"): Promise<number> {
  const [a, b] = await namedNumbers(page);
  return kind === "bigger" ? Math.max(a, b) : Math.min(a, b);
}

const tap = (page: Page, value: number) => choicesOf(page).filter({ hasText: new RegExp(`^\\s*${value}\\s*$`) }).first();

test("a two-answer question shows exactly two buttons with the two numbers, in the question's order, and no number pad, field or check button", async ({
  page,
}) => {
  await openStyle(page, "מה גדול יותר");
  await expect(choicesOf(page)).toHaveCount(2);
  const [first, second] = await namedNumbers(page);
  await expect(choicesOf(page).nth(0)).toHaveText(String(first));
  await expect(choicesOf(page).nth(1)).toHaveText(String(second));
  await expect(page.locator(".number-pad")).toHaveCount(0);
  await expect(page.locator(".answer-input")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "בדיקה" })).toHaveCount(0);
});

test("every question of 'מה גדול יותר' and 'מה קטן יותר' (all 11) is a two-button question", async ({ page }) => {
  for (const [style, kind, count] of [
    ["מה גדול יותר", "bigger", 7],
    ["מה קטן יותר", "smaller", 4],
  ] as const) {
    await openStyle(page, style);
    await expect(page.locator(".progress")).toHaveText(`שאלה 1 מתוך ${count}`);
    for (let i = 0; i < count; i++) {
      await expect(choicesOf(page), `${style}, question ${i + 1}`).toHaveCount(2);
      await expect(page.locator(".number-pad")).toHaveCount(0);
      const right = await correctChoice(page, kind);
      await tap(page, right).click();
      if (i < count - 1) await expect(page.locator(".progress")).toHaveText(`שאלה ${i + 2} מתוך ${count}`, { timeout: 6000 });
    }
  }
});

test("tapping the right button is the answer: it turns right, both lock, and the next question comes by itself", async ({ page }) => {
  await openStyle(page, "מה גדול יותר");
  const right = await correctChoice(page, "bigger");
  await tap(page, right).click();
  await expect(choicesOf(page).nth(0)).toBeDisabled();
  await expect(choicesOf(page).nth(1)).toBeDisabled();
  await expect(page.locator(".feedback.correct")).toBeVisible();
  await expect(page.locator(".progress")).toHaveText(/שאלה 2 מתוך/, { timeout: 6000 });
});

test("tapping the wrong button shows which one was right, locks both, and waits for 'הבא'", async ({ page }) => {
  await openStyle(page, "מה גדול יותר");
  const right = await correctChoice(page, "bigger");
  const [a, b] = await namedNumbers(page);
  const wrong = a === right ? b : a;
  // After the tap the buttons carry a mark ("7✓"), so find them by position, not by text.
  const rightIndex = a === right ? 0 : 1;
  await tap(page, wrong).click();
  await expect(choicesOf(page).nth(0)).toBeDisabled();
  await expect(choicesOf(page).nth(1)).toBeDisabled();
  // the right one is marked — by text mark as well as colour
  await expect(choicesOf(page).nth(rightIndex)).toContainText("✓");
  await expect(choicesOf(page).nth(1 - rightIndex)).toContainText("✗");
  // it does not move on by itself
  await page.waitForTimeout(2500);
  await expect(page.locator(".progress")).toHaveText(/שאלה 1 מתוך/);
  await page.getByRole("button", { name: "הבא", exact: true }).click();
  await expect(page.locator(".progress")).toHaveText(/שאלה 2 מתוך/);
  await expect(choicesOf(page)).toHaveCount(2);
  await expect(choicesOf(page).nth(0)).toBeEnabled();
});

test("the hint button is still there and the buttons stay usable while a hint is open", async ({ page }) => {
  await openStyle(page, "מה גדול יותר");
  await page.getByRole("button", { name: /רמז/ }).click();
  await expect(page.locator(".hint").first()).toBeVisible();
  await expect(choicesOf(page).nth(0)).toBeEnabled();
  await expect(choicesOf(page).nth(1)).toBeEnabled();
});

test("a question with more than two possible answers keeps the number pad exactly as before", async ({ page }) => {
  await openStyle(page, "מה בא אחרי");
  await expect(page.locator(".number-pad")).toBeVisible();
  await expect(page.locator(".answer-input")).toBeVisible();
  await expect(page.getByRole("group", { name: "בחרו תשובה" })).toHaveCount(0);
});

test("on a phone screen the buttons are big, apart, side by side, and nothing scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await openStyle(page, "מה גדול יותר");
  const boxes = await Promise.all([0, 1].map((i) => choicesOf(page).nth(i).boundingBox()));
  const [r, l] = boxes as NonNullable<(typeof boxes)[number]>[];
  expect(r.height, "tall enough for a seven-year-old's finger").toBeGreaterThanOrEqual(100);
  expect(r.width).toBeGreaterThanOrEqual(100);
  expect(l.width).toBeGreaterThanOrEqual(100);
  expect(Math.abs(r.y - l.y), "side by side").toBeLessThan(4);
  const gap = Math.max(r.x, l.x) - Math.min(r.x + r.width, l.x + l.width);
  expect(gap, "a gap so a tap on one does not land on the other").toBeGreaterThanOrEqual(12);
  const overflow = await page.evaluate(() => ({
    v: document.documentElement.scrollHeight - window.innerHeight,
    h: document.documentElement.scrollWidth - window.innerWidth,
  }));
  expect(overflow.v, "no vertical scroll").toBeLessThanOrEqual(1);
  expect(overflow.h, "no horizontal scroll").toBeLessThanOrEqual(1);
});

test("the first number named is on the right, as the sentence reads; numbers stay left-to-right", async ({ page }) => {
  await openStyle(page, "מה גדול יותר");
  const [first, second] = await namedNumbers(page);
  const a = await tap(page, first).boundingBox();
  const b = await tap(page, second).boundingBox();
  expect(a!.x, "the first number named is further right").toBeGreaterThan(b!.x);
  // a two-digit number never reads reversed ("13" not "31")
  const dir = await choicesOf(page).nth(0).locator(".two-choice-number").evaluate((el) => getComputedStyle(el).direction);
  expect(dir).toBe("ltr");
});

test("leaving mid-practice and coming back resumes the same question, still as two buttons", async ({ page }) => {
  await openStyle(page, "מה גדול יותר");
  const right = await correctChoice(page, "bigger");
  await tap(page, right).click();
  await expect(page.locator(".progress")).toHaveText(/שאלה 2 מתוך/, { timeout: 6000 });
  const prompt = await page.locator(".problem-text").innerText();
  await page.getByRole("button", { name: /חזרה/ }).first().click();
  // back on the screen the child came from: open the same style again
  await page.locator(".style-card").filter({ hasText: "מה גדול יותר" }).click();
  await expect(page.locator(".progress")).toHaveText(/שאלה 2 מתוך/);
  await expect(page.locator(".problem-text")).toHaveText(prompt);
  await expect(choicesOf(page)).toHaveCount(2);
  await expect(page.locator(".number-pad")).toHaveCount(0);
});
