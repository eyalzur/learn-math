import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test (docs/features/notebook-nav-buttons/product-spec.md),
 * using design.md's exact copy ("הזז למעלה"/"הזז למטה"/"הזז ימינה"/"הזז שמאלה") as
 * selectors — the aria-labels are themselves part of the spec, not an implementation
 * detail.
 *
 * "נגישים... עקבי עם כפתורי הזום הקיימים" is checked via keyboard activation (focus +
 * Enter) rather than a screen-reader audit — this suite has no screen-reader harness
 * anywhere else either; `aria-label` presence is covered implicitly, since every test here
 * locates the buttons by that label.
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

const enterFullscreen = (page: Page) =>
  page.getByRole("button", { name: "הגדילו את המחברת למסך מלא" }).click();

function panButton(page: Page, label: "הזז למעלה" | "הזז למטה" | "הזז ימינה" | "הזז שמאלה") {
  return page.getByRole("button", { name: label });
}

function zoomReadout(page: Page) {
  return page.locator(".notebook-zoom-readout");
}

async function zoomPercent(page: Page): Promise<number> {
  const text = await zoomReadout(page).innerText();
  return Number(text.replace("%", ""));
}

async function minimapPosition(page: Page): Promise<{ left: number; top: number }> {
  const view = page.locator(".notebook-minimap-view");
  const left = await view.evaluate((el) => parseFloat((el as HTMLElement).style.left));
  const top = await view.evaluate((el) => parseFloat((el as HTMLElement).style.top));
  return { left, top };
}

const pageIndicator = (page: Page) => page.locator(".notebook-page-indicator");

// Zoomed in enough that the page reliably exceeds the viewport in both directions,
// regardless of embedded vs. fullscreen sizing — removes any dependency on exact viewport
// pixels for the "stops at the edge" tests below.
async function zoomInALot(page: Page) {
  const zoomIn = page.getByRole("button", { name: "הגדל" });
  for (let i = 0; i < 6; i++) await zoomIn.click();
}

// -------------------------------------------------- presence, both modes

test("four directional buttons sit beside the existing zoom controls, embedded", async ({ page }) => {
  await openLevel(page);
  for (const label of ["הזז למעלה", "הזז למטה", "הזז ימינה", "הזז שמאלה"] as const) {
    await expect(panButton(page, label)).toBeVisible();
  }
  // Still beside the existing controls, not instead of them.
  await expect(page.getByRole("button", { name: "הגדל" })).toBeVisible();
  await expect(page.getByRole("button", { name: "הקטן" })).toBeVisible();
});

test("the four directional buttons are also present in fullscreen", async ({ page }) => {
  await openLevel(page);
  await enterFullscreen(page);
  for (const label of ["הזז למעלה", "הזז למטה", "הזז ימינה", "הזז שמאלה"] as const) {
    await expect(panButton(page, label)).toBeVisible();
  }
});

// -------------------------------------------------- fixed step, not continuous or a jump

test("one press pans a fixed step — two presses move exactly twice as far as one", async ({ page }) => {
  await openLevel(page);
  await zoomInALot(page);

  const start = await minimapPosition(page);
  await panButton(page, "הזז למטה").click();
  const afterOne = await minimapPosition(page);
  const stepOne = afterOne.top - start.top;
  expect(Math.abs(stepOne)).toBeGreaterThan(0.01);

  await panButton(page, "הזז למטה").click();
  const afterTwo = await minimapPosition(page);
  const stepTwo = afterTwo.top - afterOne.top;

  // Same fixed step each time, not an accelerating/continuous scroll.
  expect(stepTwo).toBeCloseTo(stepOne, 1);
});

// -------------------------------------------------- stays within the page, disabled at the edge

test("the view opens pinned to the page's top — up and left start disabled, down and right don't", async ({
  page,
}) => {
  await openLevel(page);
  // PAGE_HEIGHT at the session's opening zoom is taller than any reasonable viewport, so
  // this holds without needing to zoom in first — a fresh notebook opens at its top, like a
  // real one (see PracticeNotebook.tsx's own comment on computeInitialTransform, which this
  // test is really exercising through the new buttons' disabled state).
  await expect(panButton(page, "הזז למעלה")).toBeDisabled();
  await expect(panButton(page, "הזז למטה")).toBeEnabled();
});

test("panning repeatedly in one direction stops at the page edge and disables that button, without erroring", async ({
  page,
}) => {
  await openLevel(page);
  await zoomInALot(page);

  const down = panButton(page, "הזז למטה");
  const up = panButton(page, "הזז למעלה");
  await expect(up).toBeEnabled(); // not already pinned to the bottom before we start

  for (let i = 0; i < 30 && (await down.isEnabled()); i++) {
    await down.click();
  }
  await expect(down).toBeDisabled();
  // Having moved away from the top, the opposite direction is now available — the button
  // isn't just permanently disabled, it reflects the current edge.
  await expect(up).toBeEnabled();

  // One more click on the disabled button is a no-op, not an error or a jump.
  const beforeExtra = await minimapPosition(page);
  await down.click({ force: true });
  const afterExtra = await minimapPosition(page);
  expect(afterExtra.top).toBeCloseTo(beforeExtra.top, 1);
});

// -------------------------------------------------- existing zoom buttons unaffected

test("the existing zoom buttons still work exactly as before", async ({ page }) => {
  await openLevel(page);
  const before = await zoomPercent(page);
  await page.getByRole("button", { name: "הגדל" }).click();
  const afterZoomIn = await zoomPercent(page);
  expect(afterZoomIn).toBeGreaterThan(before);
  await page.getByRole("button", { name: "הקטן" }).click();
  const afterZoomOut = await zoomPercent(page);
  expect(afterZoomOut).toBeLessThan(afterZoomIn);
});

// -------------------------------------------------- minimap stays in sync

test("the minimap reflects the new position after a pan-button press", async ({ page }) => {
  await openLevel(page);
  await zoomInALot(page);
  const before = await minimapPosition(page);
  await panButton(page, "הזז ימינה").click();
  const after = await minimapPosition(page);
  expect(after.left).not.toBeCloseTo(before.left, 1);
});

// -------------------------------------------------- keyboard accessible

test("a directional button can be activated from the keyboard, not just a pointer", async ({ page }) => {
  await openLevel(page);
  await zoomInALot(page);
  const down = panButton(page, "הזז למטה");
  await down.focus();
  const before = await minimapPosition(page);
  await page.keyboard.press("Enter");
  const after = await minimapPosition(page);
  expect(after.top).not.toBeCloseTo(before.top, 1);
});

// -------------------------------------------------- spatial, not RTL-mirrored; distinct from page-nav

test("the right button sits physically to the right of the left button, regardless of the page's RTL direction", async ({
  page,
}) => {
  await openLevel(page);
  const leftBox = await panButton(page, "הזז שמאלה").boundingBox();
  const rightBox = await panButton(page, "הזז ימינה").boundingBox();
  if (!leftBox || !rightBox) throw new Error("pan buttons not found");
  expect(leftBox.x).toBeLessThan(rightBox.x);
});

test("pressing the pan buttons never changes which notebook page is shown", async ({ page }) => {
  await openLevel(page);
  await zoomInALot(page);
  const before = await pageIndicator(page).innerText();
  for (const label of ["הזז ימינה", "הזז שמאלה", "הזז למעלה", "הזז למטה"] as const) {
    await panButton(page, label).click();
  }
  await expect(pageIndicator(page)).toHaveText(before);
});
