import type { Page } from "@playwright/test";

/**
 * Answering a question — for every spec in this suite, not just the notebook's own.
 *
 * docs/features/notebook-default-practice/ removed the typed answer field: the notebook is
 * now the only way to answer, and the teacher's reading of it is what feeds the existing
 * local check. Every spec that used to `page.locator(".answer-input").fill(...)` needs an
 * equivalent that ends the same way — a confident reading with a specific final answer —
 * without any of them making a real (paid) call to Claude. playwright.config.ts already
 * points VITE_NOTEBOOK_SERVER_URL at an unresolvable host, so every /read-page request in
 * this suite is intercepted here, never sent.
 */

/** A short ink stroke on the notebook canvas — just enough for `pageHasContent()` to be
 *  true and the "שלח למורה" button to enable. What's actually drawn never matters to these
 *  tests: the teacher's reading is always mocked below. */
export async function drawOnCanvas(page: Page) {
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

/**
 * Draws something, mocks a confident teacher reading of `value` as the final answer, and
 * clicks "שלח למורה" — the single action that used to be "type an answer and press בדיקה".
 * `unroute` first so a test answering several questions in a row (a loop over a whole
 * lesson) mocks a fresh value each time rather than stacking handlers.
 */
export async function answerViaNotebook(page: Page, value: number | string) {
  await page.unroute("**/read-page").catch(() => {});
  await page.route("**/read-page", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reading: { certain: true, processReflection: `כתבתי \`${value}\`.`, finalAnswer: Number(value) },
      }),
    }),
  );
  await drawOnCanvas(page);
  await page.getByRole("button", { name: "שלח למורה" }).click();
}

/** Mocks an uncertain reading (the teacher couldn't confidently read the page) for the next
 *  send only — see the "כשהקריאה לא ודאית" acceptance criteria. */
export async function answerUncertainly(page: Page) {
  await page.unroute("**/read-page").catch(() => {});
  await page.route("**/read-page", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ reading: { certain: false } }),
    }),
  );
  await drawOnCanvas(page);
  await page.getByRole("button", { name: "שלח למורה" }).click();
}

/** Mocks the /read-page call itself failing (network/server/timeout) for the next send
 *  only — see the "נכשלת" acceptance criteria. */
export async function mockTeacherCommunicationFailure(page: Page) {
  await page.unroute("**/read-page").catch(() => {});
  await page.route("**/read-page", (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "boom" }) }),
  );
}
