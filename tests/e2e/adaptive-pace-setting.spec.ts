import { test, expect, type Page } from "@playwright/test";
import { answerQuestion } from "./helpers/answerQuestion";
import { createAndSelectStudent } from "./helpers/selectStudent";

/**
 * Acceptance criteria under test (docs/features/adaptive-pace-setting/product-spec.md),
 * and the screen/flow they were built against (design.md).
 *
 * Not automated here: the numeric thresholds for the remaining 18 adaptive topics besides
 * חיבור עד 1000 — they all share the one `nextAdaptiveDifficulty` function this feature
 * added (architecture.md), so this suite exercises that shared mechanism through one real
 * topic rather than re-proving the same arithmetic 19 times.
 */

async function toGradeB(page: Page): Promise<string> {
  const name = await createAndSelectStudent(page);
  await page.locator(".grade-card").nth(1).click(); // כיתה ב׳
  return name;
}

/** After a reload, remembered state can land back on the topic grid directly or one step
 *  behind it. */
async function backToTopics(page: Page) {
  const onTopics = () => page.locator(".topic-grid").count();
  for (let i = 0; i < 3 && (await onTopics()) === 0; i++) {
    await page.getByRole("button", { name: "← חזרה" }).click();
    await page.waitForTimeout(150);
  }
  await expect(page.locator(".topic-grid")).toBeVisible();
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

function paceOption(page: Page, label: "אטי" | "בינוני" | "מהיר") {
  return page.locator(".pace-option", { hasText: new RegExp(`^${label}$`) });
}

async function choosePace(page: Page, label: "אטי" | "בינוני" | "מהיר") {
  await openSettings(page);
  await paceOption(page, label).click();
  await closeSettings(page);
}

/** `"47 + 8 ="` → `[47, 8]`. Every add100 question, written or generated, is this shape —
 *  same helper `adaptive-difficulty.spec.ts` uses to detect which difficulty tier a
 *  question came from without reading the generator's source. */
function operands(prompt: string): [number, number] {
  const m = prompt.trim().match(/^(\d+)\s*\+\s*(\d+)\s*=?$/);
  if (!m) throw new Error(`not a bare addition: "${prompt}"`);
  return [Number(m[1]), Number(m[2])];
}

const needsCarrying = ([a, b]: [number, number]) => (a % 10) + (b % 10) >= 10;

async function currentPrompt(page: Page): Promise<[number, number]> {
  return operands(await page.locator(".problem-text").innerText());
}

/** A correct answer advances on its own (docs/features/scored-answer-practice/) — no
 *  "הבא" button for that path, unlike a wrong one — same pattern as
 *  adaptive-difficulty.spec.ts's own `answer` helper. */
async function answer(page: Page, value: number) {
  await answerQuestion(page, value);
  const nextButton = page.getByRole("button", { name: /^(הבא|סיום)$/ });
  if (await nextButton.count()) {
    await nextButton.click();
  } else {
    await page.waitForTimeout(800);
  }
}

async function answerCorrect(page: Page) {
  const [a, b] = await currentPrompt(page);
  await answer(page, a + b);
}

async function answerWrong(page: Page) {
  const [a, b] = await currentPrompt(page);
  await answer(page, a + b + 1000);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
});

// -------------------------------------------------- the setting itself

test("the pace picker appears in ⚙️ with three options, בינוני chosen by default", async ({ page }) => {
  await createAndSelectStudent(page);
  await page.locator(".grade-card").first().click();
  await openSettings(page);

  await expect(paceOption(page, "אטי")).toBeVisible();
  await expect(paceOption(page, "בינוני")).toBeVisible();
  await expect(paceOption(page, "מהיר")).toBeVisible();
  await expect(page.locator('.pace-option[aria-pressed="true"]')).toHaveText("בינוני");
});

test("choosing a pace marks it immediately and survives a reload", async ({ page }) => {
  await createAndSelectStudent(page);
  await page.locator(".grade-card").first().click();
  await choosePace(page, "אטי");

  await page.reload();
  await backToTopics(page);
  await openSettings(page);
  await expect(page.locator('.pace-option[aria-pressed="true"]')).toHaveText("אטי");
});

test("the setting belongs to the student, not the device", async ({ page }) => {
  const first = await createAndSelectStudent(page);
  await page.locator(".grade-card").first().click();
  await choosePace(page, "מהיר");

  await page.getByRole("button", { name: "← חזרה" }).click();
  await page.getByRole("button", { name: "← החלף תלמיד" }).click();
  const second = await createAndSelectStudent(page);
  expect(second).not.toBe(first);
  await page.locator(".grade-card").first().click();

  // Untouched for this (second) student, so still the default.
  await openSettings(page);
  await expect(page.locator('.pace-option[aria-pressed="true"]')).toHaveText("בינוני");
});

// -------------------------------------------------- it actually changes the pace

test("'מהיר' climbs difficulty within a couple of correct answers", async ({ page }) => {
  await toGradeB(page);
  await choosePace(page, "מהיר");
  await page.locator(".topic-card", { hasText: "חיבור עד 1000" }).click();
  await page.getByRole("button", { name: "דלג לתרגול →" }).click();

  const carries: boolean[] = [];
  for (let i = 0; i < 5; i++) {
    carries.push(needsCarrying(await currentPrompt(page)));
    await answerCorrect(page);
  }
  expect(carries.some(Boolean), "'מהיר' (climbs after 1 correct) never reached a harder question").toBe(true);
});

test("'אטי' does not climb difficulty before four correct answers in a row", async ({ page }) => {
  await toGradeB(page);
  await choosePace(page, "אטי");
  await page.locator(".topic-card", { hasText: "חיבור עד 1000" }).click();
  await page.getByRole("button", { name: "דלג לתרגול →" }).click();

  // Three correct in a row is one short of 'אטי''s threshold (4) — difficulty must stay at
  // its easiest tier throughout, exactly like a run of wrong answers does
  // (adaptive-difficulty.spec.ts's equivalent assertion for the default pace).
  const firstThree: boolean[] = [];
  for (let i = 0; i < 3; i++) {
    firstThree.push(needsCarrying(await currentPrompt(page)));
    await answerCorrect(page);
  }
  expect(firstThree.some(Boolean), "'אטי' climbed before reaching 4 correct in a row").toBe(false);

  // The 4th correct answer completes the threshold — difficulty does climb eventually,
  // proving the mechanism isn't simply stuck (same loose "some, over several rounds"
  // check adaptive-difficulty.spec.ts already uses for the default pace).
  const rest: boolean[] = [];
  for (let i = 0; i < 8; i++) {
    rest.push(needsCarrying(await currentPrompt(page)));
    await answerCorrect(page);
  }
  expect(rest.some(Boolean), "'אטי' never climbed even after reaching 4 correct in a row").toBe(true);
});

// Skipped: both tests below need to open ⚙️ while a practice session is already active
// (to switch pace mid-session, without restarting). That UI path no longer exists on
// `main` — docs/features/scored-answer-practice/ replaced the notebook toolbar, which was
// the only place `onOpenSettings` was reachable from inside Practice.tsx (confirmed: no
// screen passes `onOpenSettings` to <Practice>, only TopicPicker and History do, both
// outside an active session). This is a pre-existing gap in `main`, not introduced by this
// PR, and it affects every ⚙️ setting mid-practice, not just pace — flagged to the user
// rather than silently worked around or force-passed.
test.skip("'אטי' does not drop difficulty after a single wrong answer", async ({ page }) => {
  await toGradeB(page);
  await choosePace(page, "מהיר"); // climb fast first, so there's something to protect from dropping
  await page.locator(".topic-card", { hasText: "חיבור עד 1000" }).click();

  let climbed = false;
  for (let i = 0; i < 6 && !climbed; i++) {
    climbed = needsCarrying(await currentPrompt(page));
    await answerCorrect(page);
  }
  expect(climbed, "setup: never reached a harder question to test dropping from").toBe(true);

  // Switch to 'אטי' mid-session (no restart) and answer wrong exactly once — 'אטי' needs
  // two wrong in a row before dropping, so difficulty should still sometimes be at the
  // harder tier right after.
  await openSettings(page);
  await paceOption(page, "אטי").click();
  await closeSettings(page);
  await answerWrong(page);

  const afterOneWrong: boolean[] = [];
  for (let i = 0; i < 4; i++) {
    afterOneWrong.push(needsCarrying(await currentPrompt(page)));
    await answerCorrect(page);
  }
  expect(afterOneWrong.some(Boolean), "'אטי' dropped to the easiest tier after only one wrong answer").toBe(
    true,
  );
});

test.skip("switching pace takes effect on the very next answer, without restarting the session", async ({ page }) => {
  await toGradeB(page);
  await choosePace(page, "אטי");
  await page.locator(".topic-card", { hasText: "חיבור עד 1000" }).click();

  // Two correct under 'אטי' (short of its threshold of 4) ...
  await answerCorrect(page);
  await answerCorrect(page);

  // ... then switch to 'מהיר' (threshold 1) without leaving the practice screen.
  await openSettings(page);
  await paceOption(page, "מהיר").click();
  await closeSettings(page);

  // One more correct answer should now be enough to climb, proving the switch applied
  // immediately to the session already in progress (design.md, "נכנס לתוקף מיד"). Several
  // rounds, not one: the harder tier reached doesn't need carrying on every single
  // question, only more often than the easiest tier does (same style as the other
  // threshold tests above).
  const carries: boolean[] = [];
  for (let i = 0; i < 6; i++) {
    carries.push(needsCarrying(await currentPrompt(page)));
    await answerCorrect(page);
  }
  expect(carries.some(Boolean), "the new pace never took effect on the already-open session").toBe(true);
});
