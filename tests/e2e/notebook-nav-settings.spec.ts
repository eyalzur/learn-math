import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test (docs/features/notebook-nav-settings/product-spec.md).
 *
 * The hold-to-repeat tests below use a real pointer hold (page.mouse.down/up with a real
 * wait in between) — the same technique notebook-hold-to-zoom.spec.ts and
 * notebook-nav-buttons.spec.ts already rely on for timing-sensitive gestures in this
 * component, no fake timers.
 *
 * Not automated here, for the same reason notebook-hold-to-zoom.spec.ts skips its
 * two-finger criterion: none, this feature has no multi-pointer or cross-component
 * interaction its own suite doesn't already cover.
 */

async function openTopics(page: Page, studentName?: string) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  if (studentName) await page.locator(".student-card", { hasText: studentName }).click();
  else await page.locator(".student-card").first().click();
  await page.locator(".grade-card").first().click();
}

async function enterPractice(page: Page) {
  await page.locator(".topic-card").first().click();
  await page.locator(".style-card").first().click();
}

async function backToTopics(page: Page) {
  const gear = settingsButton(page);
  for (let i = 0; i < 3 && (await gear.count()) === 0; i++) {
    await page.getByRole("button", { name: "← חזרה" }).first().click();
    await page.waitForTimeout(150);
  }
  await expect(gear).toBeVisible();
}

function settingsButton(page: Page) {
  return page.getByRole("button", { name: "הגדרות" });
}

async function openSettings(page: Page) {
  await settingsButton(page).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

async function closeSettings(page: Page) {
  await page.getByRole("button", { name: "סגירה" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

function speedOption(page: Page, label: string) {
  return page.locator(".pan-speed-option", { hasText: new RegExp(`^${label}$`) });
}

async function chooseSpeed(page: Page, label: string) {
  await openSettings(page);
  await speedOption(page, label).click();
  await closeSettings(page);
}

function panButton(page: Page, label: "הזז למעלה" | "הזז למטה" | "הזז ימינה" | "הזז שמאלה") {
  return page.getByRole("button", { name: label });
}

async function minimapPosition(page: Page): Promise<{ left: number; top: number }> {
  const view = page.locator(".notebook-minimap-view");
  const left = await view.evaluate((el) => parseFloat((el as HTMLElement).style.left));
  const top = await view.evaluate((el) => parseFloat((el as HTMLElement).style.top));
  return { left, top };
}

async function zoomInALot(page: Page) {
  const zoomIn = page.getByRole("button", { name: "הגדל" });
  for (let i = 0; i < 6; i++) await zoomIn.click();
}

/** A single tap's step, measured by the minimap moving on the "down" direction. */
async function tapStep(page: Page): Promise<number> {
  const down = panButton(page, "הזז למטה");
  const before = await minimapPosition(page);
  await down.click();
  const after = await minimapPosition(page);
  return Math.abs(after.top - before.top);
}

/** How far a real hold moves the view over a fixed window — several repeats if the
 *  interval is on, or nothing beyond the initial press's own step if it's off. */
async function holdStep(page: Page, holdMs: number): Promise<number> {
  const down = panButton(page, "הזז למטה");
  const box = await down.boundingBox();
  if (!box) throw new Error("pan button not found");
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const before = await minimapPosition(page);
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.waitForTimeout(holdMs);
  await page.mouse.up();
  const after = await minimapPosition(page);
  return Math.abs(after.top - before.top);
}

// -------------------------------------------------- presence, shape, default

test("opening the settings shows the pan-speed picker alongside the other two, six options, בינוני chosen by default", async ({
  page,
}) => {
  await openTopics(page);
  await openSettings(page);

  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".read-aloud-setting")).toBeVisible();
  await expect(dialog.locator(".hold-zoom-setting")).toBeVisible();
  await expect(dialog.locator(".pan-speed-setting")).toBeVisible();

  const options = dialog.locator(".pan-speed-option");
  await expect(options).toHaveCount(6);
  await expect(options).toHaveText(["כבוי", "אטי מאוד", "אטי", "בינוני", "מהיר", "מהיר מאוד"]);
  await expect(dialog.locator('.pan-speed-option[aria-pressed="true"]')).toHaveText("בינוני");
});

test("the practice-choice screen shows no pan-speed options before the settings are opened", async ({
  page,
}) => {
  await openTopics(page);
  await expect(page.locator(".pan-speed-option")).toHaveCount(0);
  await expect(page.locator(".pan-speed-setting")).toHaveCount(0);
});

test("choosing a level marks it immediately and leaves the dialog open", async ({ page }) => {
  await openTopics(page);
  await openSettings(page);
  await speedOption(page, "מהיר").click();
  await expect(page.locator('.pan-speed-option[aria-pressed="true"]')).toHaveText("מהיר");
  await expect(page.getByRole("dialog")).toBeVisible();
});

// -------------------------------------------------- affects a single press

test("a faster level moves the view further with a single press than a slower one", async ({
  page,
}) => {
  await openTopics(page);
  await chooseSpeed(page, "אטי מאוד");
  await enterPractice(page);
  await zoomInALot(page);
  const slowStep = await tapStep(page);

  await backToTopics(page);
  await chooseSpeed(page, "מהיר מאוד");
  await enterPractice(page);
  await zoomInALot(page);
  const fastStep = await tapStep(page);

  expect(fastStep).toBeGreaterThan(slowStep);
});

// -------------------------------------------------- "off" disables only the repeat

test('choosing "כבוי" means holding a directional button down still moves only the one step the press itself made', async ({
  page,
}) => {
  await openTopics(page);
  await chooseSpeed(page, "כבוי");
  await enterPractice(page);
  await zoomInALot(page);

  const singleTap = await tapStep(page);
  const longHold = await holdStep(page, 900);

  // A long hold stays close to one tap's worth — no continued panning on its own.
  expect(longHold).toBeLessThan(singleTap * 1.5);
});

test("a level other than כבוי keeps repeating on a hold, same as before this setting existed", async ({
  page,
}) => {
  await openTopics(page);
  await chooseSpeed(page, "בינוני");
  await enterPractice(page);
  await zoomInALot(page);

  const singleTap = await tapStep(page);
  const longHold = await holdStep(page, 900);

  expect(longHold).toBeGreaterThan(singleTap * 1.5);
});

test("a faster level repeats more during the same hold duration than a slower one", async ({
  page,
}) => {
  await openTopics(page);
  await chooseSpeed(page, "אטי מאוד");
  await enterPractice(page);
  await zoomInALot(page);
  const slowHold = await holdStep(page, 900);

  await backToTopics(page);
  await chooseSpeed(page, "מהיר מאוד");
  await enterPractice(page);
  await zoomInALot(page);
  const fastHold = await holdStep(page, 900);

  expect(fastHold).toBeGreaterThan(slowHold);
});

// -------------------------------------------------- persistence

test("the choice survives a reload", async ({ page }) => {
  await openTopics(page);
  await chooseSpeed(page, "אטי");

  await page.reload();
  await backToTopics(page);
  await openSettings(page);
  await expect(page.locator('.pan-speed-option[aria-pressed="true"]')).toHaveText("אטי");
});

test("each student keeps their own pan speed", async ({ page }) => {
  await openTopics(page, "מיקה");
  await openSettings(page);
  await speedOption(page, "אטי מאוד").click();
  await expect(page.locator('.pan-speed-option[aria-pressed="true"]')).toHaveText("אטי מאוד");
  await closeSettings(page);

  await page.getByRole("button", { name: "← חזרה" }).click();
  await page.getByRole("button", { name: "← החלף תלמיד" }).click();
  await page.locator(".student-card", { hasText: "רותם" }).click();
  await page.locator(".grade-card").first().click();

  // Untouched for this student, so still the default.
  await openSettings(page);
  await expect(page.locator('.pan-speed-option[aria-pressed="true"]')).toHaveText("בינוני");
});

