import { test, expect, type Page } from "@playwright/test";
import { answerViaNotebook, drawOnCanvas } from "./helpers/notebookAnswer";

/**
 * Acceptance criteria under test (docs/features/notebook-usability-fixes/product-spec.md).
 *
 * Five fixes to the notebook practice screen, all from real review feedback. Two of
 * product-spec.md's five criteria are not covered here, deliberately:
 *  - "פונט תרגיל קטן יותר במסך מלא" is a font-size value with no behavioral effect a DOM
 *    assertion can meaningfully distinguish from "some other small size" — it's a design
 *    detail, not something this suite verifies.
 *  - The exact "70%" number is verified below via `.notebook-zoom-readout`, which does
 *    render it as literal text — this turned out to be directly e2e-testable after all.
 *
 * playwright.config.ts points VITE_NOTEBOOK_SERVER_URL at a fixed, unresolvable host, so
 * every /read-page request in this file is intercepted (via the helpers, or directly with
 * page.route below) — no real network call, and no real (paid) call to Claude, ever.
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

function sendButton(page: Page) {
  return page.getByRole("button", { name: /^שלח למורה$|^המורה קוראת\.\.\.$/ });
}

function nextButton(page: Page) {
  return page.getByRole("button", { name: /^(הבא|סיום)$/ });
}

/** Learns the correct answer to the current (first) question from a wrong pass, then
 *  restarts the level fresh — the same harvesting technique notebook-default-practice.spec.ts
 *  and countdown-next.spec.ts already used, more robust than guessing the operator from the
 *  prompt text. */
async function harvestFirstAnswer(page: Page): Promise<string> {
  await openLevel(page);
  await answerViaNotebook(page, 999999);
  const feedback = await page.locator(".feedback.wrong").innerText();
  const correct = feedback.match(/(-?\d+(?:\.\d+)?)\s*$/)![1];
  await openLevel(page);
  return correct;
}

/** Same technique, for every question in the lesson: answers each one wrong to read the
 *  right answer off the feedback line, then replays the identical lesson from the start via
 *  "נסו שוב" (only valid against a fixed, written question list — see countdown-next's
 *  retired version of this helper, which this one is ported from). */
async function harvestAllAnswers(page: Page): Promise<string[]> {
  await openLevel(page);
  const total = Number((await page.locator(".progress").innerText()).match(/(\d+)\s*$/)![1]);
  const answers: string[] = [];
  for (let i = 0; i < total; i++) {
    await answerViaNotebook(page, 999999);
    const feedback = await page.locator(".feedback.wrong").innerText();
    answers.push(feedback.match(/(-?\d+(?:\.\d+)?)\s*$/)![1]);
    await nextButton(page).click();
  }
  await page.getByRole("button", { name: "נסו שוב" }).click();
  return answers;
}

function mockReading(page: Page, finalAnswer: number | string, errorPointer?: string) {
  return page.route("**/read-page", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reading: {
          certain: true,
          processReflection: "ראיתי את התהליך שכתבת.",
          ...(errorPointer ? { errorPointer } : {}),
          finalAnswer: Number(finalAnswer),
        },
      }),
    }),
  );
}

// -------------------------------------------------------------- "נקה דף" confirmation

test('"נקה דף" asks for confirmation before clearing, and "ביטול" leaves the page untouched', async ({
  page,
}) => {
  await openLevel(page);
  await drawOnCanvas(page);
  await expect(sendButton(page)).toBeEnabled();

  await page.getByRole("button", { name: "נקה דף" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("למחוק את מה שכתוב בדף?");

  await dialog.getByRole("button", { name: "ביטול" }).click();
  await expect(dialog).toHaveCount(0);
  // The dialog closed without acting — what was drawn is still there.
  await expect(sendButton(page)).toBeEnabled();
});

test('"נקה דף" actually clears the page once confirmed', async ({ page }) => {
  await openLevel(page);
  await drawOnCanvas(page);

  await page.getByRole("button", { name: "נקה דף" }).click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByRole("button", { name: "מחיקה" }).click();

  await expect(dialog).toHaveCount(0);
  await expect(sendButton(page)).toBeDisabled();
});

test('"נקה דף" on an already-empty page clears silently, with no confirmation dialog', async ({
  page,
}) => {
  await openLevel(page);
  await expect(sendButton(page)).toBeDisabled();

  await page.getByRole("button", { name: "נקה דף" }).click();

  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(sendButton(page)).toBeDisabled();
});

test('"נקה דף" and "הסר דף" use the same dialog component but never confuse their actions', async ({
  page,
}) => {
  // Regression guard for the shared pendingConfirm state: opening one dialog and cancelling
  // it must not leave the other action half-armed.
  await openLevel(page);
  await page.getByRole("button", { name: "דף חדש" }).click();
  await drawOnCanvas(page);

  await page.getByRole("button", { name: "הסר דף" }).click();
  const removeDialog = page.getByRole("alertdialog");
  await expect(removeDialog).toContainText("למחוק את הדף?");
  await removeDialog.getByRole("button", { name: "ביטול" }).click();
  await expect(page.getByText("דף 2 מתוך 2")).toBeVisible();

  await page.getByRole("button", { name: "נקה דף" }).click();
  const clearDialog = page.getByRole("alertdialog");
  await expect(clearDialog).toContainText("למחוק את מה שכתוב בדף?");
  await clearDialog.getByRole("button", { name: "מחיקה" }).click();
  // Cleared the page's content, not removed the page itself.
  await expect(page.getByText("דף 2 מתוך 2")).toBeVisible();
  await expect(sendButton(page)).toBeDisabled();
});

// --------------------------------------------------------------------- opening zoom

test("the notebook opens at a fixed 70% zoom, even on a narrow phone viewport", async ({ page }) => {
  // 390px wide is the same viewport notebook-default-practice.spec.ts uses for its
  // mobile-specific checks — narrow enough that a fit-to-viewport calculation (the old
  // behavior) produced something far smaller than usable, per the review report.
  await page.setViewportSize({ width: 390, height: 700 });
  await openLevel(page);

  await expect(page.locator(".notebook-zoom-readout")).toHaveText("70%");
});

// ------------------------------------------------------------ no more auto-advance

test("a correct answer does not advance on its own — the practice screen waits for the manual button", async ({
  page,
}) => {
  const correct = await harvestFirstAnswer(page);
  await answerViaNotebook(page, correct);

  await expect(page.locator(".feedback.correct")).toBeVisible();
  await expect(nextButton(page)).toBeVisible();

  // Well past the five seconds the old countdown used to take.
  await page.waitForTimeout(7000);
  await expect(page.locator(".progress")).toContainText("שאלה 1 מתוך");
  await expect(page.locator(".feedback.correct")).toBeVisible();

  await nextButton(page).click();
  await expect(page.locator(".progress")).toContainText("שאלה 2 מתוך");
});

test("there is no countdown row anywhere on a correct answer", async ({ page }) => {
  const correct = await harvestFirstAnswer(page);
  await answerViaNotebook(page, correct);

  await expect(page.locator(".countdown")).toHaveCount(0);
});

// --------------------------------------- correct answer with a flagged process error

test("a correct final answer with no errorPointer looks exactly like today — full green celebration", async ({
  page,
}) => {
  const correct = await harvestFirstAnswer(page);
  await mockReading(page, correct);
  await drawOnCanvas(page);
  await sendButton(page).click();

  const verdict = page.locator(".feedback");
  await expect(verdict).toHaveText("נכון מאוד! 🎉");
  await expect(verdict).toHaveClass(/\bcorrect\b/);
  await expect(verdict).not.toHaveClass(/correct-flagged/);
  await expect(page.locator(".teacher-reading-flag")).toHaveCount(0);
});

test("a correct final answer whose process the teacher flagged is visibly distinguished from a plain correct answer", async ({
  page,
}) => {
  const correct = await harvestFirstAnswer(page);
  await mockReading(page, correct, "שמתי לב שדילגת על שלב באמצע.");
  await drawOnCanvas(page);
  await sendButton(page).click();

  const verdict = page.locator(".feedback");
  // Still says the answer is right — this is not a wrong-answer treatment — but not the
  // unqualified "🎉" a clean correct answer gets.
  await expect(verdict).toHaveText("התשובה נכונה");
  await expect(verdict).not.toHaveText(/🎉/);
  await expect(verdict).toHaveClass(/correct-flagged/);
  await expect(verdict).not.toHaveClass(/\bcorrect\b(?!-flagged)/);

  const flag = page.locator(".teacher-reading-flag");
  await expect(flag).toBeVisible();
  await expect(flag).toContainText("שמתי לב שדילגת על שלב באמצע");
});

test("a wrong final answer with an errorPointer is unaffected — the flagged styling is only for a correct answer", async ({
  page,
}) => {
  await openLevel(page);
  await mockReading(page, 999999, "שמתי לב שדילגת על שלב באמצע.");
  await drawOnCanvas(page);
  await sendButton(page).click();

  await expect(page.locator(".feedback.wrong")).toBeVisible();
  await expect(page.locator(".feedback")).not.toHaveClass(/correct-flagged/);
  // The pointer line is still shown — just not in the amber "flag" styling reserved for a
  // correct-but-flawed process (a wrong answer already gets its own amber `.diagnosis`).
  await expect(page.locator(".teacher-reading-line").last()).toContainText("שמתי לב שדילגת על שלב באמצע");
  await expect(page.locator(".teacher-reading-flag")).toHaveCount(0);
});

test("a flagged-but-correct answer still counts as correct in the final score", async ({ page }) => {
  const answers = await harvestAllAnswers(page);

  await mockReading(page, answers[0], "שמתי לב שדילגת על שלב באמצע.");
  await drawOnCanvas(page);
  await sendButton(page).click();
  await expect(page.locator(".feedback.correct-flagged")).toBeVisible();
  await nextButton(page).click();

  // The rest of the lesson answered correctly the ordinary way (no errorPointer at all —
  // .feedback.correct-flagged only asserted on question 1 above, not re-checked here), so a
  // 100% at the end proves the flagged question was counted as a hit, not a miss.
  for (let i = 1; i < answers.length; i++) {
    await answerViaNotebook(page, answers[i]);
    await nextButton(page).click();
  }

  await expect(page.locator(".result")).toBeVisible();
  await expect(page.locator(".score")).toContainText("100%");
});

// ------------------------------------------------- סבב רוויזיה א׳ (2026-09-05)
// Acceptance criteria under test: product-spec.md, "Acceptance Criteria — עדכון (סבב
// רוויזיה א׳)".

test('"הסר דף" sits at the very far edge of the toolbar, past "נקה דף"', async ({ page }) => {
  await openLevel(page);
  const removeBox = await page.getByRole("button", { name: "הסר דף" }).boundingBox();
  const clearBox = await page.getByRole("button", { name: "נקה דף" }).boundingBox();
  const penBox = await page.getByRole("button", { name: "עט" }).boundingBox();
  if (!removeBox || !clearBox || !penBox) throw new Error("toolbar button not found");
  // RTL row: the pen/eraser/pan group sits at the row's start (largest x), and each button
  // further from it is further along in reading order (smaller x) — "הסר דף" is the very
  // last one, "נקה דף" the second-to-last.
  expect(clearBox.x).toBeLessThan(penBox.x);
  expect(removeBox.x).toBeLessThan(clearBox.x);
});

test("the page opens at a fixed 70% zoom with its top-left corner aligned to the stage's top-left corner, not centered", async ({
  page,
}) => {
  await openLevel(page);
  await expect(page.locator(".notebook-zoom-readout")).toHaveText("70%");

  const [tx, ty] = await page.locator(".notebook-stack").evaluate((el) => {
    const matrix = getComputedStyle(el).transform;
    const m = matrix.match(/matrix\(([^)]+)\)/);
    if (!m) return [NaN, NaN];
    const values = m[1].split(",").map(Number);
    return [values[4], values[5]];
  });
  expect(Math.abs(tx)).toBeLessThan(1);
  expect(Math.abs(ty)).toBeLessThan(1);
});

test("zoom and position are preserved across entering and leaving fullscreen", async ({ page }) => {
  await openLevel(page);
  // Zoom in once so the level is distinguishable from the 70% every question opens at —
  // otherwise "preserved" and "recomputed to the same default" would look identical.
  await page.getByRole("button", { name: "הגדל" }).click();
  const before = await page.locator(".notebook-zoom-readout").innerText();
  expect(before).not.toBe("70%");

  await page.getByRole("button", { name: "הגדילו את המחברת למסך מלא" }).click();
  await expect(page.locator(".notebook-zoom-readout")).toHaveText(before);

  // Not `getByRole(..., { name: "צאו ממסך מלא" })`: the zoom-controls fullscreen toggle
  // carries that same aria-label once fullscreen is on, alongside the compact strip's own
  // exit button — the class picks the strip's button specifically, unambiguously.
  await page.locator(".notebook-fullscreen-exit").click();
  await expect(page.locator(".notebook-zoom-readout")).toHaveText(before);
});

test('"הצג את כל הדף" zooms out to fit the whole page, and a second press restores the exact previous zoom', async ({
  page,
}) => {
  await openLevel(page);
  await page.getByRole("button", { name: "הגדל" }).click();
  const before = await page.locator(".notebook-zoom-readout").innerText();

  // Located by position, not by its own accessible name: that name flips between "הצגת כל
  // הדף" and "חזרה לזום הקודם" depending on state, so a locator built from one of those
  // names stops matching the moment the state (and the name) changes.
  const wholePageButton = page.locator(".notebook-zoom-controls button").nth(2);
  await expect(wholePageButton).toHaveAccessibleName("הצגת כל הדף");
  await wholePageButton.click();
  await expect(wholePageButton).toHaveAttribute("aria-pressed", "true");
  await expect(wholePageButton).toHaveAccessibleName("חזרה לזום הקודם");
  await expect(page.locator(".notebook-zoom-readout")).not.toHaveText(before);

  await wholePageButton.click();
  await expect(page.locator(".notebook-zoom-readout")).toHaveText(before);
  await expect(wholePageButton).toHaveAttribute("aria-pressed", "false");
  await expect(wholePageButton).toHaveAccessibleName("הצגת כל הדף");
});

test('"הצג את כל הדף" resets its own toggle state when the visible page changes, instead of carrying a stale restore point', async ({
  page,
}) => {
  // Whatever zoom the button leaves behind on the new page is not asserted here — a manual
  // zoom already persists across pages today (unrelated to this button), so the toggle's own
  // pressed/unpressed state is what must not lie about which page it's describing.
  await openLevel(page);
  await page.getByRole("button", { name: "הצגת כל הדף" }).click();
  await expect(page.getByRole("button", { name: "חזרה לזום הקודם" })).toBeVisible();

  await page.getByRole("button", { name: "דף חדש" }).click();

  await expect(page.getByRole("button", { name: "הצגת כל הדף" })).toBeVisible();
  await expect(page.getByRole("button", { name: "הצגת כל הדף" })).toHaveAttribute("aria-pressed", "false");
});
