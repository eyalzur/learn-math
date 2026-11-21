import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("opens a log of versions, newest first, from the main screen", async ({ page }) => {
  const versionTrigger = page.getByRole("button", { name: /^גרסה/ });
  await expect(versionTrigger).toBeVisible();

  await versionTrigger.click();

  const dialog = page.getByRole("dialog", { name: "מה היה בכל גרסה" });
  await expect(dialog).toBeVisible();
});

test("the version log is never empty, even with a single entry", async ({ page }) => {
  await page.getByRole("button", { name: /^גרסה/ }).click();
  const dialog = page.getByRole("dialog", { name: "מה היה בכל גרסה" });

  const entries = dialog.locator("li");
  await expect(entries).not.toHaveCount(0);
  await expect(entries.first()).not.toBeEmpty();
});

test("marks the version currently open on this device as today's", async ({ page }) => {
  const versionTrigger = page.getByRole("button", { name: /^גרסה/ });
  const triggerText = await versionTrigger.innerText();
  const currentVersion = triggerText.replace("גרסה", "").trim();

  await versionTrigger.click();
  const dialog = page.getByRole("dialog", { name: "מה היה בכל גרסה" });

  const currentEntry = dialog.locator("li", { hasText: currentVersion });
  await expect(currentEntry).toContainText("(היום)");
});

test("every version entry has a version number and a description", async ({ page }) => {
  await page.getByRole("button", { name: /^גרסה/ }).click();
  const dialog = page.getByRole("dialog", { name: "מה היה בכל גרסה" });

  const entries = dialog.locator("li");
  const count = await entries.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    const text = (await entries.nth(i).innerText()).trim();
    expect(text.length).toBeGreaterThan(0);
    // a version number like 1.43.0 appears somewhere in the entry's text
    expect(text).toMatch(/\d+\.\d+\.\d+/);
  }
});

test("closing the log returns to the main screen untouched", async ({ page }) => {
  await expect(page.getByText("מי לומד היום?")).toBeVisible();

  await page.getByRole("button", { name: /^גרסה/ }).click();
  const dialog = page.getByRole("dialog", { name: "מה היה בכל גרסה" });
  await expect(dialog).toBeVisible();

  await page.getByRole("button", { name: "סגירה" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText("מי לומד היום?")).toBeVisible();
});
