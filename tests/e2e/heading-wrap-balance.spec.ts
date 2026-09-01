import { test, expect, type Page } from "@playwright/test";
import { answerViaNotebook } from "./helpers/notebookAnswer";

/**
 * Acceptance criteria under test (docs/features/heading-wrap-balance/product-spec.md).
 *
 * Reported from the live app (mobile): "באיזו כיתה מתרגלים היום?" left "היום?" alone on
 * its own line. Pixel-perfect "is a word left dangling" is not something Playwright can
 * check reliably — it depends on exact font metrics the CI environment does not promise
 * to match. What is reliable and directly tests the fix: `text-wrap: balance` is actually
 * applied to every one of the app's seven `h1` headings, not just the one reported.
 */

const MIKA = 0;
const ROTEM = 1;

async function open(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

async function expectBalancedH1(page: Page, expectedText?: string) {
  const h1 = page.locator("h1");
  await expect(h1).toBeVisible();
  if (expectedText) await expect(h1).toContainText(expectedText);
  const textWrap = await h1.evaluate((el) => getComputedStyle(el).textWrap);
  expect(textWrap).toBe("balance");
}

test.beforeEach(async ({ page }) => {
  await open(page);
});

test("the student picker's heading balances", async ({ page }) => {
  await expectBalancedH1(page, "מי לומד היום?");
});

test("the grade picker's heading balances — the reported case", async ({ page }) => {
  await page.locator(".student-card").nth(MIKA).click();
  await expectBalancedH1(page, "באיזו כיתה מתרגלים היום?");
});

test("the topic picker's heading balances", async ({ page }) => {
  await page.locator(".student-card").nth(ROTEM).click();
  await page.locator(".grade-card").nth(2).click(); // grade ו׳ (docs/features/any-grade-any-student)
  await expectBalancedH1(page, "מה נתרגל היום?");
});

// "the level picker's heading balances" used to live here. Rotem's own topics stopped
// reaching that screen after docs/features/levels-as-practice, and Mika's "חיבור עד 10"
// was the last topic anywhere in the app that still entered it by level rather than by
// style or adaptively — docs/features/mika-adaptive-difficulty converted it too, so the
// level picker is no longer reachable through any route in the live app. Nothing to
// browser-test through navigation the app never offers; the `text-wrap: balance` rule
// itself is a single global CSS rule already proven by the other six headings below, so
// no coverage is actually lost by removing this one.

test("the style picker's heading balances", async ({ page }) => {
  await page.locator(".student-card").nth(MIKA).click();
  await page.locator(".grade-card").first().click(); // כיתה א׳, which has style-based topics
  const styleTopic = page.locator(".topic-card", { hasText: "מספרים עד 20" });
  await styleTopic.click();
  await expect(page.locator(".style-card")).not.toHaveCount(0);
  await expectBalancedH1(page);
});

test("the result screen's heading balances", async ({ page }) => {
  // "חיבור עד 10" reaches the result screen just as well now that it enters practice
  // directly (docs/features/mika-adaptive-difficulty) — no level click needed on the way.
  await page.locator(".student-card").nth(MIKA).click();
  await page.locator(".grade-card").first().click();
  await page.locator(".topic-card", { hasText: "חיבור עד 10" }).click();
  const total = Number((await page.locator(".progress").innerText()).match(/מתוך (\d+)/)![1]);
  for (let i = 0; i < total; i++) {
    await answerViaNotebook(page, 999999);
    await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
  }
  await expect(page.locator(".result")).toBeVisible();
  await expectBalancedH1(page);
});

test("the history screen's heading balances", async ({ page }) => {
  await page.locator(".student-card").nth(MIKA).click();
  await page.getByRole("button", { name: "ההתקדמות שלי →" }).click();
  await expectBalancedH1(page, "ההתקדמות שלי");
});
