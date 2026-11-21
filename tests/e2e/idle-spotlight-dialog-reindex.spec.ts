import { test, expect, type Page } from "@playwright/test";

/**
 * Regression guard for a real bug found live (2026-11-21): the create-student dialog's
 * own .grade-card buttons (docs/features/idle-spotlight/) all got the same effective
 * animation-delay (missing --spot-i defaults to 0 for all of them) because the dialog's
 * open state lives in StudentPicker's own useState, not App's — so a reindex tied to
 * App's own render cycle never fired when the dialog opened. Fixed by switching to a
 * MutationObserver (src/data/idleSpotlight.ts's startIdleSpotlightObserver), which reacts
 * to any DOM change regardless of which component's state caused it.
 */

async function freshStart(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

test("every grade-card inside the create-student dialog gets its own distinct --spot-i", async ({
  page,
}) => {
  await freshStart(page);
  await page.locator(".student-card-add").click();

  const cards = page.locator(".create-student-backdrop .grade-card");
  await expect(cards).toHaveCount(4);

  await expect(async () => {
    const indices = await cards.evaluateAll((els) =>
      els.map((el) => (el as HTMLElement).style.getPropertyValue("--spot-i")),
    );
    expect(indices.every((i) => i !== "")).toBe(true);
    expect(new Set(indices).size).toBe(indices.length);
  }).toPass({ timeout: 2000 });
});
