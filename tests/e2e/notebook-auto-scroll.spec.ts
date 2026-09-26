import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test (docs/features/notebook-auto-scroll/product-spec.md).
 *
 * This is a real-time pointer-following behavior, not a click/state-toggle — so like
 * notebook-hold-to-zoom.spec.ts, this suite drives genuine `page.mouse` pointer events
 * (Playwright fires real ones in Chromium) rather than dispatching synthetic events or
 * mocking timers, and reads the actual applied `transform` on `.notebook-stack` to see
 * what the view did.
 *
 * `panX` is read via `getComputedStyle`'s normalized `matrix(a, b, c, d, e, f)` form (`e` is
 * the x-translation) — the same technique notebook-hold-to-zoom.spec.ts already uses for
 * `scale`, applied to the other component of the same matrix.
 *
 * Not automated here, for reasons already documented in notebook-hold-to-zoom.spec.ts:
 *  - "גלילה/זום ... (צביטה)" — two-finger pinch needs two simultaneous pointers, which
 *    Playwright's `page.mouse` can't drive. Only the drag ("גרירה") half of that criterion
 *    is exercised below; pinch priority is a manual check (pinch-zoom while writing near an
 *    edge should behave exactly as it does today, unaffected by this feature).
 *  - "חל בכל רמת זום" is exercised at the default opening zoom, after a manual zoom-in, and
 *    during a hold-to-zoom cycle — not at every possible zoom level, which would just be the
 *    same code path repeated.
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

/** Stops at the topic screen ("מה נתרגל היום?"), where the ⚙️ button lives. */
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

function autoScrollSwitch(page: Page) {
  return page.getByRole("switch", { name: "התצוגה עוקבת אחרי הכתיבה" });
}

/** Turns the setting off (default is on) and closes the dialog — the round trip every
 *  "off" test needs before entering practice. */
async function turnAutoScrollOff(page: Page) {
  await openSettings(page);
  await autoScrollSwitch(page).click();
  await closeSettings(page);
}

/** Scrolls the stage into view first — see notebook-hold-to-zoom.spec.ts's identical helper
 *  for why a raw boundingBox() alone isn't safe here. */
async function stageCenter(page: Page): Promise<{ x: number; y: number }> {
  const stage = page.locator(".notebook-stage");
  await stage.scrollIntoViewIfNeeded();
  const box = await stage.boundingBox();
  if (!box) throw new Error("notebook stage not found");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

function stageBox(page: Page) {
  return page.locator(".notebook-stage").boundingBox();
}

/** The `panX` component of `.notebook-stack`'s actually-applied transform, read the same
 *  way notebook-hold-to-zoom.spec.ts already reads `scale` from the same matrix. */
async function panX(page: Page): Promise<number> {
  return page.locator(".notebook-stack").evaluate((el) => {
    const m = getComputedStyle(el).transform.match(/matrix\(([^)]+)\)/);
    return m ? Number(m[1].split(",")[4]) : NaN;
  });
}

// -------------------------------------------------------------- follows toward the right edge

test("writing that keeps moving toward the right edge pans the view further right", async ({ page }) => {
  await openLevel(page);
  const box = await stageBox(page);
  if (!box) throw new Error("notebook stage not found");
  const y = box.y + box.height / 2;
  const before = await panX(page);

  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  const rightEdgeX = box.x + box.width - 15; // well inside the ~20% margin band near the edge
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(box.x + box.width / 2 + ((rightEdgeX - box.x - box.width / 2) * i) / 8, y, { steps: 2 });
    await page.waitForTimeout(20);
  }
  const after = await panX(page);
  await page.mouse.up();

  expect(after).toBeLessThan(before);
});

// --------------------------------------------------------------- follows toward the left edge

test("writing that keeps moving toward the left edge pans the view further left", async ({ page }) => {
  await openLevel(page);
  // Move toward the right edge first so there is room to pan back left and still see a
  // change (starting already pinned at the page's own left edge would make "further left"
  // indistinguishable from "already at the boundary" — see the boundary test below).
  const box = await stageBox(page);
  if (!box) throw new Error("notebook stage not found");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  const rightEdgeX = box.x + box.width - 15;
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(box.x + box.width / 2 + ((rightEdgeX - box.x - box.width / 2) * i) / 8, y, { steps: 2 });
    await page.waitForTimeout(20);
  }
  const mid = await panX(page);

  const leftEdgeX = box.x + 15;
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(rightEdgeX + ((leftEdgeX - rightEdgeX) * i) / 10, y, { steps: 2 });
    await page.waitForTimeout(20);
  }
  const after = await panX(page);
  await page.mouse.up();

  expect(after).toBeGreaterThan(mid);
});

// ----------------------------------------------------------- no reversal on small in-band jog

test("a small reversal while still near the same edge doesn't flip the pan direction back", async ({ page }) => {
  await openLevel(page);
  const box = await stageBox(page);
  if (!box) throw new Error("notebook stage not found");
  const y = box.y + box.height / 2;

  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  const rightEdgeX = box.x + box.width - 15;
  for (let i = 1; i <= 6; i++) {
    await page.mouse.move(box.x + box.width / 2 + ((rightEdgeX - box.x - box.width / 2) * i) / 6, y, { steps: 2 });
    await page.waitForTimeout(20);
  }
  const beforeJog = await panX(page);

  // A small "dot"-sized move back toward center, still well inside the margin band — the
  // pan must not increase (reverse) in response, even briefly.
  const samples: number[] = [];
  for (let i = 0; i < 6; i++) {
    await page.mouse.move(rightEdgeX + (i % 2 === 0 ? -4 : 4), y, { steps: 1 });
    await page.waitForTimeout(25);
    samples.push(await panX(page));
  }
  await page.mouse.up();

  for (let i = 1; i < samples.length; i++) {
    expect(samples[i]).toBeLessThanOrEqual(samples[i - 1] + 0.01);
  }
  expect(samples[samples.length - 1]).toBeLessThanOrEqual(beforeJog);
});

// ---------------------------------------------------------------- never pans past the page

test("holding near the edge for a while never keeps pushing the view past the page's own boundary", async ({
  page,
}) => {
  await openLevel(page);
  const box = await stageBox(page);
  if (!box) throw new Error("notebook stage not found");
  const y = box.y + box.height / 2;

  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  const rightEdgeX = box.x + box.width - 12;
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(box.x + box.width / 2 + ((rightEdgeX - box.x - box.width / 2) * i) / 8, y, { steps: 2 });
    await page.waitForTimeout(20);
  }
  // Keep dwelling right at the edge well past when the pan should have settled.
  let last = await panX(page);
  let stable = 0;
  for (let i = 0; i < 20; i++) {
    await page.mouse.move(rightEdgeX + (i % 2 === 0 ? -2 : 2), y, { steps: 1 });
    await page.waitForTimeout(30);
    const current = await panX(page);
    if (current === last) stable++;
    last = current;
  }
  await page.mouse.up();

  // A boundary was reached and held — the pan stopped changing well before the loop ended,
  // rather than drifting further with every extra tick near the edge.
  expect(stable).toBeGreaterThan(5);
});

// ---------------------------------------------------------- manual pan takes full priority

test("dragging with the הזזה tool near the edge pans by exactly the manual drag, not more", async ({ page }) => {
  await openLevel(page);
  await page.getByRole("button", { name: "הזזה" }).click();

  const box = await stageBox(page);
  if (!box) throw new Error("notebook stage not found");
  const y = box.y + box.height / 2;
  const startX = box.x + box.width / 2;
  const endX = box.x + box.width - 10;
  const before = await panX(page);

  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(endX, y, { steps: 10 });
  const after = await panX(page);
  await page.mouse.up();

  // A plain drag pans 1:1 with the pointer. If auto-scroll-follow had also kicked in on top
  // of it, the change would be larger than the raw pointer movement.
  expect(after - before).toBeCloseTo(endX - startX, 0);
});

// -------------------------------------------------------------------- the settings row

test("the settings dialog offers the setting after the hold-to-zoom row, on by default", async ({ page }) => {
  await openTopics(page);
  await openSettings(page);

  const dialog = page.getByRole("dialog");
  const bodyText = await dialog.locator(".settings-body").innerText();
  expect(bodyText).toContain("התצוגה עוקבת אחרי הכתיבה");
  expect(bodyText).toContain("כשמתקרבים לקצה, הדף זז לבד כדי שהכתיבה תישאר גלויה");
  // Comes after the hold-to-zoom row, matching design.md.
  expect(bodyText.indexOf("התקרבות כשמחזיקים את האצבע")).toBeLessThan(
    bodyText.indexOf("התצוגה עוקבת אחרי הכתיבה"),
  );

  await expect(autoScrollSwitch(page)).toHaveAttribute("aria-checked", "true");
});

test('turning the setting off means writing near an edge changes nothing at all', async ({ page }) => {
  await openTopics(page);
  await turnAutoScrollOff(page);
  await enterPractice(page);

  const box = await stageBox(page);
  if (!box) throw new Error("notebook stage not found");
  const y = box.y + box.height / 2;
  const before = await panX(page);

  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  const rightEdgeX = box.x + box.width - 12;
  // Sampled repeatedly during the stroke, not just after — "off" must mean nothing happens
  // even momentarily, the same standard notebook-hold-to-zoom.spec.ts holds its own "כבוי".
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(box.x + box.width / 2 + ((rightEdgeX - box.x - box.width / 2) * i) / 10, y, { steps: 1 });
    await page.waitForTimeout(25);
    expect(await panX(page)).toBe(before);
  }
  await page.mouse.up();
  expect(await panX(page)).toBe(before);
});

test("turning the setting back on applies to the very next stroke, with no reload", async ({ page }) => {
  await openTopics(page);
  await turnAutoScrollOff(page);
  await openSettings(page);
  await autoScrollSwitch(page).click(); // back on
  await closeSettings(page);
  await enterPractice(page);

  const box = await stageBox(page);
  if (!box) throw new Error("notebook stage not found");
  const y = box.y + box.height / 2;
  const before = await panX(page);

  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  const rightEdgeX = box.x + box.width - 12;
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(box.x + box.width / 2 + ((rightEdgeX - box.x - box.width / 2) * i) / 8, y, { steps: 2 });
    await page.waitForTimeout(20);
  }
  const after = await panX(page);
  await page.mouse.up();

  expect(after).toBeLessThan(before);
});

test("the choice survives a reload", async ({ page }) => {
  await openTopics(page);
  await turnAutoScrollOff(page);

  await page.reload();
  await settingsButton(page).waitFor({ state: "visible" });
  await openSettings(page);
  await expect(autoScrollSwitch(page)).toHaveAttribute("aria-checked", "false");
});

test("each student keeps their own choice", async ({ page }) => {
  await openTopics(page, "מיקה");
  await turnAutoScrollOff(page);

  await page.getByRole("button", { name: "← חזרה" }).click();
  await page.getByRole("button", { name: "← החלף תלמיד" }).click();
  await page.locator(".student-card", { hasText: "רותם" }).click();
  await page.locator(".grade-card").first().click();

  // Untouched for this student — still the default (on).
  await openSettings(page);
  await expect(autoScrollSwitch(page)).toHaveAttribute("aria-checked", "true");
});

// -------------------------------------------------------------- works at other zoom levels

test("still follows after a manual zoom-in, not only at the opening zoom", async ({ page }) => {
  await openLevel(page);
  await page.getByRole("button", { name: "הגדל" }).click();
  await page.getByRole("button", { name: "הגדל" }).click();

  const box = await stageBox(page);
  if (!box) throw new Error("notebook stage not found");
  const y = box.y + box.height / 2;
  const before = await panX(page);

  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  const rightEdgeX = box.x + box.width - 12;
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(box.x + box.width / 2 + ((rightEdgeX - box.x - box.width / 2) * i) / 8, y, { steps: 2 });
    await page.waitForTimeout(20);
  }
  const after = await panX(page);
  await page.mouse.up();

  expect(after).toBeLessThan(before);
});

test("still follows while the temporary hold-to-zoom view is active", async ({ page }) => {
  await openLevel(page);
  const { x, y } = await stageCenter(page);

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(400); // comfortably past hold-to-zoom's dwell window
  const zoomedInPanX = await panX(page);

  const box = await stageBox(page);
  if (!box) throw new Error("notebook stage not found");
  const rightEdgeX = box.x + box.width - 12;
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(x + ((rightEdgeX - x) * i) / 8, y, { steps: 2 });
    await page.waitForTimeout(20);
  }
  const after = await panX(page);
  await page.mouse.up();

  expect(after).toBeLessThan(zoomedInPanX);
});
