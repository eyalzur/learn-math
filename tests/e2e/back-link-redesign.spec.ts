import { test, expect, type Page } from "@playwright/test";
import { createAndSelectStudent } from "./helpers/selectStudent";
import { answerQuestion } from "./helpers/answerQuestion";

/**
 * Acceptance criteria under test (docs/features/back-link-redesign/product-spec.md,
 * design.md's "light pill" direction). Most are a visual-weight judgment ("looks
 * lighter than a real action button") that isn't meaningfully assertable in e2e —
 * these are the parts that are:
 *  - a text-link (.link-button, e.g. "← חזרה") does not carry the same heavy
 *    box-shadow a real action button ("בדיקה") gets.
 *  - two stacked links (GradePicker's first-visit "← החלף תלמיד" + "ההתקדמות שלי →")
 *    have a real vertical gap between them, not a crowded/zero gap.
 *  - a text-link still actually works (its onClick still fires) — this is a visual-only
 *    change, and a regression here would mean navigation silently broke.
 *  - real action buttons are unaffected — the .link-button exclusion didn't
 *    accidentally widen to catch them too.
 */

async function freshStart(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

test("a text-link does not carry the same heavy box-shadow a real action button gets", async ({
  page,
}) => {
  await freshStart(page);
  await createAndSelectStudent(page, "1");
  // A freshly created, freshly selected student lands on GradePicker (any-grade-
  // any-student) — its own "← חזרה"/"← החלף תלמיד" link-button is visible here.
  const link = page.locator(".link-button").first();
  await expect(link).toBeVisible();
  const linkShadow = await link.evaluate((el) => getComputedStyle(el).boxShadow);

  await page.locator(".grade-card-1").click();
  await page.locator(".topic-card").first().click();
  await page.getByRole("button", { name: "דלג לתרגול →" }).click();
  await page.locator(".style-card").first().click();
  const actionButton = page.getByRole("button", { name: "בדיקה" });
  const actionShadow = await actionButton.evaluate((el) => getComputedStyle(el).boxShadow);

  expect(linkShadow).toBe("none");
  expect(actionShadow).not.toBe("none");
});

test("two stacked links have a real gap between them, not a crowded one", async ({ page }) => {
  await freshStart(page);
  await createAndSelectStudent(page, "1");

  const backLink = page.locator(".link-button").first();
  const historyLink = page.locator(".history-link");
  await expect(backLink).toBeVisible();
  await expect(historyLink).toBeVisible();

  const backBox = await backLink.boundingBox();
  const historyBox = await historyLink.boundingBox();
  expect(backBox).not.toBeNull();
  expect(historyBox).not.toBeNull();

  const gap = historyBox!.y - (backBox!.y + backBox!.height);
  expect(gap).toBeGreaterThan(8);
});

test("a text-link still works — clicking it still navigates", async ({ page }) => {
  await freshStart(page);
  await createAndSelectStudent(page, "1");
  await page.locator(".grade-card-1").click();
  await expect(page.locator(".topic-card").first()).toBeVisible();

  await page.locator(".link-button").first().click();
  await expect(page.locator(".grade-card-1")).toBeVisible();
});

test("real action buttons are unaffected — regression guard", async ({ page }) => {
  await freshStart(page);
  await createAndSelectStudent(page, "1");
  await page.locator(".grade-card-1").click();
  await page.locator(".topic-card").first().click();
  await page.getByRole("button", { name: "דלג לתרגול →" }).click();
  await page.locator(".style-card").first().click();

  const checkShadow = await page
    .getByRole("button", { name: "בדיקה" })
    .evaluate((el) => getComputedStyle(el).boxShadow);
  expect(checkShadow).not.toBe("none");

  // A real answer streak still works end to end with the surrounding chrome changed —
  // not a regression test for idle-spotlight/playful-redesign themselves, just a check
  // that this purely-visual change didn't break the actual practice flow.
  await answerQuestion(page, 999999);
  await expect(page.locator(".answer-input")).toBeDisabled();
});
