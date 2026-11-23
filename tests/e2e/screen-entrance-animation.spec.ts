import { test, expect, type Page } from "@playwright/test";
import { createAndSelectStudent } from "./helpers/selectStudent";

/**
 * Acceptance criteria under test (docs/features/screen-entrance-animation/
 * product-spec.md, design.md's "opacity-only fade" direction). Most are a visual-feel
 * judgment that isn't meaningfully assertable in e2e — these are the parts that are:
 *  - a genuine entry into a menu screen shows opacity actually rising from 0 toward 1,
 *    not just a CSS rule existing on paper.
 *  - prefers-reduced-motion disables it entirely.
 *  - the fade does NOT apply inside Practice (the question screen itself) — the user
 *    was explicit about this exclusion.
 *  - normal navigation (into a screen, back, and in again) keeps working — a
 *    regression guard that this purely-visual layer doesn't destabilize navigation.
 */

async function freshStart(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

test("a genuine menu-screen entry fades opacity up from 0", async ({ page }) => {
  await freshStart(page);
  await createAndSelectStudent(page, "1");

  const opacity = await page.locator(".grade-picker").evaluate((el) => getComputedStyle(el).opacity);
  // Sampled immediately after the real navigation that creates this screen — still
  // mid-fade (not yet settled at 1), proving the animation is actually running, not
  // just declared in CSS and never observed in motion.
  expect(Number(opacity)).toBeLessThan(1);

  await expect(async () => {
    const settled = await page.locator(".grade-picker").evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(settled)).toBe(1);
  }).toPass({ timeout: 2000 });
});

test("prefers-reduced-motion disables the entrance fade", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await freshStart(page);
  await createAndSelectStudent(page, "1");

  const animationName = await page
    .locator(".grade-picker")
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(animationName).toBe("none");
});

test("the entrance fade does not apply inside the practice screen itself", async ({ page }) => {
  await freshStart(page);
  await createAndSelectStudent(page, "1");
  await page.locator(".grade-card-1").click();
  await page.locator(".topic-card").first().click();
  await page.getByRole("button", { name: "דלג לתרגול →" }).click();
  await page.locator(".style-card").first().click();

  const animationName = await page
    .locator(".practice")
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(animationName).toBe("none");
});

test("re-entering a screen keeps navigation working — regression guard", async ({ page }) => {
  await freshStart(page);
  await createAndSelectStudent(page, "1");
  await page.locator(".grade-card-1").click();
  await expect(page.locator(".topic-card").first()).toBeVisible();

  await page.locator(".link-button").first().click();
  await expect(page.locator(".grade-card-1")).toBeVisible();

  await page.locator(".grade-card-1").click();
  await expect(page.locator(".topic-card").first()).toBeVisible();
});
