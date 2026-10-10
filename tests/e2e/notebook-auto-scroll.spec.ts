import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test (docs/features/notebook-auto-scroll/product-spec.md,
 * "Acceptance Criteria — סבב ב׳").
 *
 * Round 2 replaced round 1's continuous per-pointermove follow with a discrete jump between
 * finished strokes — see product-spec.md's "עדכון סבב ב׳". This file replaces round 1's spec
 * entirely; nothing here tests the old continuous mechanism.
 *
 * `panXY` reads the actually-applied transform on `.notebook-stack`, the same technique
 * notebook-hold-to-zoom.spec.ts already uses for `scale` (via `getComputedStyle`'s
 * normalized `matrix(a, b, c, d, e, f)` form), extended to also read `e`/`f` (panX/panY).
 *
 * A real trap worth flagging for anyone extending this file: once the view has jumped once,
 * a fixed *screen* coordinate no longer maps to the same *page* position it did before the
 * jump. Every test below that draws more than one stroke keeps each stroke's screen
 * coordinates fixed relative to the stage's own box — deliberately never chaining a "does
 * this stay close" assertion onto a stroke drawn *after* a jump already happened in the same
 * test, which would need the same compensation math the round-2 architecture.md's
 * Implementation Notes describes hitting during manual verification.
 *
 * Not automated here, for the same reason as round 1: manual pinch-zoom priority needs two
 * simultaneous pointers, which Playwright's `page.mouse` can't drive.
 *
 * `0.85`+ on the x-axis lands on the directional nav-buttons overlay (PR #78, merged after
 * this file was first written), not the canvas — a mouse-down there never starts a stroke.
 * Every "far" x fraction below stays at `0.75`, same as the passing "jumps right" test's own
 * value (gap of ~100 cells, far more than `AUTO_SCROLL_JUMP_GAP_THRESHOLD_CELLS` needs).
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

/** Walks back up to the topic screen, wherever we are — a reload or leaving practice can
 *  land on the style screen rather than the topic one, so the number of steps isn't fixed.
 *  Same technique notebook-hold-to-zoom.spec.ts's own `backToTopics` uses. */
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

function jumpOption(page: Page, label: string) {
  return page.locator(".auto-scroll-option", { hasText: new RegExp(`^${label}$`) });
}

async function chooseJumpLevel(page: Page, label: string) {
  await openSettings(page);
  await jumpOption(page, label).click();
  await closeSettings(page);
}

async function stageBox(page: Page) {
  const box = await page.locator(".notebook-stage").boundingBox();
  if (!box) throw new Error("notebook stage not found");
  return box;
}

/** The actually-applied `panX`/`panY`/`zoom` on `.notebook-stack` — see file header. */
async function panXY(page: Page): Promise<{ panX: number; panY: number; zoom: number }> {
  return page.locator(".notebook-stack").evaluate((el) => {
    const m = getComputedStyle(el).transform.match(/matrix\(([^)]+)\)/);
    if (!m) return { panX: 0, panY: 0, zoom: 1 };
    const parts = m[1].split(",").map(Number);
    return { panX: parts[4], panY: parts[5], zoom: parts[0] };
  });
}

/** Draws one short stroke (down, small move, up) at the given stage-relative fraction of
 *  the stage's own box — never near the very edge, so a stroke never accidentally triggers
 *  a boundary clamp on its own. */
async function drawStrokeAt(page: Page, box: { x: number; y: number; width: number; height: number }, fx: number, fy: number) {
  const x = box.x + box.width * fx;
  const y = box.y + box.height * fy;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 4, y, { steps: 2 });
  await page.mouse.up();
}

const JUMP_SETTLE_MS = 300; // comfortably past the jump's own transition

// ------------------------------------------------------- frozen during an active stroke

test("the view never moves while a stroke is actively being drawn, even near the edge", async ({ page }) => {
  await openLevel(page);
  const box = await stageBox(page);
  const before = await panXY(page);

  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  const samples: { panX: number; panY: number }[] = [];
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(box.x + box.width * (0.5 + 0.05 * i), y, { steps: 1 });
    samples.push(await panXY(page));
  }
  await page.mouse.up();

  for (const sample of samples) {
    expect(sample.panX).toBe(before.panX);
    expect(sample.panY).toBe(before.panY);
  }
});

// ------------------------------------------------------------------ discrete jump, per axis

test("a stroke that ends clearly to the right of the last one jumps the view right, after it's lifted", async ({
  page,
}) => {
  await openLevel(page);
  const box = await stageBox(page);
  const before = await panXY(page);

  await drawStrokeAt(page, box, 0.25, 0.5);
  const afterFirst = await panXY(page);
  expect(afterFirst).toEqual(before); // nothing to compare the first stroke against

  await drawStrokeAt(page, box, 0.75, 0.5);
  await page.waitForTimeout(JUMP_SETTLE_MS);
  const after = await panXY(page);

  expect(after.panX).toBeLessThan(before.panX); // reveals more of the page to the right
  expect(after.panY).toBe(before.panY);
});

test("a stroke that ends clearly to the left of the last one jumps the view left", async ({ page }) => {
  await openLevel(page);
  const box = await stageBox(page);
  // The opening view already sits at the page's own top-left corner (see
  // computeInitialTransform in notebook.ts's own comments) — there is no "further left" to
  // reveal from there. Move right first, the same way notebook-hold-to-zoom.spec.ts's own
  // left/right tests establish room to move back before asserting on the reverse direction.
  await drawStrokeAt(page, box, 0.25, 0.5);
  await drawStrokeAt(page, box, 0.75, 0.5);
  await page.waitForTimeout(JUMP_SETTLE_MS);
  const afterRight = await panXY(page);

  await drawStrokeAt(page, box, 0.15, 0.5);
  await page.waitForTimeout(JUMP_SETTLE_MS);
  const after = await panXY(page);

  expect(after.panX).toBeGreaterThan(afterRight.panX);
  expect(after.panY).toBe(afterRight.panY);
});

test("a stroke that ends clearly below the last one jumps the view down", async ({ page }) => {
  await openLevel(page);
  const box = await stageBox(page);
  const before = await panXY(page);

  await drawStrokeAt(page, box, 0.5, 0.25);
  await drawStrokeAt(page, box, 0.5, 0.75);
  await page.waitForTimeout(JUMP_SETTLE_MS);
  const after = await panXY(page);

  expect(after.panY).toBeLessThan(before.panY); // reveals more of the page below
  expect(after.panX).toBe(before.panX);
});

test("a stroke that ends clearly above the last one jumps the view up", async ({ page }) => {
  await openLevel(page);
  const box = await stageBox(page);
  // Same reasoning as the "jump left" test above, on the vertical axis: the opening view
  // already sits at the page's own top edge, so move down first to have room to move back.
  await drawStrokeAt(page, box, 0.5, 0.25);
  await drawStrokeAt(page, box, 0.5, 0.85);
  await page.waitForTimeout(JUMP_SETTLE_MS);
  const afterDown = await panXY(page);

  await drawStrokeAt(page, box, 0.5, 0.15);
  await page.waitForTimeout(JUMP_SETTLE_MS);
  const after = await panXY(page);

  expect(after.panY).toBeGreaterThan(afterDown.panY);
  expect(after.panX).toBe(afterDown.panX);
});

test("a stroke far away on both axes at once jumps the view diagonally, in one motion", async ({ page }) => {
  await openLevel(page);
  const box = await stageBox(page);
  const before = await panXY(page);

  await drawStrokeAt(page, box, 0.2, 0.2);
  await drawStrokeAt(page, box, 0.8, 0.8);
  await page.waitForTimeout(JUMP_SETTLE_MS);
  const after = await panXY(page);

  expect(after.panX).toBeLessThan(before.panX);
  expect(after.panY).toBeLessThan(before.panY);
});

// ------------------------------------------------------- close strokes never jump

test("a second (and third) stroke landing close to the last one never jumps — a multi-stroke character", async ({
  page,
}) => {
  await openLevel(page);
  const box = await stageBox(page);
  const before = await panXY(page);

  // Three strokes clustered together, like a digit that needs more than one stroke (a dot, a
  // crossbar, the second stroke of "4") — none of them is a jump away from the one before it.
  await drawStrokeAt(page, box, 0.5, 0.5);
  await page.waitForTimeout(JUMP_SETTLE_MS);
  expect(await panXY(page)).toEqual(before);

  await drawStrokeAt(page, box, 0.51, 0.505);
  await page.waitForTimeout(JUMP_SETTLE_MS);
  expect(await panXY(page)).toEqual(before);

  await drawStrokeAt(page, box, 0.505, 0.495);
  await page.waitForTimeout(JUMP_SETTLE_MS);
  expect(await panXY(page)).toEqual(before);
});

// ---------------------------------------------------------------- never past the page edge

test("repeated strokes that keep moving the same way eventually stop at the page's own edge", async ({ page }) => {
  await openLevel(page);
  const box = await stageBox(page);

  // Each iteration draws a near-then-far pair at the same two screen fractions. Since the
  // view already jumped right after the previous iteration, 0.75 is still clearly to the
  // right of 0.2 *in the current view* every time — so this keeps advancing further right
  // along the page, exactly like a student's writing continuing rightward across a line,
  // until there is no more page left to reveal.
  let last = await panXY(page);
  let stable = 0;
  for (let i = 0; i < 10; i++) {
    await drawStrokeAt(page, box, 0.2, 0.5);
    await drawStrokeAt(page, box, 0.75, 0.5);
    await page.waitForTimeout(JUMP_SETTLE_MS);
    const current = await panXY(page);
    if (current.panX === last.panX) stable++;
    last = current;
  }

  expect(stable).toBeGreaterThan(0);
});

// ---------------------------------------------------- manual pan is never added to

test("panning manually with the הזזה tool moves the view by exactly the drag, no extra jump added", async ({
  page,
}) => {
  await openLevel(page);
  await page.getByRole("button", { name: "הזזה" }).click();
  const box = await stageBox(page);
  const before = await panXY(page);

  // Same edge as the "jumps left" test above: the opening view already sits at the page's
  // own top-left corner, which clampPan() — shared with the nav buttons (PR #78) — treats
  // as a real boundary for drag too, not only for taps. A drag toward that corner has no
  // room to move at all, so this drags *away* from it (right-to-left, a modest distance well
  // under the page/stage size difference) to measure a real, unclamped move.
  const y = box.y + box.height / 2;
  const startX = box.x + box.width * 0.6;
  const endX = box.x + box.width * 0.45;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(endX, y, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(JUMP_SETTLE_MS);
  const after = await panXY(page);

  expect(after.panX - before.panX).toBeCloseTo(endX - startX, 0);
});

// -------------------------------------------------------------------- the settings picker

test("the settings dialog offers six jump strengths, off first, medium chosen by default", async ({ page }) => {
  await openTopics(page);
  await openSettings(page);

  const options = page.locator(".auto-scroll-option");
  await expect(options).toHaveCount(6);
  await expect(options).toHaveText(["כבוי", "מעט מאוד", "מעט", "בינוני", "הרבה", "הרבה מאוד"]);
  await expect(page.locator('.auto-scroll-option[aria-pressed="true"]')).toHaveText("בינוני");

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("התצוגה קופצת בין תו לתו")).toBeVisible();
});

test('choosing "כבוי" means no stroke, however far from the last one, ever jumps the view', async ({ page }) => {
  await openTopics(page);
  await chooseJumpLevel(page, "כבוי");
  await enterPractice(page);

  const box = await stageBox(page);
  const before = await panXY(page);

  await drawStrokeAt(page, box, 0.15, 0.15);
  await drawStrokeAt(page, box, 0.75, 0.75);
  await page.waitForTimeout(JUMP_SETTLE_MS);

  expect(await panXY(page)).toEqual(before);
});

test("a change applies to the very next stroke, with no reload", async ({ page }) => {
  await openTopics(page);
  await chooseJumpLevel(page, "כבוי");
  await enterPractice(page);
  const box = await stageBox(page);
  const before = await panXY(page);
  await drawStrokeAt(page, box, 0.15, 0.5);
  await drawStrokeAt(page, box, 0.75, 0.5);
  await page.waitForTimeout(JUMP_SETTLE_MS);
  expect(await panXY(page)).toEqual(before); // still off

  // Back out, turn it on, straight back in — no reload anywhere.
  await backToTopics(page);
  await chooseJumpLevel(page, "הרבה מאוד");
  await enterPractice(page);
  const box2 = await stageBox(page);
  const before2 = await panXY(page);
  await drawStrokeAt(page, box2, 0.15, 0.5);
  await drawStrokeAt(page, box2, 0.75, 0.5);
  await page.waitForTimeout(JUMP_SETTLE_MS);
  expect((await panXY(page)).panX).toBeLessThan(before2.panX);
});

test("the choice survives a reload", async ({ page }) => {
  await openTopics(page);
  await chooseJumpLevel(page, "מעט");

  await page.reload();
  await settingsButton(page).waitFor({ state: "visible" });
  await openSettings(page);
  await expect(page.locator('.auto-scroll-option[aria-pressed="true"]')).toHaveText("מעט");
});

test("each student keeps their own choice", async ({ page }) => {
  await openTopics(page, "מיקה");
  await chooseJumpLevel(page, "כבוי");

  await page.getByRole("button", { name: "← חזרה" }).click();
  await page.getByRole("button", { name: "← החלף תלמיד" }).click();
  await page.locator(".student-card", { hasText: "רותם" }).click();
  await page.locator(".grade-card").first().click();

  // Untouched for this student — still the default.
  await openSettings(page);
  await expect(page.locator('.auto-scroll-option[aria-pressed="true"]')).toHaveText("בינוני");
});
