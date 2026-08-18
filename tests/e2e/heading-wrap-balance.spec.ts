import { test, expect, type Page } from "@playwright/test";

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
  await expectBalancedH1(page, "מה נתרגל היום?");
});

test("the level picker's heading balances", async ({ page }) => {
  await page.locator(".student-card").nth(ROTEM).click();
  await page.locator(".topic-card").first().click();
  await expect(page.locator(".level-card")).toHaveCount(3);
  await expectBalancedH1(page);
});

test("the style picker's heading balances", async ({ page }) => {
  await page.locator(".student-card").nth(MIKA).click();
  await page.locator(".grade-card").first().click(); // כיתה א׳, which has style-based topics
  const styleTopic = page.locator(".topic-card", { hasText: "מספרים עד 20" });
  await styleTopic.click();
  await expect(page.locator(".style-card")).not.toHaveCount(0);
  await expectBalancedH1(page);
});

test("the result screen's heading balances", async ({ page }) => {
  await page.locator(".student-card").nth(ROTEM).click();
  await page.locator(".topic-card").first().click();
  await page.locator(".level-card").first().click();
  const total = Number((await page.locator(".progress").innerText()).match(/מתוך (\d+)/)![1]);
  for (let i = 0; i < total; i++) {
    await page.locator(".answer-input").fill("999999");
    await page.getByRole("button", { name: "בדיקה" }).first().click();
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
