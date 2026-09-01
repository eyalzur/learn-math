import { test, expect, type Page } from "@playwright/test";
import { answerViaNotebook } from "./helpers/notebookAnswer";

/**
 * Acceptance criteria under test
 * (docs/features/grade8-angles-congruence/product-spec.md, revised 2026-09-01 — סבב ב׳):
 *  1. A new topic "זוויות וחפיפת משולשים" exists for Omer (grade ח׳), alongside the six
 *     existing ones.
 *  2. The topic is adaptive, like every other grade-8 topic (docs/features/
 *     levels-as-practice/, docs/features/difficulty-number-scaling/): entering it skips
 *     the level picker entirely and lands straight on practice, 20 questions long.
 *  3. Difficulty responds to real-time success, the same principle as every other adaptive
 *     topic in the app.
 *  4. Sub-domain: angles (straight-angle completion, exterior angle, triangle angle sum,
 *     parallel-line angles) — questions of this shape appear.
 *  5. Sub-domain: triangle congruence (missing side/angle from two congruent triangles) —
 *     questions of this shape appear.
 *  6. Sub-domain: isosceles triangle (equal base angles, median = height) — questions of
 *     this shape appear.
 *  7. Every question carries a prompt, two hints, and — after a wrong answer — an
 *     explanation with steps and an analogy, same as every other topic.
 *  8. The topic is reachable from ordinary practice like any grade-8 topic, and a finished
 *     practice records date/topic/score in history.
 *
 * `design.md` fixes the exact wording of each sub-domain's sentence templates (`על קו ישר,
 * שתי זוויות סמוכות...`, `במשולש \`ABC\`, ...`, `שני ישרים מקבילים...`, `...חופף למשולש...`,
 * `...שווה-השוקיים...`) and `product-spec.md` fixes the underlying rule for each (a straight
 * line is `180°`, a triangle's angles sum to `180°`, congruent triangles' corresponding
 * parts are equal, an isosceles triangle's base angles are equal and its apex median is
 * also its height) — `computeAnswer` below re-derives the expected answer from those
 * stated rules, not from reading the generator's source.
 */

// Every student now picks a grade first (docs/features/any-grade-any-student) — Omer is
// the third student card, and ח׳ is his fourth grade card (same index used throughout the
// suite, e.g. topics-all-grades.spec.ts, more-diagrams-wave2.spec.ts).
const OMER_STUDENT_INDEX = 2;
const OMER_GRADE_CARD_INDEX = 3;
const TOPIC_TITLE = "זוויות וחפיפת משולשים";

async function open(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

async function openOmerTopics(page: Page) {
  await open(page);
  await page.locator(".student-card").nth(OMER_STUDENT_INDEX).click();
  await page.locator(".grade-card").nth(OMER_GRADE_CARD_INDEX).click();
}

async function openTopic(page: Page) {
  await openOmerTopics(page);
  await page.locator(".topic-card", { hasText: TOPIC_TITLE }).click();
}

/** Pulls the number right after a fixed anchor phrase — targeted, so a prompt with more
 *  than one degree value in it (e.g. the fixed "90°" total alongside the actual known
 *  angle) never picks up the wrong one by relying on reading order. `null` if the anchor
 *  isn't in this prompt at all.
 *
 *  Reads from `.problem-text`'s rendered `innerText()`, not the raw `prompt` data string
 *  — the backticks that mark an expression for RTL isolation (`segmented()`) are display
 *  markup, stripped from what actually reaches the DOM. Anchors here are written without
 *  them for exactly that reason. */
function after(prompt: string, anchor: string): number | null {
  const m = prompt.match(new RegExp(anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(\\d+)"));
  return m ? Number(m[1]) : null;
}

/**
 * The answer product-spec.md's own rules say this prompt must have — independent of
 * however the generator actually computes it. Returns `null` for a prompt shape this
 * helper doesn't recognize (there should be none, given design.md's fixed templates).
 */
function computeAnswer(prompt: string): number | null {
  // Both straight-angle sub-patterns state the known angle the same way; only the total
  // (180° for a plain straight line, 90° for two named-complementary angles) differs.
  const known = after(prompt, "אחת מהן ");
  if (prompt.includes("קו ישר") && known !== null) return 180 - known; // a straight line is 180°
  if (prompt.includes("משלימות") && known !== null) return 90 - known; // complementary to 90°

  const angleA = after(prompt, "∡A = ");
  const angleB = after(prompt, "∡B = ");
  if (prompt.includes("הזווית החיצונית") && angleA !== null && angleB !== null) {
    return angleA + angleB; // exterior = sum of remote interior angles
  }
  if (prompt.includes("∡C") && angleA !== null && angleB !== null) {
    return 180 - angleA - angleB; // triangle angles sum to 180°
  }

  if (prompt.includes("מקבילים")) {
    const parallelKnown = after(prompt, "היא ");
    if (parallelKnown === null) return null;
    return prompt.includes("החד-צדדית") ? 180 - parallelKnown : parallelKnown; // co-interior supplementary, else equal
  }

  if (prompt.includes("חופף למשולש")) {
    const m = prompt.match(/(?:AB|∡A) = (\d+)/);
    return m ? Number(m[1]) : null; // congruent triangles' corresponding parts are equal
  }

  if (prompt.includes("שווה-השוקיים")) {
    const baseGiven = after(prompt, "זווית הבסיס ∡B = ");
    const apexGiven = after(prompt, "זווית הראש ∡A = ");
    if (prompt.includes("∡BAD") && baseGiven !== null) return 90 - baseGiven; // the median-as-height right angle
    if (prompt.includes("זווית הראש ∡A?") && baseGiven !== null) return 180 - 2 * baseGiven; // apex from base
    if (prompt.includes("זווית הבסיס ∡B?") && apexGiven !== null) return (180 - apexGiven) / 2; // base from apex
  }

  return null;
}

async function currentPrompt(page: Page): Promise<string> {
  return (await page.locator(".problem-text").innerText()).trim();
}

async function answerAndNext(page: Page, value: number) {
  await answerViaNotebook(page, value);
  await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
}

/** Plays through one full 20-question session, answering correctly whenever
 *  `computeAnswer` recognizes the prompt (climbing difficulty as design.md/product-spec.md
 *  say it should) and with a guaranteed-wrong number otherwise, collecting every prompt
 *  seen. Assumes the topic screen is already open with no level picker in the way. */
async function playSession(page: Page): Promise<string[]> {
  const prompts: string[] = [];
  const total = Number((await page.locator(".progress").innerText()).match(/מתוך (\d+)/)![1]);
  for (let i = 0; i < total; i++) {
    const prompt = await currentPrompt(page);
    prompts.push(prompt);
    const answer = computeAnswer(prompt);
    await answerAndNext(page, answer ?? -999999);
  }
  return prompts;
}

/** Plays `count` full sessions back to back, re-entering the topic each time, and returns
 *  every prompt seen across all of them. A single 20-question run climbs difficulty but
 *  still picks randomly *within* each tier (`pick()` in `adaptiveAngles.ts`) — with two or
 *  three patterns sharing a tier, one run can easily spend its few questions at that tier
 *  on the other pattern by chance. Several runs make that coincidence not decide the test. */
async function playSessions(page: Page, count: number): Promise<string[]> {
  const prompts: string[] = [];
  for (let s = 0; s < count; s++) {
    if (s > 0) {
      await page.getByRole("button", { name: "חזרה לתפריט" }).click();
      await page.locator(".topic-card", { hasText: TOPIC_TITLE }).click();
    }
    prompts.push(...(await playSession(page)));
  }
  return prompts;
}

test.beforeEach(async ({ page }) => {
  await open(page);
});

test("appears in Omer's grade-8 topic list alongside the six existing topics", async ({ page }) => {
  await openOmerTopics(page);
  await expect(page.locator(".topic-card")).toHaveCount(7);
  await expect(page.locator(".topic-card", { hasText: TOPIC_TITLE })).toHaveCount(1);
});

test("skips the level picker and lands straight on a 20-question practice", async ({ page }) => {
  await openTopic(page);
  await expect(page.locator(".level-card")).toHaveCount(0);
  await expect(page.locator(".problem-text")).toBeVisible();
  await expect(page.locator(".progress")).toContainText("מתוך 20");
});

test("every question has a prompt, two hints, and — after a wrong answer — steps and an analogy", async ({
  page,
}) => {
  await openTopic(page);

  await expect(page.locator(".problem-text")).not.toBeEmpty();
  await page.locator(".hint-button").click();
  await expect(page.locator(".hint")).toHaveCount(1);
  await page.locator(".hint-button").click();
  await expect(page.locator(".hint")).toHaveCount(2);

  await answerViaNotebook(page, -999999);
  await expect(page.locator(".explanation-step").first()).toBeVisible();
  await expect(page.locator(".explanation-analogy")).not.toBeEmpty();
});

test("a streak of correct answers reaches triangle-congruence questions, a streak of wrong answers never does", async ({
  page,
}) => {
  // A congruence prompt ("חופף למשולש") only shows up once difficulty has climbed a few
  // tiers — never at the opening difficulty every session starts at.
  await openTopic(page);
  const wrongRunPrompts: string[] = [];
  for (let i = 0; i < 20; i++) {
    const prompt = await currentPrompt(page);
    wrongRunPrompts.push(prompt);
    await answerAndNext(page, -999999);
  }
  expect(wrongRunPrompts.some((p) => p.includes("חופף למשולש")), "a streak of wrong answers still reached congruence").toBe(
    false,
  );
  await expect(page.locator(".result")).toBeVisible();

  await page.getByRole("button", { name: "חזרה לתפריט" }).click();
  await page.locator(".topic-card", { hasText: TOPIC_TITLE }).click();
  const correctRunPrompts = await playSession(page);
  expect(correctRunPrompts.some((p) => p.includes("חופף למשולש")), "a streak of correct answers never reached congruence").toBe(
    true,
  );
});

test("covers angle questions — straight-angle completion, triangle angle sum, exterior angle, and parallel lines", async ({
  page,
}) => {
  await openTopic(page);
  const prompts = await playSessions(page, 3);

  expect(prompts.some((p) => p.includes("קו ישר"))).toBeTruthy();
  expect(prompts.some((p) => p.includes("משלימות"))).toBeTruthy();
  expect(prompts.some((p) => p.includes("∡A") && p.includes("∡B") && p.includes("∡C"))).toBeTruthy();
  expect(prompts.some((p) => p.includes("הזווית החיצונית"))).toBeTruthy();
  expect(prompts.some((p) => p.includes("מקבילים"))).toBeTruthy();
});

test("covers congruent-triangle questions — a missing side or angle from a stated congruence", async ({
  page,
}) => {
  await openTopic(page);
  const prompts = await playSessions(page, 3);

  expect(prompts.some((p) => p.includes("חופף למשולש") && p.includes("≅"))).toBeTruthy();
});

test("covers isosceles-triangle questions — equal base angles, and the median that is also a height", async ({
  page,
}) => {
  await openTopic(page);
  const prompts = await playSessions(page, 3);

  expect(prompts.some((p) => p.includes("שווה-השוקיים"))).toBeTruthy();
  expect(prompts.some((p) => p.includes("התיכון") && p.includes("גם גובה"))).toBeTruthy();
});

test("a finished practice records the topic and score in history", async ({ page }) => {
  await openTopic(page);
  for (let i = 0; i < 20; i++) {
    await answerAndNext(page, -999999);
  }
  await expect(page.locator(".result")).toBeVisible();

  await page.getByRole("button", { name: "חזרה לתפריט" }).click();
  await page.getByRole("button", { name: "← חזרה" }).click();
  await page.getByRole("button", { name: "ההתקדמות שלי →" }).click();

  const row = page.locator(".history-row").first();
  await expect(row).toBeVisible();
  await expect(row.locator(".history-what")).toContainText(TOPIC_TITLE);
  await expect(row.locator(".history-score")).toHaveText("0/20");
});
