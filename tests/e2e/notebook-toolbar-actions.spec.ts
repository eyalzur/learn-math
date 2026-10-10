import { test, expect, type Page } from "@playwright/test";
import { answerViaNotebook, drawOnCanvas } from "./helpers/notebookAnswer";

/**
 * Acceptance criteria under test (docs/features/notebook-toolbar-actions/product-spec.md
 * and design.md): the question's main action ("שלח למורה" / "הבא") is outside the toolbar,
 * and a fullscreen the student chose survives to the next question.
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

const enterFullscreen = (page: Page) => page.getByRole("button", { name: "הגדילו את המחברת למסך מלא" }).click();
const fullscreenScreen = (page: Page) => page.locator(".notebook-screen.fullscreen");
const nextButton = (page: Page) => page.getByRole("button", { name: "הבא", exact: true });

test.describe("main action outside the toolbar", () => {
  test.beforeEach(async ({ page }) => openLevel(page));

  test("the toolbar has no 'שלח למורה' button, but the button exists on screen", async ({ page }) => {
    await expect(page.locator(".notebook-toolbar").getByRole("button", { name: "שלח למורה" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "שלח למורה" })).toBeVisible();
  });

  test("'שלח למורה' is disabled on an empty page and enabled after drawing", async ({ page }) => {
    const send = page.getByRole("button", { name: "שלח למורה" });
    await expect(send).toBeDisabled();
    await drawOnCanvas(page);
    await expect(send).toBeEnabled();
  });

  test("after a reading, 'הבא' is outside the toolbar and moves on to the next question", async ({ page }) => {
    const before = await page.locator(".problem-box").first().innerText();
    await answerViaNotebook(page, 1);
    await expect(page.locator(".notebook-toolbar").getByRole("button", { name: "הבא", exact: true })).toHaveCount(0);
    await expect(nextButton(page)).toBeVisible();
    await nextButton(page).click();
    await expect(page.locator(".problem-box").first()).not.toHaveText(before);
  });

  test("the toolbar's other controls still work (page add, tools)", async ({ page }) => {
    await page.getByRole("button", { name: "דף חדש" }).click();
    await expect(page.getByText("דף 2 מתוך 2")).toBeVisible();
    await page.getByRole("button", { name: "מחק" }).click();
    await expect(page.getByRole("button", { name: "מחק" })).toHaveAttribute("aria-pressed", "true");
  });

  test("in fullscreen the button is visible without scrolling and the toolbar still has no action", async ({ page }) => {
    await enterFullscreen(page);
    await expect(fullscreenScreen(page)).toBeVisible();
    const send = page.getByRole("button", { name: "שלח למורה" });
    await expect(send).toBeInViewport();
    await expect(page.locator(".notebook-toolbar").getByRole("button", { name: "שלח למורה" })).toHaveCount(0);
  });
});

test.describe("fullscreen carries over to the next question", () => {
  test.beforeEach(async ({ page }) => openLevel(page));

  test("chose fullscreen → the next question starts in fullscreen", async ({ page }) => {
    await enterFullscreen(page);
    await answerViaNotebook(page, 1);
    // The result is shown in the regular layout.
    await expect(fullscreenScreen(page)).toHaveCount(0);
    await nextButton(page).click();
    await expect(fullscreenScreen(page)).toBeVisible();
  });

  test("never chose fullscreen → the next question is not in fullscreen", async ({ page }) => {
    await answerViaNotebook(page, 1);
    await nextButton(page).click();
    await expect(fullscreenScreen(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "שלח למורה" })).toBeVisible();
  });

  test("left fullscreen by hand (✕) → the next question is not in fullscreen", async ({ page }) => {
    await enterFullscreen(page);
    await fullscreenScreen(page).locator(".notebook-fullscreen-exit").click();
    await expect(fullscreenScreen(page)).toHaveCount(0);
    await answerViaNotebook(page, 1);
    await nextButton(page).click();
    await expect(fullscreenScreen(page)).toHaveCount(0);
  });
});
