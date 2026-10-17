import { test, expect, type Page } from "@playwright/test";
import { drawOnCanvas } from "./helpers/notebookAnswer";

/**
 * Acceptance criteria under test (docs/features/notebook-nav-buttons-visibility/
 * product-spec.md and design.md).
 *
 * The settings gear ("הגדרות") lives on the topic-list screen, not inside the notebook
 * practice screen — same reason notebook-nav-settings.spec.ts always opens settings via
 * `openTopics`, before `enterPractice`, never after. This feature adds a SECOND entry
 * point, inside the practice screen itself — tests for that one open settings via the new
 * in-practice button instead.
 *
 * The opening view starts pinned to the page's own top-left corner, and a manual drag with
 * the יד tool toward that same corner is clamped to zero movement — same convention
 * notebook-auto-scroll.spec.ts's and notebook-toolbar-redesign.spec.ts's own manual-pan
 * tests already use: drag away from that corner, not into it.
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
  // Topic 3 ("חיבור וחיסור עד 20"), not 0 — bare-equation questions (LTR), so the page
  // opens anchored to its physical-left corner, same as before this topic choice changed
  // (see docs/features/notebook-question-on-page/, "עיגון פיזי, לא לוגי — סבב ג׳"). A written
  // level, not adaptive, so a fixed question list the rest of this file's replay helpers
  // can rely on — unlike topic 1, which is adaptive and randomizes.
  await page.locator(".topic-card").nth(3).click();
  const byStyle = page.locator(".style-card");
  const byLevel = page.locator(".level-card");
  if (await byStyle.count()) await byStyle.first().click();
  else if (await byLevel.count()) await byLevel.first().click();
}

async function openLevel(page: Page) {
  await openTopics(page);
  await enterPractice(page);
}

/** Walks back up to the topic screen, wherever we are — a reload restores the remembered
 *  student, landing straight back on the topics screen rather than the student picker, so
 *  this never re-clicks `.student-card`. Same technique other notebook specs already use. */
async function backToTopics(page: Page) {
  // .topic-grid, not the "הגדרות" gear button — docs/features/notebook-nav-buttons-visibility/
  // added a second button with that exact aria-label inside the practice screen itself
  // (deliberately, same label for the same action), so "a button called הגדרות exists" no
  // longer uniquely identifies the topic screen the way it used to.
  const onTopics = () => page.locator(".topic-grid").count();
  for (let i = 0; i < 3 && (await onTopics()) === 0; i++) {
    await page.getByRole("button", { name: "← חזרה" }).first().click();
    await page.waitForTimeout(150);
  }
  await expect(page.locator(".topic-grid")).toBeVisible();
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

function navPadToggle(page: Page) {
  return page.locator(".read-aloud-setting", { hasText: "הצגת פאד הניווט" }).locator(".read-aloud-switch");
}

async function turnOnNavPad(page: Page) {
  await openSettings(page);
  await navPadToggle(page).click();
  await closeSettings(page);
}

async function stageBox(page: Page) {
  const box = await page.locator(".notebook-stage").boundingBox();
  if (!box) throw new Error("notebook stage not found");
  return box;
}

async function panXY(page: Page): Promise<{ panX: number; panY: number }> {
  return page.locator(".notebook-stack").evaluate((el) => {
    const m = getComputedStyle(el).transform.match(/matrix\(([^)]+)\)/);
    if (!m) return { panX: 0, panY: 0 };
    const parts = m[1].split(",").map(Number);
    return { panX: parts[4], panY: parts[5] };
  });
}

/** Drags away from the page's starting top-left-pinned corner — see file header. */
async function dragAwayFromStartCorner(page: Page) {
  const box = await stageBox(page);
  const startX = box.x + box.width * 0.6;
  const startY = box.y + box.height * 0.6;
  const endX = box.x + box.width * 0.4;
  const endY = box.y + box.height * 0.4;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(300);
}

// ----------------------------------------------- default: off, not in the DOM

test("the nav pad is absent by default — not just hidden, not reachable at all", async ({ page }) => {
  await openLevel(page);
  await expect(page.locator(".notebook-pan-controls")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "הזז למעלה" })).toHaveCount(0);
});

test("other ways to move the view keep working while the pad is off", async ({ page }) => {
  await openLevel(page);
  await page.getByRole("button", { name: "הזזה" }).click();
  const before = await panXY(page);
  await dragAwayFromStartCorner(page);
  const after = await panXY(page);
  expect(after.panX).not.toBe(before.panX);
});

// ----------------------------------------------- the setting itself

test("the settings dialog offers a separate nav-pad-visible toggle, off by default, alongside the existing pan-speed setting", async ({
  page,
}) => {
  await openTopics(page);
  await openSettings(page);

  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".pan-speed-setting")).toBeVisible();
  const toggleRow = dialog.locator(".read-aloud-setting", { hasText: "הצגת פאד הניווט" });
  await expect(toggleRow).toBeVisible();
  await expect(toggleRow.getByRole("switch")).toHaveAttribute("aria-checked", "false");
});

test("turning the toggle on takes effect immediately and leaves the dialog open", async ({ page }) => {
  await openTopics(page);
  await openSettings(page);
  await navPadToggle(page).click();
  await expect(navPadToggle(page)).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("turning the pad on makes it appear, positioned on the left side of the writing area", async ({ page }) => {
  await openTopics(page);
  await turnOnNavPad(page);
  await enterPractice(page);

  const pad = page.locator(".notebook-pan-controls");
  await expect(pad).toBeVisible();
  const padBox = await pad.boundingBox();
  const box = await stageBox(page);
  if (!padBox) throw new Error("pad not found");
  expect(padBox.x).toBeLessThan(box.x + box.width / 2);
});

test("the pad's position holds in fullscreen too", async ({ page }) => {
  await openTopics(page);
  await turnOnNavPad(page);
  await enterPractice(page);

  await page.getByRole("button", { name: "הגדילו את המחברת למסך מלא" }).click();
  const pad = page.locator(".notebook-pan-controls");
  await expect(pad).toBeVisible();
  const padBox = await pad.boundingBox();
  const box = await stageBox(page);
  if (!padBox) throw new Error("pad not found");
  expect(padBox.x).toBeLessThan(box.x + box.width / 2);
});

test("toggling the pan-speed setting does not change the nav-pad-visible toggle, and vice versa", async ({
  page,
}) => {
  await openTopics(page);
  await openSettings(page);
  await page.locator(".pan-speed-option", { hasText: /^מהיר$/ }).click();
  await expect(navPadToggle(page)).toHaveAttribute("aria-checked", "false");

  await navPadToggle(page).click();
  await expect(page.locator('.pan-speed-option[aria-pressed="true"]')).toHaveText("מהיר");
});

test("the choice survives a reload and belongs to one student", async ({ page }) => {
  await openTopics(page);
  await turnOnNavPad(page);

  await page.reload();
  await backToTopics(page);
  await openSettings(page);
  await expect(navPadToggle(page)).toHaveAttribute("aria-checked", "true");
});

test("each student keeps their own nav-pad-visible choice", async ({ page }) => {
  await openTopics(page, "מיקה");
  await turnOnNavPad(page);

  await page.getByRole("button", { name: "← חזרה" }).click();
  await page.getByRole("button", { name: "← החלף תלמיד" }).click();
  await page.locator(".student-card", { hasText: "רותם" }).click();
  await page.locator(".grade-card").first().click();

  await openSettings(page);
  await expect(navPadToggle(page)).toHaveAttribute("aria-checked", "false");
});

// ----------------------------------------------- settings reachable from the practice screen

test("a settings button exists on the practice screen itself, embedded and in fullscreen", async ({ page }) => {
  await openLevel(page);
  const btn = page.locator(".notebook-settings-btn");
  await expect(btn).toBeVisible();

  await page.getByRole("button", { name: "הגדילו את המחברת למסך מלא" }).click();
  await expect(page.locator(".notebook-settings-btn")).toBeVisible();
});

test("opening settings from the practice screen shows the exact same dialog — every other setting too", async ({
  page,
}) => {
  await openLevel(page);
  await page.locator(".notebook-settings-btn").click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".read-aloud-setting", { hasText: "להקריא" })).toBeVisible();
  await expect(dialog.locator(".hold-zoom-setting")).toBeVisible();
  await expect(dialog.locator(".pan-speed-setting")).toBeVisible();
  await expect(dialog.locator(".read-aloud-setting", { hasText: "הצגת פאד הניווט" })).toBeVisible();
});

test("opening and closing settings from the practice screen does not lose what was drawn", async ({ page }) => {
  await openLevel(page);
  await drawOnCanvas(page);
  await expect(page.getByRole("button", { name: "שלח למורה" })).toBeEnabled();

  await page.locator(".notebook-settings-btn").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "סגירה" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await expect(page.getByRole("button", { name: "שלח למורה" })).toBeEnabled();
});

test("turning the pad on from the practice screen's own settings button makes it appear after closing", async ({
  page,
}) => {
  await openLevel(page);
  await page.locator(".notebook-settings-btn").click();
  await navPadToggle(page).click();
  await page.getByRole("button", { name: "סגירה" }).click();

  await expect(page.locator(".notebook-pan-controls")).toBeVisible();
});
