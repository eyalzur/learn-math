import { test, expect, type Page } from "@playwright/test";
import { answerQuestion, waitForNextQuestionOrEnd } from "./helpers/answerQuestion";
import { createAndSelectStudent } from "./helpers/selectStudent";

/**
 * Acceptance criteria under test (docs/features/resume-interrupted-practice/product-spec.md):
 *
 *  1. "אותן שאלות שכבר הוצגו... בדיוק" — leaving before answering the question on screen,
 *     then returning, shows exactly that same question, not a freshly generated one
 *     (adaptive topic — the only kind where a question could be regenerated at all).
 *  2. "כניסה חדשה... ממשיכה אותה, שקט" — resuming is silent: no dialog/confirmation/extra
 *     screen appears, the practice screen is simply interactive again.
 *  3. "אותה ספירת נכון/לא-נכון של הריצה הזו" — the running tally survives an interruption
 *     and carries all the way into the final result.
 *  4. "מה קורה בסיום תקין" — a topic/style finished normally does not leave a resumable
 *     state; the next visit starts a brand-new run at question 1.
 *  5. "מעבר לנושא/רמה/סגנון אחר לפני שחוזרים לנקטע" — practising a different topic in
 *     between does not clear or corrupt the first topic's interrupted run.
 *  6. "התיישנות" — a saved run older than 24 hours is not offered back; the next visit is
 *     a fresh run, exactly as if nothing had been saved.
 *
 *  Covers both an adaptive topic (חיבור עד 100/חיסור עד 100, גרade ב׳) and a level/style
 *  topic (חיבור וחיסור עד 20, מיקה) — the spec applies to every practice entry point, not
 *  only adaptive ones. There is currently no topic in the app's real content reachable
 *  through the plain level picker ("levels" screen, `.level-card`) rather than either the
 *  adaptive or the style path — every non-adaptive topic today has >=2 styles (see
 *  src/data/style.ts's `hasStyleLessons`) — so that specific screen is not exercised here;
 *  the style path already covers the same "fixed, pre-built question array" code shape.
 */

async function open(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

/** Creating/selecting a student always lands on the grade picker, regardless of which
 *  grade the create-dialog's own `.grade-card-X` button set as their usual one — see
 *  tests/e2e/any-grade-any-student.spec.ts and tests/e2e/style-lessons.spec.ts's
 *  `openTopic`, both of which click a grade card as an explicit, separate step right
 *  after selecting the student. */
async function setupGradeB(page: Page) {
  await createAndSelectStudent(page, "2");
  await page.locator(".grade-card-2").click();
}

async function setupGradeA(page: Page) {
  await createAndSelectStudent(page);
  await page.locator(".grade-card-1").click();
}

async function enterAdd100(page: Page) {
  await page.locator(".topic-card", { hasText: "חיבור עד 100" }).click();
  await page.getByRole("button", { name: "דלג לתרגול →" }).click();
}

async function enterSub100(page: Page) {
  await page.locator(".topic-card", { hasText: "חיסור עד 100" }).click();
  await page.getByRole("button", { name: "דלג לתרגול →" }).click();
}

async function leavePractice(page: Page) {
  await page.getByRole("button", { name: "← חזרה" }).click();
}

/** מיקה's "חיבור וחיסור עד 20" (topic index 3 — see tests/e2e/style-lessons.spec.ts's own
 *  comment confirming the order) — a fixed, 15-question style lesson, never regenerated at
 *  random, picked wherever a test needs a short deterministic run it can actually finish. */
async function enterAddSub20(page: Page) {
  await page.locator(".topic-card").nth(3).click();
  await page.getByRole("button", { name: "דלג לתרגול →" }).click();
  await page.locator(".style-card").first().click();
}

/** Leaving (or finishing) a style lesson returns straight to that topic's style picker,
 *  not all the way to the topic list — `insideTopic()`/`Result`'s `onHome` land one level
 *  up, same place entry started past the topic card/lesson skip (see App.tsx's
 *  `insideTopic`). So resuming only needs the one click, not the whole entry sequence. */
async function reenterAddSub20(page: Page) {
  await page.locator(".style-card").first().click();
}

function progressLabel(page: Page) {
  return page.locator(".progress");
}

async function currentPrompt(page: Page): Promise<string> {
  return (await page.locator(".problem-text").innerText()).trim();
}

/** Works for both a bare addition ("23 + 4") and a bare subtraction ("23 − 4") prompt —
 *  every question used in this file is one of the two. */
function computeAnswer(prompt: string): number {
  const m = prompt.trim().match(/^(\d+)\s*([+−-])\s*(\d+)\s*=?$/);
  if (!m) throw new Error(`not a bare arithmetic prompt: "${prompt}"`);
  const [a, op, b] = [Number(m[1]), m[2], Number(m[3])];
  return op === "+" ? a + b : a - b;
}

/**
 * Answers the currently-shown question correctly and waits out the real 2s post-answer
 * celebration before the question advances on its own (Practice.tsx) — fine for a test
 * that only needs a handful of answers. See `answerCorrectlyFast` for a bulk finish.
 */
async function answerCorrectly(page: Page) {
  const value = computeAnswer(await currentPrompt(page));
  await answerQuestion(page, value);
  await waitForNextQuestionOrEnd(page);
}

/** Like `answerCorrectly`, but for a bulk finish where waiting out the real 2s delay for
 *  every question would be slow — the caller must have already called
 *  `page.clock.install()` (and only right before this loop starts, not any earlier — see
 *  tests/e2e/adaptive-lesson-start.spec.ts's own comment on why: once installed, a fake
 *  clock never auto-advances, so an earlier real-time helper call would just hang). */
async function answerCorrectlyFast(page: Page) {
  const value = computeAnswer(await currentPrompt(page));
  await answerQuestion(page, value);
  await page.clock.runFor(2000);
  await waitForNextQuestionOrEnd(page);
}

async function answerWrongly(page: Page) {
  // Any value that can't be the right answer to a bare two/three-digit sum/difference.
  await answerQuestion(page, 999999);
  await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
}

test.beforeEach(async ({ page }) => {
  await open(page);
});

test("leaving before answering the question on screen shows that exact same question again, not a new one", async ({
  page,
}) => {
  await setupGradeB(page);
  await enterAdd100(page);
  await answerCorrectly(page); // now on question 2, never answered yet
  const prompt = await currentPrompt(page);
  await expect(progressLabel(page)).toHaveText("שאלה 2 מתוך 20");

  await leavePractice(page);
  await enterAdd100(page);

  await expect(progressLabel(page)).toHaveText("שאלה 2 מתוך 20");
  await expect(page.locator(".problem-text")).toHaveText(prompt);
});

test("resuming is silent — no dialog or extra screen, the practice screen is simply interactive again", async ({
  page,
}) => {
  await setupGradeA(page);
  await enterAddSub20(page);
  await answerWrongly(page); // no clock needed, moves straight to question 2
  await expect(progressLabel(page)).toHaveText("שאלה 2 מתוך 15");

  await leavePractice(page);
  await reenterAddSub20(page);

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(progressLabel(page)).toHaveText("שאלה 2 מתוך 15");
  await expect(page.locator(".answer-input")).toBeEnabled();
});

test("the running tally survives an interruption and carries into the final result", async ({ page }) => {
  test.setTimeout(60000);
  await setupGradeA(page);
  await enterAddSub20(page);
  await answerCorrectly(page); // question 1: correct
  await answerWrongly(page); // question 2: wrong
  await expect(progressLabel(page)).toHaveText("שאלה 3 מתוך 15");

  await leavePractice(page);
  await reenterAddSub20(page);
  await expect(progressLabel(page)).toHaveText("שאלה 3 מתוך 15");

  // Installed only now, right before the bulk finish — not any earlier, where it would
  // just sit on top of the real (short) waits already used above. See
  // tests/e2e/adaptive-lesson-start.spec.ts's identical comment on this exact ordering.
  await page.clock.install();
  // Questions 3-15 (13 of them), all correct.
  for (let i = 0; i < 13; i++) {
    const resultVisible = await page.locator(".result").isVisible();
    if (resultVisible) break;
    await answerCorrectlyFast(page);
  }
  await expect(page.locator(".result")).toBeVisible();
  // 1 correct (before leaving) + 13 correct (after resuming) out of 15 — the single wrong
  // answer before leaving is still counted; nothing in the interrupted run was lost.
  await expect(page.locator(".score")).toHaveText("14 מתוך 15 נכונות (93%)");
});

test("a topic finished normally does not leave a resumable state — the next visit starts fresh", async ({
  page,
}) => {
  test.setTimeout(60000);
  await setupGradeA(page);
  await enterAddSub20(page);
  // One real-time answer first, same reasoning as above — the fake clock is only ever
  // installed once something has already rendered and settled for a moment, never as the
  // very first interaction on a freshly loaded page.
  await answerCorrectly(page);
  await page.clock.install();
  for (let i = 0; i < 14; i++) {
    if (await page.locator(".result").isVisible()) break;
    await answerCorrectlyFast(page);
  }
  await expect(page.locator(".result")).toBeVisible();
  await page.getByRole("button", { name: "חזרה לתפריט" }).click();

  await reenterAddSub20(page);
  await expect(progressLabel(page)).toHaveText("שאלה 1 מתוך 15");
});

test("practising a different topic in between does not clear or corrupt the first topic's interrupted run", async ({
  page,
}) => {
  await setupGradeB(page);
  await enterAdd100(page);
  await answerCorrectly(page);
  await answerCorrectly(page); // now on question 3, never answered yet
  const prompt = await currentPrompt(page);
  await expect(progressLabel(page)).toHaveText("שאלה 3 מתוך 20");
  await leavePractice(page);

  // A sibling adaptive topic, practised (but not finished) in between.
  await enterSub100(page);
  await answerCorrectly(page);
  await expect(progressLabel(page)).toHaveText("שאלה 2 מתוך 20");
  await leavePractice(page);

  await enterAdd100(page);
  await expect(progressLabel(page)).toHaveText("שאלה 3 מתוך 20");
  await expect(page.locator(".problem-text")).toHaveText(prompt);
});

test("a saved run older than 24 hours is not offered back — the next visit is a fresh run", async ({
  page,
}) => {
  await setupGradeB(page);
  await enterAdd100(page);
  await answerCorrectly(page); // writes a saved run at question 2, timestamped "now"
  await expect(progressLabel(page)).toHaveText("שאלה 2 מתוך 20");
  await leavePractice(page);

  // Simulates the same saved run having been written over 24 hours ago — not reachable by
  // waiting in a test, so the one saved record's timestamp is rewritten directly. Mirrors
  // the established pattern in tests/e2e/adaptive-lesson-start.spec.ts ("history from
  // before this feature") for simulating a time-based condition no UI action can produce.
  const studentId = await page.evaluate(() => localStorage.getItem("learn-math:student"));
  await page.evaluate((id) => {
    const all = JSON.parse(localStorage.getItem("learn-math:interrupted-session") ?? "{}");
    const key = `${id}:2:add100`;
    all[key].savedAt = Date.now() - 25 * 60 * 60 * 1000;
    localStorage.setItem("learn-math:interrupted-session", JSON.stringify(all));
  }, studentId);

  await page.goto("/learn-math/");
  await enterAdd100(page);
  await expect(progressLabel(page)).toHaveText("שאלה 1 מתוך 20");
});
