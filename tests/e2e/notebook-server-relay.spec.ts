import { readFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test (docs/features/notebook-server-relay/product-spec.md).
 *
 * Two criteria are server-infrastructure, not client UI, and are not covered here:
 *  - "קיים שירות שרת שרץ בגוגל קלאוד..." — deployment is a manual step the user performs
 *    (see server/README.md); there is nothing running to point Playwright at yet.
 *  - "השרת מקבל בקשה... ומחזיר תמונה נאמנה" — verified manually by the developer against
 *    the actual server code (curl, documented in architecture.md's Implementation Notes).
 *    Playwright only ever sees a *mocked* response here (see MOCK_IMAGE below), since no
 *    real notebook server is deployed in any test environment. A mocked 200 with a fixed
 *    imageDataUrl proves the client displays whatever the server returns — it cannot prove
 *    the server's own PNG is faithful to the matrix, which is why that half is manual.
 *
 * playwright.config.ts sets VITE_NOTEBOOK_SERVER_URL to a fixed, unresolvable host
 * (https://notebook-server.invalid) for the whole test run, purely so every test below can
 * intercept the request with page.route — no real network call is ever made or attempted
 * to escape the mock.
 */

const MOCK_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

/** Same fixed entry point practice-notebook.spec.ts uses. */
async function openLevel(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").first().click();
  await page.locator(".grade-card").first().click();
  await page.locator(".topic-card").first().click();
  await page.locator(".style-card").first().click();
}

function notebookButton(page: Page) {
  return page.getByRole("button", { name: "📝 מחברת" });
}

function sendButton(page: Page) {
  return page.getByRole("button", { name: /^שלח למורה$|^שולח\.\.\.$/ });
}

/**
 * The canvas's own bounding box is the page's full fixed size (1200×1600) regardless of
 * viewport — .notebook-stage clips it with overflow:hidden, so most of that box is not
 * actually visible on screen at the default zoom/pan. Drawing near its top-left corner,
 * not its center, keeps the click inside the part that's really rendered.
 */
async function drawOnCanvas(page: Page) {
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("notebook canvas not found");
  const cx = box.x + 100;
  const cy = box.y + 100;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 30, cy + 30, { steps: 5 });
  await page.mouse.up();
}

function mockSuccess(page: Page, delayMs = 0) {
  return page.route("**/render-page", async (route) => {
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ imageDataUrl: MOCK_IMAGE }) });
  });
}

function mockFailure(page: Page) {
  return page.route("**/render-page", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "boom" }) }));
}

test.beforeEach(async ({ page }) => {
  await openLevel(page);
  await notebookButton(page).click();
});

test("the send-to-teacher button sits in the toolbar, between 'נקה דף' and the page navigation", async ({ page }) => {
  const toolbarButtons = page.locator(".notebook-toolbar button");
  const labels = await toolbarButtons.allTextContents();
  const clearIndex = labels.indexOf("נקה דף");
  const sendIndex = labels.indexOf("שלח למורה");
  const nextPageIndex = labels.findIndex((label) => label.includes("דף הבא"));
  expect(clearIndex).toBeGreaterThanOrEqual(0);
  expect(sendIndex).toBeGreaterThan(clearIndex);
  expect(nextPageIndex).toBeGreaterThan(sendIndex);
});

test("the button is disabled on an empty page, and enabled once there is something written", async ({ page }) => {
  await expect(sendButton(page)).toBeDisabled();
  await drawOnCanvas(page);
  await expect(sendButton(page)).toBeEnabled();
});

test("clicking it sends the page and shows the image the server returned", async ({ page }) => {
  await drawOnCanvas(page);
  await mockSuccess(page);
  await sendButton(page).click();

  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("זה הדף שהמורה מסתכל עליו")).toBeVisible();
  const image = dialog.locator("img");
  await expect(image).toHaveAttribute("src", MOCK_IMAGE);
  // The alt is asserted, not assumed: it is the copy a screen-reader user gets instead of
  // the picture, and it is the one that quietly kept saying "שרת" after the visible title
  // had already been fixed (see design.md, "הכרעת הרוויזיה").
  await expect(image).toHaveAttribute("alt", "הדף שכתבתם, כפי שהמורה רואה אותו");
});

test("closing the image dialog returns to the same page, unchanged", async ({ page }) => {
  await drawOnCanvas(page);
  await mockSuccess(page);
  await sendButton(page).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();

  await page.getByRole("button", { name: "סגירה" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(page.locator("canvas")).toBeVisible();
  // The button is back to its normal label, ready to send again.
  await expect(page.getByRole("button", { name: "שלח למורה" })).toBeEnabled();
});

test("while sending, the button shows a loading label and the rest of the notebook keeps working", async ({ page }) => {
  await drawOnCanvas(page);
  await mockSuccess(page, 400);
  await sendButton(page).click();

  await expect(page.getByRole("button", { name: "שולח..." })).toBeDisabled();
  // Not blocked: drawing tools and page navigation stay usable while the request is in flight.
  await expect(page.getByRole("button", { name: "עט" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "+ דף חדש" })).toBeEnabled();

  await expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 5000 });
});

test("a failed send shows a clear, non-blocking error and lets you try again", async ({ page }) => {
  await drawOnCanvas(page);
  await mockFailure(page);
  await sendButton(page).click();

  const error = page.getByText("לא הצלחנו לשלוח את הדף. נסו שוב.");
  await expect(error).toBeVisible();
  await expect(error).toHaveAttribute("aria-live", "polite");
  // Re-enabled immediately, not stuck in a loading/blocked state.
  await expect(page.getByRole("button", { name: "שלח למורה" })).toBeEnabled();
  // Nothing else on screen was affected — the canvas and its content are still there.
  await expect(page.locator("canvas")).toBeVisible();

  await mockSuccess(page);
  await sendButton(page).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
});

test("leaving the notebook works the same regardless of any of this", async ({ page }) => {
  await drawOnCanvas(page);
  await mockFailure(page);
  await sendButton(page).click();
  await expect(page.getByText("לא הצלחנו לשלוח את הדף. נסו שוב.")).toBeVisible();

  await page.getByRole("button", { name: "← חזרה לתרגול" }).click();
  await expect(page.locator(".answer-input")).toBeVisible();
});

// ------------------------------------------------------- no Claude/Anthropic yet, anywhere

const FORBIDDEN = /anthropic|claude/i;
const CHECKED_FILES = ["server/src/index.ts", "server/src/renderMatrix.ts", "server/package.json", "src/lib/notebookServer.ts"];

test("no Anthropic/Claude dependency exists anywhere in the new server or client code", () => {
  for (const relativePath of CHECKED_FILES) {
    const content = readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
    expect(content, `${relativePath} should not reference anthropic/claude yet`).not.toMatch(FORBIDDEN);
  }
});
