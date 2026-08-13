import { readFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test
 * (docs/features/version-number/product-spec.md):
 *  1. The first screen shows a version number as three dot-separated integers.
 *  2. It is visible with no user action — no click, no scroll, no menu.
 *  3. The number shown is the one in package.json, the single source of truth.
 *  4. The released value is 1.0.0.
 *  5. It is not the most prominent element on the screen.
 *  6. It appears on the first screen only.
 *
 * Plus the direction requirement from design.md: the number sits in its own isolated
 * left-to-right context inside the right-to-left page.
 *
 * The process rule (features raise middle, fixes raise minor) is deliberately not tested
 * here — that is behaviour of the pipeline, not of the app, and product-spec.md separates
 * the two on purpose.
 */

/** package.json is the source of truth; the tests read it rather than hard-coding it. */
const PACKAGE_VERSION: string = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
).version;

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

/** The first screen only appears when no student is remembered. */
async function open(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

const fontSize = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));

test.beforeEach(async ({ page }) => {
  await open(page);
});

test("the first screen shows a version number as three dot-separated integers", async ({
  page,
}) => {
  await expect(page.locator(".app-version-number")).toHaveText(VERSION_PATTERN);
});

test("the version is visible without any click, scroll or menu", async ({ page }) => {
  const version = page.locator(".app-version");
  await expect(version).toBeVisible();

  // In the viewport as the page loads, with nothing to open and nothing to press.
  await expect(version).toBeInViewport();
  await expect(version.locator("button, a")).toHaveCount(0);

  const scrolled = await page.evaluate(() => window.scrollY);
  expect(scrolled, "the version should be reachable without scrolling").toBe(0);
});

test("the number shown is the one in package.json", async ({ page }) => {
  // The whole point of the feature is that there is one source of truth. If these two can
  // drift, the number on screen stops being evidence of anything.
  await expect(page.locator(".app-version-number")).toHaveText(PACKAGE_VERSION);
});

test("the version has not fallen below the 1.0.0 baseline", async ({ page }) => {
  // The spec's criterion was "the released value is 1.0.0", and pinning that literally is
  // what this test did at first. That was a snapshot dressed up as an invariant: the very
  // next feature raised the number and the test failed while nothing was wrong.
  //
  // What the criterion actually protects is the baseline — the counter starts at 1.0.0 and
  // only ever goes up. A reset to 0.x, or a bump script that wrote something malformed,
  // still fails here.
  const [major, middle, minor] = PACKAGE_VERSION.split(".").map(Number);
  expect([major, middle, minor].every(Number.isInteger), PACKAGE_VERSION).toBe(true);
  expect(major).toBeGreaterThanOrEqual(1);

  await expect(page.locator(".app-version-number")).toHaveText(PACKAGE_VERSION);
});

test("the version is not the most prominent element on the screen", async ({ page }) => {
  const version = await fontSize(page, ".app-version");
  const studentName = await fontSize(page, ".student-name");
  const studentGrade = await fontSize(page, ".student-grade");
  const heading = await fontSize(page, ".student-picker h1");

  expect(version).toBeLessThan(studentName);
  expect(version).toBeLessThan(heading);
  // Smaller than the existing secondary text too — it should be the quietest thing here,
  // not merely quieter than the headline.
  expect(version).toBeLessThan(studentGrade);

  // And it sits at the bottom, below the students rather than above them.
  const versionBox = (await page.locator(".app-version").boundingBox())!;
  const lastCardBox = (await page.locator(".student-card").last().boundingBox())!;
  expect(versionBox.y).toBeGreaterThan(lastCardBox.y);
});

test("the version number renders in its own isolated left-to-right context", async ({
  page,
}) => {
  // Direction alone was not enough the last time this bit the project — "3(x + 2)" came
  // out as "3)2 + x(" until the run was isolated. This test exists so removing either
  // property is caught rather than discovered on screen.
  const style = await page
    .locator(".app-version-number")
    .evaluate((el) => {
      const computed = getComputedStyle(el);
      return { direction: computed.direction, unicodeBidi: computed.unicodeBidi };
    });

  expect(style.direction).toBe("ltr");
  expect(style.unicodeBidi).toBe("isolate");
});

test("the label and the number are separate elements, not one mixed string", async ({
  page,
}) => {
  // A single Hebrew+LTR string handed to the bidi algorithm is the pattern that has
  // already shipped three direction bugs here.
  const line = page.locator(".app-version");
  await expect(line).toContainText("גרסה");

  const number = line.locator(".app-version-number");
  await expect(number).toHaveCount(1);
  await expect(number).toHaveText(VERSION_PATTERN);
});

test("the version appears on the first screen only", async ({ page }) => {
  const version = page.locator(".app-version");
  await expect(version).toBeVisible();

  // Topic picker
  await page.locator(".student-card").first().click();
  await expect(page.locator(".topic-card").first()).toBeVisible();
  await expect(version).toHaveCount(0);

  // Level picker
  await page.locator(".topic-card").first().click();
  await expect(page.locator(".level-card").first()).toBeVisible();
  await expect(version).toHaveCount(0);

  // Practice
  await page.locator(".level-card").first().click();
  await expect(page.locator(".answer-input")).toBeVisible();
  await expect(version).toHaveCount(0);

  // Result, after working through the level
  for (let i = 0; i < 10; i++) {
    await page.locator(".answer-input").fill("999999");
    await page.getByRole("button", { name: "בדיקה" }).click();
    await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
  }
  await expect(page.locator(".result")).toBeVisible();
  await expect(version).toHaveCount(0);
});

test("the version does not appear on the history screen", async ({ page }) => {
  await page.locator(".student-card").first().click();
  await page.locator(".history-link").click();

  await expect(page.locator(".app-version")).toHaveCount(0);
});
