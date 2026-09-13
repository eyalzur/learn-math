import { test, expect, type Page } from "@playwright/test";
import { answerViaNotebook } from "./helpers/notebookAnswer";

/**
 * Acceptance criteria under test (docs/features/notebook-hold-to-zoom/product-spec.md).
 *
 * This is a pointer-timing gesture (a real-time dwell before the zoom-in triggers), not a
 * click/state-toggle like the rest of this component's UI. Playwright's `page.mouse` fires
 * genuine pointer events in Chromium — the same mechanism `drawOnCanvas` in
 * helpers/notebookAnswer.ts already relies on to put ink on the canvas — so a real dwell
 * (`page.waitForTimeout` well past the design's dwell window) is a faithful, non-flaky way
 * to test this: no fake timers, no mocked clock, just waiting long enough in a real browser.
 *
 * Two of product-spec.md's criteria are deliberately NOT automated here:
 *  - "לא מתנגש עם זום-שתי-אצבעות הקיים" — needs two simultaneous pointers. Playwright's
 *    `page.mouse`/`page.touchscreen` APIs only drive a single active pointer; genuinely
 *    independent multi-pointer input isn't something this suite can drive reliably (the
 *    existing pinch-zoom feature itself has never had e2e coverage, for the same reason —
 *    grep the suite). Verify by hand: hold with one finger until the view zooms in, then
 *    pinch with a second finger — the pinch should take over smoothly, and lifting both
 *    fingers should not snap back to any remembered pre-hold view.
 *  - "שאר הכלים נשארים כפי שהם" (existing pan tool / pinch-zoom unaffected) — this is a
 *    no-regression claim about pre-existing behavior, not new behavior to test. Coverage is
 *    the existing suite (notebook-usability-fixes.spec.ts's zoom/fullscreen tests in
 *    particular) continuing to pass unmodified.
 * "מה שנכתב נשאר במקום הנכון בדף" is verified indirectly below (drawing through a hold-zoom
 * cycle still produces recorded content) rather than pixel-exact — this component has no
 * unit-test layer to assert coordinate math directly, and pixel-probing a live canvas from
 * e2e would be its own source of flakiness.
 * "חל על שלושת התלמידים" isn't repeated per-student below: the gesture lives entirely in
 * PracticeNotebook.tsx with no student-conditional branch, so one student's flow is
 * representative — repeating it three times would test the same code path three times.
 */

async function openLevel(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").first().click();
  await page.locator(".grade-card").first().click();
  await page.locator(".topic-card").first().click();
  await page.locator(".style-card").first().click();
}

function zoomReadout(page: Page) {
  return page.locator(".notebook-zoom-readout");
}

async function zoomPercent(page: Page): Promise<number> {
  const text = await zoomReadout(page).innerText();
  return Number(text.replace("%", ""));
}

/** Scrolls the stage into view first — after answering, the teacher-reading/feedback
 *  panels above the notebook can push it far enough down that its center falls outside the
 *  default viewport, so a raw boundingBox() without this can return real-looking
 *  coordinates that a click never actually reaches. */
async function stageCenter(page: Page): Promise<{ x: number; y: number }> {
  const stage = page.locator(".notebook-stage");
  await stage.scrollIntoViewIfNeeded();
  const box = await stage.boundingBox();
  if (!box) throw new Error("notebook stage not found");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

// Comfortably past the ~180ms dwell window design.md/architecture.md specify — this test
// doesn't assert the exact threshold (that's an implementation tuning detail, not a product
// promise), only that holding still long enough triggers the zoom.
const HOLD_LONG_ENOUGH_MS = 400;

// -------------------------------------------------- arms only at the start, before movement

test("holding a single touch still from the very start zooms the view in temporarily", async ({ page }) => {
  await openLevel(page);
  const before = await zoomPercent(page);

  const { x, y } = await stageCenter(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(HOLD_LONG_ENOUGH_MS);

  const during = await zoomPercent(page);
  expect(during).toBeGreaterThan(before);

  await page.mouse.up();
});

test("starting to move immediately, without pausing first, never triggers the zoom — for the whole touch", async ({
  page,
}) => {
  await openLevel(page);
  const before = await zoomPercent(page);

  const { x, y } = await stageCenter(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  // Moves right away, like real drawing — no pause at the start.
  await page.mouse.move(x + 30, y + 30, { steps: 5 });
  await expect(zoomReadout(page)).toHaveText(`${before}%`);

  // Even waiting well past the dwell window afterward must not retroactively trigger it —
  // the design is explicit that this can only ever arm at the very start of a touch.
  await page.waitForTimeout(HOLD_LONG_ENOUGH_MS);
  await expect(zoomReadout(page)).toHaveText(`${before}%`);

  await page.mouse.up();
  await expect(zoomReadout(page)).toHaveText(`${before}%`);
});

// ------------------------------------------------------------- stays zoomed for the touch

test("the temporary zoom-in stays in effect while the same touch keeps moving (drawing) after it triggers", async ({
  page,
}) => {
  await openLevel(page);
  const before = await zoomPercent(page);

  const { x, y } = await stageCenter(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(HOLD_LONG_ENOUGH_MS);
  const zoomedIn = await zoomPercent(page);
  expect(zoomedIn).toBeGreaterThan(before);

  // Keep "writing" — several small moves, the way finishing a digit would look.
  await page.mouse.move(x + 10, y + 10, { steps: 3 });
  await page.mouse.move(x + 5, y + 25, { steps: 3 });
  await expect(zoomReadout(page)).toHaveText(`${zoomedIn}%`);

  await page.mouse.up();
});

// ------------------------------------------------------------------- exact restore on lift

test("lifting the finger restores exactly the zoom and position from right before the touch started", async ({
  page,
}) => {
  await openLevel(page);
  // Zoom in once first, so "restored" and "recomputed to some default" are distinguishable —
  // otherwise both would coincidentally show the same opening percentage.
  await page.getByRole("button", { name: "הגדל" }).click();
  const before = await zoomReadout(page).innerText();
  const beforeTransform = await page.locator(".notebook-stack").evaluate((el) => getComputedStyle(el).transform);

  const { x, y } = await stageCenter(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(HOLD_LONG_ENOUGH_MS);
  await expect(zoomReadout(page)).not.toHaveText(before);

  await page.mouse.up();

  await expect(zoomReadout(page)).toHaveText(before);
  await expect
    .poll(() => page.locator(".notebook-stack").evaluate((el) => getComputedStyle(el).transform))
    .toBe(beforeTransform);
});

// --------------------------------------------------------------- independent of drawn tool

test("triggers the same way with the pan tool selected, not only with the pen", async ({ page }) => {
  await openLevel(page);
  const before = await zoomPercent(page);
  await page.getByRole("button", { name: "הזזה" }).click();

  const { x, y } = await stageCenter(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(HOLD_LONG_ENOUGH_MS);

  const during = await zoomPercent(page);
  expect(during).toBeGreaterThan(before);

  await page.mouse.up();
  await expect(zoomReadout(page)).toHaveText(`${before}%`);
});

// ------------------------------------------------------------- independent of page lock

test("still triggers on a page that's already locked (answered and checked)", async ({ page }) => {
  await openLevel(page);
  await answerViaNotebook(page, 999999);
  await expect(page.locator(".teacher-reading")).toBeVisible();

  const before = await zoomPercent(page);
  const { x, y } = await stageCenter(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(HOLD_LONG_ENOUGH_MS);

  const during = await zoomPercent(page);
  expect(during).toBeGreaterThan(before);

  await page.mouse.up();
  await expect(zoomReadout(page)).toHaveText(`${before}%`);
});

// ------------------------------------------------------- content written while zoomed sticks

test("drawing that continues through a hold-zoom cycle is still recorded as page content", async ({ page }) => {
  await openLevel(page);
  await expect(page.getByRole("button", { name: "שלח למורה" })).toBeDisabled();

  const { x, y } = await stageCenter(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(HOLD_LONG_ENOUGH_MS); // triggers the temporary zoom-in
  await page.mouse.move(x + 15, y + 15, { steps: 5 }); // "writes" on the zoomed-in view
  await page.mouse.up();

  await expect(page.getByRole("button", { name: "שלח למורה" })).toBeEnabled();
});
