import { test, expect, type Page } from "@playwright/test";
import {
  answerUncertainly,
  answerViaNotebook,
  drawOnCanvas,
  mockTeacherCommunicationFailure,
  mockTeacherReadingSequence,
} from "./helpers/notebookAnswer";

/**
 * Acceptance criteria under test (docs/features/notebook-teacher-feedback/product-spec.md
 * and design.md) — telling the teacher her reading of the page was wrong, and getting an
 * updated one back.
 *
 * playwright.config.ts points VITE_NOTEBOOK_SERVER_URL at a fixed, unresolvable host, so
 * every /read-page request in this file is intercepted — no real network call, and
 * certainly no real (paid) call to Claude, ever happens in this suite.
 *
 * Not covered here, and can't be by an e2e test against a mocked server: "התיאור נאמן
 * למה שבאמת נכתב בדף" after a correction — that's a promise about what Claude actually
 * does, not about what the client displays.
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

function correctionLinkUncertain(page: Page) {
  return page.getByRole("button", { name: "ספרו למורה מה כתבתם" });
}

function correctionLinkConfident(page: Page) {
  return page.getByRole("button", { name: "המורה טעתה? ספרו לה מה קרה" });
}

function correctionInput(page: Page) {
  return page.getByRole("textbox", { name: "מה באמת כתבתם?" });
}

function correctionSendButton(page: Page) {
  return page.getByRole("button", { name: /^שליחה למורה$|^המורה קוראת\.\.\.$/ });
}

function correctionCancelButton(page: Page) {
  return page.getByRole("button", { name: "ביטול" });
}

async function submitCorrection(page: Page, text: string) {
  await correctionInput(page).fill(text);
  await correctionSendButton(page).click();
}

/** Learns the first question's actual correct answer from a deliberately wrong pass, then
 *  reopens the level fresh on the same question — same harvesting technique
 *  notebook-default-practice.spec.ts already uses, needed here because a mocked reading's
 *  `finalAnswer` is only "correct" if it matches whatever `question.answer` really is for
 *  the question the suite happens to land on. */
async function learnCorrectAnswer(page: Page): Promise<number> {
  await openLevel(page);
  await answerViaNotebook(page, 999999);
  const feedback = await page.locator(".feedback.wrong").innerText();
  const correct = Number(feedback.match(/(-?\d+(?:\.\d+)?)\s*$/)![1]);
  await openLevel(page);
  return correct;
}

// ------------------------------------------------- the link is offered, without hiding anything

test("after an uncertain reading, a correction link appears alongside the existing rewrite-on-page option", async ({
  page,
}) => {
  await openLevel(page);
  await answerUncertainly(page);

  await expect(correctionLinkUncertain(page)).toBeVisible();
  // The existing way (erase and rewrite, then send again) still works, untouched.
  await expect(sendButton(page)).toBeEnabled();
  await expect(correctionLinkConfident(page)).toHaveCount(0);
});

test("after a confident wrong reading, a correction link appears next to the teacher's note", async ({ page }) => {
  await openLevel(page);
  await answerViaNotebook(page, 999999);

  await expect(page.locator(".feedback.wrong")).toBeVisible();
  await expect(correctionLinkConfident(page)).toBeVisible();
});

test("a correction link appears even when the confident reading was already marked correct — the reading itself can still be wrong", async ({
  page,
}) => {
  const correct = await learnCorrectAnswer(page);

  await answerViaNotebook(page, correct);

  await expect(page.locator(".feedback.correct")).toBeVisible();
  await expect(correctionLinkConfident(page)).toBeVisible();
});

// --------------------------------------------------------------- opening, typing, cancelling

test("opening the correction link shows a free-text field whose send button stays disabled until something is typed", async ({
  page,
}) => {
  await openLevel(page);
  await answerUncertainly(page);

  await correctionLinkUncertain(page).click();
  await expect(correctionInput(page)).toBeVisible();
  await expect(correctionSendButton(page)).toBeDisabled();

  await correctionInput(page).fill("כתבתי 7 ועניתי 12");
  await expect(correctionSendButton(page)).toBeEnabled();
});

test("cancelling the correction form sends nothing and returns to the link, unchanged", async ({ page }) => {
  await openLevel(page);
  await answerUncertainly(page);
  let requests = 0;
  await page.unroute("**/read-page").catch(() => {});
  await page.route("**/read-page", (route) => {
    requests++;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ reading: { certain: false } }) });
  });

  await correctionLinkUncertain(page).click();
  await correctionInput(page).fill("משהו שלא בסוף נשלח");
  await correctionCancelButton(page).click();

  await expect(correctionInput(page)).toHaveCount(0);
  await expect(correctionLinkUncertain(page)).toBeVisible();
  expect(requests).toBe(0);
});

// ------------------------------------------------------------- sending a correction, both directions

test("correcting an uncertain reading sends the page again and shows the confident result that comes back", async ({
  page,
}) => {
  await openLevel(page);
  await mockTeacherReadingSequence(page, [
    { certain: false },
    { certain: true, processReflection: "ראיתי שכתבת `7 + 5` וקיבלת `12`, אחרי שהסברת לי.", finalAnswer: 12 },
  ]);
  await drawOnCanvas(page);
  await sendButton(page).click();
  await expect(page.getByText("לא הצלחתי לקרוא את זה בבירור")).toBeVisible();

  await correctionLinkUncertain(page).click();
  await submitCorrection(page, "כתבתי 7 + 5 ועניתי 12");

  const panel = page.locator(".teacher-reading");
  await expect(panel).toBeVisible();
  await expect(panel.locator("h3")).toHaveText("מה המורה הבינה עכשיו");
  await expect(panel).toContainText("אחרי שהסברת לי");
  // The correction form itself is gone once a reading (confident or not) comes back.
  await expect(correctionInput(page)).toHaveCount(0);
});

test("correcting a confident wrong reading can flip it to correct — feedback, the wrong-answer explanation, and the countdown all follow the new verdict", async ({
  page,
}) => {
  const correct = await learnCorrectAnswer(page);
  const wrong = correct + 1000;
  await mockTeacherReadingSequence(page, [
    { certain: true, processReflection: `ראיתי שכתבת וקיבלת \`${wrong}\`.`, finalAnswer: wrong },
    { certain: true, processReflection: `ראיתי שוב, וזו בעצם \`${correct}\`.`, finalAnswer: correct },
  ]);
  await drawOnCanvas(page);
  await sendButton(page).click();
  await expect(page.locator(".feedback.wrong")).toBeVisible();
  await expect(page.locator(".explanation")).toBeVisible();
  await expect(page.locator(".countdown")).toHaveCount(0);

  await correctionLinkConfident(page).click();
  await submitCorrection(page, "לא, כתבתי 12 לא 13");

  await expect(page.locator(".feedback.correct")).toBeVisible();
  await expect(page.locator(".feedback.wrong")).toHaveCount(0);
  await expect(page.locator(".explanation")).toHaveCount(0);
  await expect(page.locator(".teacher-reading h3")).toHaveText("מה המורה הבינה עכשיו");
});

test("correcting a confident correct reading can flip it to wrong — the countdown stops and the explanation flow takes over", async ({
  page,
}) => {
  const correct = await learnCorrectAnswer(page);
  const wrong = correct + 1000;
  await mockTeacherReadingSequence(page, [
    { certain: true, processReflection: `ראיתי שכתבת וקיבלת \`${correct}\`.`, finalAnswer: correct },
    { certain: true, processReflection: `ראיתי שוב, וזו בעצם \`${wrong}\`.`, finalAnswer: wrong },
  ]);
  await drawOnCanvas(page);
  await sendButton(page).click();
  await expect(page.locator(".feedback.correct")).toBeVisible();

  await correctionLinkConfident(page).click();
  // Opening the form must stop any countdown toward the next question — a corrected
  // verdict must not be yanked away from under the student mid-correction.
  await expect(page.locator(".countdown")).toHaveCount(0);
  await submitCorrection(page, `לא, כתבתי ${wrong}`);

  await expect(page.locator(".feedback.wrong")).toBeVisible();
  await expect(page.locator(".feedback.correct")).toHaveCount(0);
  await expect(page.locator(".countdown")).toHaveCount(0);
});

test("a correction that comes back still uncertain returns to the uncertain state, with no limit on how many times this can happen", async ({
  page,
}) => {
  const correct = await learnCorrectAnswer(page);
  await mockTeacherReadingSequence(page, [
    { certain: false },
    { certain: false },
    { certain: true, processReflection: `עכשיו כן הבנתי, וקיבלת \`${correct}\`.`, finalAnswer: correct },
  ]);
  await drawOnCanvas(page);
  await sendButton(page).click();

  await correctionLinkUncertain(page).click();
  await submitCorrection(page, "כתבתי 7 + 5");
  // Still uncertain: back to the plain uncertain state, form closed, link available again.
  await expect(page.getByText("לא הצלחתי לקרוא את זה בבירור")).toBeVisible();
  await expect(correctionInput(page)).toHaveCount(0);
  await expect(correctionLinkUncertain(page)).toBeVisible();
  await expect(page.locator(".teacher-reading")).toHaveCount(0);

  await correctionLinkUncertain(page).click();
  await submitCorrection(page, "התשובה היא 12");

  await expect(page.locator(".teacher-reading")).toBeVisible();
  await expect(page.locator(".feedback.correct")).toBeVisible();
});

// --------------------------------------------------------------------- failures and content

test("a failed call while sending a correction shows a distinct error and keeps the typed text, without closing the form", async ({
  page,
}) => {
  await openLevel(page);
  await answerUncertainly(page);
  await correctionLinkUncertain(page).click();
  await mockTeacherCommunicationFailure(page);

  await submitCorrection(page, "כתבתי 7 + 5 ועניתי 12");

  const error = page.getByText("לא הצלחנו לשלוח את התיקון. נסו שוב.");
  await expect(error).toBeVisible();
  await expect(error).toHaveAttribute("aria-live", "polite");
  await expect(correctionInput(page)).toHaveValue("כתבתי 7 + 5 ועניתי 12");
  await expect(correctionSendButton(page)).toBeEnabled();
  // The rest of the notebook keeps working while this is up.
  await expect(page.getByRole("button", { name: "עט" })).toBeEnabled();
});

test("the free-text correction is sent back to the teacher along with the page", async ({ page }) => {
  await openLevel(page);
  await answerUncertainly(page);
  await correctionLinkUncertain(page).click();

  let sentBody = "";
  await page.unroute("**/read-page").catch(() => {});
  await page.route("**/read-page", (route) => {
    sentBody = route.request().postData() ?? "";
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ reading: { certain: true, processReflection: "הבנתי.", finalAnswer: 12 } }),
    });
  });
  await submitCorrection(page, "כתבתי שבע ועוד חמש, ועניתי שתים עשרה");

  await expect(page.locator(".teacher-reading")).toBeVisible();
  expect(sentBody).toContain("כתבתי שבע ועוד חמש, ועניתי שתים עשרה");
});

// ------------------------------------------------------------------------------- fullscreen

test("the correction link stays reachable in fullscreen for an uncertain reading, and opening it exits fullscreen for the form", async ({
  page,
}) => {
  await openLevel(page);
  await page.getByRole("button", { name: "הגדילו את המחברת למסך מלא" }).click();
  await answerUncertainly(page);

  const fullscreenBox = page.locator(".notebook-screen.fullscreen");
  await expect(fullscreenBox).toBeVisible();
  await expect(fullscreenBox.getByRole("button", { name: "ספרו למורה מה כתבתם" })).toBeVisible();

  await correctionLinkUncertain(page).click();

  await expect(page.locator(".notebook-screen.fullscreen")).toHaveCount(0);
  await expect(correctionInput(page)).toBeVisible();
});
