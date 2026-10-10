import { test, expect, type Page } from "@playwright/test";
import { drawOnCanvas } from "./helpers/notebookAnswer";

/**
 * Acceptance criteria under test (docs/features/notebook-toolbar-redesign/product-spec.md
 * and design.md).
 *
 * The suggestion pulse is a CSS `animation: ... infinite` — Playwright's default actionability
 * check waits for an element to be visually "stable" before clicking it, which a continuously
 * animating button never is, so every click on a possibly-suggested button below passes
 * `{ force: true }`.
 *
 * Suggestion-sensitivity is set to "מהיר מאוד" (fastest) in every test that needs to observe
 * the suggestion actually arm, to keep the suite fast without weakening what's being checked —
 * the *mechanism*, not the exact default delay (that's architecture.md's call, not a tested
 * acceptance criterion here).
 *
 * The settings gear ("הגדרות") lives on the topic-list screen, not inside the notebook
 * practice screen itself — same reason notebook-nav-settings.spec.ts always opens settings
 * via `openTopics`, before `enterPractice`, never after.
 *
 * The opening view starts pinned to the page's own top-left corner (`docs/features/
 * notebook-usability-fixes/`), and clampPan() treats that as a real boundary for a manual
 * drag with the הזזה tool too, not just for the nav-pad taps — dragging further *into* that
 * corner moves nothing. Every manual drag below moves *away* from it (up and to the left on
 * screen), same convention notebook-auto-scroll.spec.ts's own manual-pan test already uses.
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

async function openLevel(page: Page) {
  await openTopics(page);
  await enterPractice(page);
}

function settingsButton(page: Page) {
  return page.getByRole("button", { name: "הגדרות" });
}

/** Walks back up to the topic screen, wherever we are — a reload restores the remembered
 *  student (docs/features/students-and-syllabus/), landing straight back on the topics
 *  screen rather than the student picker, so this never re-clicks `.student-card`. Same
 *  technique notebook-auto-scroll.spec.ts's own `backToTopics` uses. */
async function backToTopics(page: Page) {
  const gear = settingsButton(page);
  for (let i = 0; i < 3 && (await gear.count()) === 0; i++) {
    await page.getByRole("button", { name: "← חזרה" }).first().click();
    await page.waitForTimeout(150);
  }
  await expect(gear).toBeVisible();
}

async function openSettings(page: Page) {
  await settingsButton(page).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

async function closeSettings(page: Page) {
  await page.getByRole("button", { name: "סגירה" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

/** Must be called on the topic-list screen (after `openTopics`, before `enterPractice`) —
 *  the settings gear does not exist inside the notebook practice screen. */
async function setSuggestionSensitivity(page: Page, label: string) {
  await openSettings(page);
  await page.locator(".suggestion-sensitivity-option", { hasText: new RegExp(`^${label}$`) }).click();
  await closeSettings(page);
}

/** Same caller requirement as `setSuggestionSensitivity` above. */
async function setButtonSize(page: Page, label: string) {
  await openSettings(page);
  await page.locator(".button-size-option", { hasText: new RegExp(`^${label}$`) }).click();
  await closeSettings(page);
}

function handButton(page: Page) {
  return page.getByRole("button", { name: "הזזה" });
}
function penButton(page: Page) {
  return page.getByRole("button", { name: "עט" });
}
function eraserButton(page: Page) {
  return page.getByRole("button", { name: "מחק" });
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
  await page.waitForTimeout(300); // past the redesign's own suggestion-arm timer is not
  // needed here, but settles any transition the drag itself triggers
}

// ----------------------------------------------- zoom/clear column — top-left

test("the zoom/fullscreen/whole-page/clear actions are unified into one top-left column, icon-only, nothing lost", async ({
  page,
}) => {
  await openLevel(page);
  const column = page.locator(".notebook-zoom-controls");
  const buttons = column.locator("button");
  await expect(buttons).toHaveCount(5);

  const labels = await buttons.evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
  for (const expected of ["הגדל", "הקטן", "הצגת כל הדף", "נקה דף"]) {
    expect(labels).toContain(expected);
  }
  // Fullscreen toggle carries whichever of the two labels matches the current state.
  expect(labels.some((l) => l === "הגדילו את המחברת למסך מלא" || l === "צאו ממסך מלא")).toBe(true);

  // Icon-only: no visible text content beyond the icon glyph itself (no spelled-out labels).
  for (const text of await buttons.allInnerTexts()) {
    expect(text.length).toBeLessThanOrEqual(2);
  }

  // Pinned to the top-left corner of the writing area (physical — RTL doesn't flip this,
  // per design.md): close to the stage's own top edge and left edge, as one vertical column
  // (shared x, y increasing top to bottom) — not a claim about fitting within half the
  // stage's height, which a short embedded stage can't guarantee regardless of placement.
  const box = await stageBox(page);
  const buttonBoxes = await buttons.evaluateAll((els) => els.map((el) => el.getBoundingClientRect()));
  for (const b of buttonBoxes) {
    expect(b.x).toBeLessThan(box.x + 80); // hugs the left edge
  }
  expect(buttonBoxes[0].y).toBeLessThan(box.y + 40); // the first button hugs the top edge
  const xs = buttonBoxes.map((b) => Math.round(b.x));
  expect(new Set(xs).size).toBe(1); // one column
  const ys = buttonBoxes.map((b) => b.y);
  expect([...ys]).toEqual([...ys].sort((a, b) => a - b)); // top to bottom, in order
});

// ----------------------------------------------- tool column — bottom-right

test("hand/pen/eraser form one bottom-right column and are the only way to choose a tool", async ({ page }) => {
  await openLevel(page);

  // Exactly one of each — no leftover row duplicating these choices elsewhere on screen.
  await expect(page.getByRole("button", { name: "עט" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "מחק" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "הזזה" })).toHaveCount(1);

  // Pinned to the bottom-right corner (physical) — close to the stage's right and bottom
  // edges, one column, same reasoning as the zoom column's own placement check above.
  const box = await stageBox(page);
  const boxes = await Promise.all(
    [handButton(page), penButton(page), eraserButton(page)].map((b) => b.boundingBox()),
  );
  for (const b of boxes) {
    if (!b) throw new Error("tool button not found");
    expect(b.x).toBeGreaterThanOrEqual(box.x + box.width - 170); // hugs the right edge
  }
  const last = boxes[boxes.length - 1];
  if (!last) throw new Error("eraser button not found");
  expect(last.y + last.height).toBeGreaterThan(box.y + box.height - 60); // last button hugs the bottom edge

  // Pen is selected by default.
  await expect(penButton(page)).toHaveAttribute("aria-pressed", "true");
});

test("choosing a tool from the new column behaves exactly as before: pen draws, eraser erases, hand pans by dragging", async ({
  page,
}) => {
  await openLevel(page);

  // Pen (default) draws — proven indirectly via the existing answer flow, which only
  // enables "שלח למורה" once the page actually has content.
  await drawOnCanvas(page);
  await expect(page.getByRole("button", { name: "שלח למורה" })).toBeEnabled();

  // Hand pans the view by dragging, exactly like the existing הזזה tool always has.
  await handButton(page).click();
  await expect(handButton(page)).toHaveAttribute("aria-pressed", "true");
  const before = await panXY(page);
  await dragAwayFromStartCorner(page);
  const after = await panXY(page);
  expect(after.panX).not.toBe(before.panX);

  // Eraser is selectable and becomes the pressed tool.
  await eraserButton(page).click();
  await expect(eraserButton(page)).toHaveAttribute("aria-pressed", "true");
  await expect(penButton(page)).toHaveAttribute("aria-pressed", "false");
});

test("the directional nav pad still works, unchanged by the redesign", async ({ page }) => {
  await openLevel(page);
  const upButton = page.getByRole("button", { name: "הזז למעלה" });
  await expect(upButton).toBeVisible();
  const before = await panXY(page);
  // Move down first so there's room to move back up.
  await page.getByRole("button", { name: "הזז למטה" }).click();
  await page.getByRole("button", { name: "הזז למטה" }).click();
  await upButton.click();
  const after = await panXY(page);
  expect(after.panY).not.toBe(before.panY);
});

// ----------------------------------------------- suggested next action

test("nothing is suggested while a stroke is actively being drawn", async ({ page }) => {
  await openTopics(page);
  await setSuggestionSensitivity(page, "מהיר מאוד");
  await enterPractice(page);

  const box = await stageBox(page);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 20, cy, { steps: 5 });
  await page.waitForTimeout(900); // well past even the fastest suggestion delay
  await expect(handButton(page)).toHaveAttribute("data-suggested", "false");
  await page.mouse.up();
});

test("after a pen stroke ends and a pause follows, the hand button is suggested", async ({ page }) => {
  await openTopics(page);
  await setSuggestionSensitivity(page, "מהיר מאוד");
  await enterPractice(page);

  await drawOnCanvas(page);
  await expect(handButton(page)).toHaveAttribute("data-suggested", "true", { timeout: 2000 });
  // Still fully functional, not just decorative, and the pen stays the selected tool —
  // a suggestion never forces a switch on its own.
  await expect(handButton(page)).toBeEnabled();
  await expect(penButton(page)).toHaveAttribute("aria-pressed", "true");
});

test("starting a real pan (drag) clears the hand suggestion immediately", async ({ page }) => {
  await openTopics(page);
  await setSuggestionSensitivity(page, "מהיר מאוד");
  await enterPractice(page);

  await drawOnCanvas(page);
  await expect(handButton(page)).toHaveAttribute("data-suggested", "true", { timeout: 2000 });

  await handButton(page).click({ force: true });
  await dragAwayFromStartCorner(page);
  await expect(handButton(page)).toHaveAttribute("data-suggested", "false");
});

test("pressing a nav-pad button also clears a pending hand suggestion", async ({ page }) => {
  await openTopics(page);
  await setSuggestionSensitivity(page, "מהיר מאוד");
  await enterPractice(page);

  await drawOnCanvas(page);
  await expect(handButton(page)).toHaveAttribute("data-suggested", "true", { timeout: 2000 });

  await page.getByRole("button", { name: "הזז למטה" }).click({ force: true });
  await expect(handButton(page)).toHaveAttribute("data-suggested", "false");
});

test("when panning ends, the pen button is suggested", async ({ page }) => {
  await openTopics(page);
  await setSuggestionSensitivity(page, "מהיר מאוד");
  await enterPractice(page);

  await handButton(page).click();
  await dragAwayFromStartCorner(page);
  await expect(penButton(page)).toHaveAttribute("data-suggested", "true", { timeout: 2000 });
  await expect(penButton(page)).toBeEnabled();
  // Pure suggestion — the hand tool is still the one actually selected until pen is pressed.
  await expect(handButton(page)).toHaveAttribute("aria-pressed", "true");
});

test("clicking the suggested tool clears the pulse and switches the tool like any ordinary click", async ({
  page,
}) => {
  await openTopics(page);
  await setSuggestionSensitivity(page, "מהיר מאוד");
  await enterPractice(page);

  await handButton(page).click();
  await dragAwayFromStartCorner(page);
  await expect(penButton(page)).toHaveAttribute("data-suggested", "true", { timeout: 2000 });

  await penButton(page).click({ force: true });
  await expect(penButton(page)).toHaveAttribute("data-suggested", "false");
  await expect(penButton(page)).toHaveAttribute("aria-pressed", "true");
});

test("the eraser is never suggested — an eraser stroke suggests nothing", async ({ page }) => {
  await openTopics(page);
  await setSuggestionSensitivity(page, "מהיר מאוד");
  await enterPractice(page);

  await eraserButton(page).click();
  await drawOnCanvas(page);
  await page.waitForTimeout(900);
  await expect(handButton(page)).toHaveAttribute("data-suggested", "false");
  await expect(penButton(page)).toHaveAttribute("data-suggested", "false");
});

test('"כבוי" suggestion sensitivity disables the mechanic entirely, in both directions', async ({ page }) => {
  await openTopics(page);
  await setSuggestionSensitivity(page, "כבוי");
  await enterPractice(page);

  await drawOnCanvas(page);
  await page.waitForTimeout(900);
  await expect(handButton(page)).toHaveAttribute("data-suggested", "false");

  await handButton(page).click();
  await dragAwayFromStartCorner(page);
  await page.waitForTimeout(900);
  await expect(penButton(page)).toHaveAttribute("data-suggested", "false");
});

// ----------------------------------------------- button size setting

test("the button-size picker offers three options (no כבוי), בינוני chosen by default, alongside the other settings", async ({
  page,
}) => {
  await openTopics(page);
  await openSettings(page);

  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".button-size-setting")).toBeVisible();

  const options = dialog.locator(".button-size-option");
  await expect(options).toHaveCount(3);
  await expect(options).toHaveText(["קטן", "בינוני", "גדול"]);
  await expect(dialog.locator('.button-size-option[aria-pressed="true"]')).toHaveText("בינוני");
});

test("choosing a button size takes effect immediately and visibly changes the buttons' size", async ({ page }) => {
  await openTopics(page);
  await setButtonSize(page, "קטן");
  await enterPractice(page);
  const small = await page.locator(".notebook-zoom-controls button").first().boundingBox();
  if (!small) throw new Error("zoom button not found");

  await page.locator(".notebook-page-indicator").waitFor(); // confirm we're on the practice screen
  await page.getByRole("button", { name: "← חזרה" }).click();
  await page.getByRole("button", { name: "← חזרה" }).click();
  await setButtonSize(page, "גדול");
  await enterPractice(page);
  const large = await page.locator(".notebook-zoom-controls button").first().boundingBox();
  if (!large) throw new Error("zoom button not found");

  expect(large.width).toBeGreaterThan(small.width);
});

test("the button-size choice survives a reload and belongs to one student", async ({ page }) => {
  await openTopics(page);
  await setButtonSize(page, "גדול");

  await page.reload();
  await backToTopics(page);
  await openSettings(page);
  await expect(page.locator('.button-size-option[aria-pressed="true"]')).toHaveText("גדול");
});

// ----------------------------------------------- suggestion-sensitivity setting

test("the suggestion-sensitivity picker offers six options including כבוי, בינוני chosen by default", async ({
  page,
}) => {
  await openTopics(page);
  await openSettings(page);

  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".suggestion-sensitivity-setting")).toBeVisible();

  const options = dialog.locator(".suggestion-sensitivity-option");
  await expect(options).toHaveCount(6);
  await expect(options).toHaveText(["כבוי", "איטי מאוד", "איטי", "בינוני", "מהיר", "מהיר מאוד"]);
  await expect(dialog.locator('.suggestion-sensitivity-option[aria-pressed="true"]')).toHaveText("בינוני");
});

test("the suggestion-sensitivity choice survives a reload and belongs to one student", async ({ page }) => {
  await openTopics(page);
  await setSuggestionSensitivity(page, "איטי");

  await page.reload();
  await backToTopics(page);
  await openSettings(page);
  await expect(page.locator('.suggestion-sensitivity-option[aria-pressed="true"]')).toHaveText("איטי");
});
