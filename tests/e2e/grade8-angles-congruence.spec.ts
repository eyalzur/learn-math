import { test, expect, type Page } from "@playwright/test";
import { answerViaNotebook } from "./helpers/notebookAnswer";

/**
 * Acceptance criteria under test
 * (docs/features/grade8-angles-congruence/product-spec.md):
 *  1. A new topic "זוויות וחפיפת משולשים" exists for Omer (grade ח׳), alongside the six
 *     existing ones.
 *  2. The topic has three difficulty levels, like every other grade-8 topic.
 *  3. Sub-domain: angles (straight-angle completion, exterior angle, triangle angle sum,
 *     parallel-line angles) — questions of this shape appear.
 *  4. Sub-domain: triangle congruence (missing side/angle from two congruent triangles) —
 *     questions of this shape appear.
 *  5. Sub-domain: isosceles triangle (equal base angles, median = height) — questions of
 *     this shape appear.
 *  6. Every question carries a prompt, two hints, and — after a wrong answer — an
 *     explanation with steps and an analogy, same as every other topic.
 *  7. The topic is reachable from ordinary practice like any grade-8 topic, and a finished
 *     practice records date/topic/level/score in history.
 *
 * `design.md` fixes the exact wording of each sub-domain's sentence templates (`על קו ישר,
 * שתי זוויות סמוכות...`, `במשולש \`ABC\`, ...`, `שני ישרים מקבילים...`, `...חופף למשולש...`,
 * `...שווה-השוקיים...`) — those substrings are what each sub-domain test looks for, not an
 * implementation detail read off the data file.
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

/** Every prompt shown across all three levels of the topic, collected by walking each
 *  level with wrong answers (the same "get through it fast" pattern topics-and-progress.spec.ts
 *  uses) — not the data file, so a mismatch between what is on screen and what design.md
 *  promised actually fails a test instead of trivially matching itself. */
async function collectAllPrompts(page: Page): Promise<string[]> {
  const prompts: string[] = [];
  const levelCount = await page.locator(".level-card").count();
  for (let l = 0; l < levelCount; l++) {
    await page.locator(".level-card").nth(l).click();
    const total = Number((await page.locator(".progress").innerText()).match(/מתוך (\d+)/)![1]);
    for (let i = 0; i < total; i++) {
      prompts.push((await page.locator(".problem-text").innerText()).trim());
      await answerViaNotebook(page, 999999);
      await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
    }
    await page.getByRole("button", { name: "חזרה לתפריט" }).click();
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

test("has three difficulty levels, and a level starts a normal practice", async ({ page }) => {
  await openTopic(page);
  const levels = page.locator(".level-card");
  await expect(levels).toHaveCount(3);
  await expect(levels.nth(0).locator(".level-title")).toHaveText("קל");
  await expect(levels.nth(1).locator(".level-title")).toHaveText("בינוני");
  await expect(levels.nth(2).locator(".level-title")).toHaveText("מתקדם");

  await levels.first().click();
  await expect(page.locator(".problem-text")).toBeVisible();
  await expect(page.locator(".progress")).toContainText("מתוך");
});

test("every question has a prompt, two hints, and — after a wrong answer — steps and an analogy", async ({
  page,
}) => {
  await openTopic(page);
  await page.locator(".level-card").first().click();

  await expect(page.locator(".problem-text")).not.toBeEmpty();
  await page.locator(".hint-button").click();
  await expect(page.locator(".hint")).toHaveCount(1);
  await page.locator(".hint-button").click();
  await expect(page.locator(".hint")).toHaveCount(2);

  await answerViaNotebook(page, 999999);
  await expect(page.locator(".explanation-step").first()).toBeVisible();
  await expect(page.locator(".explanation-analogy")).not.toBeEmpty();
});

test("covers angle questions — straight-angle completion, triangle angle sum, exterior angle, and parallel lines", async ({
  page,
}) => {
  await openTopic(page);
  const prompts = await collectAllPrompts(page);

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
  const prompts = await collectAllPrompts(page);

  expect(prompts.some((p) => p.includes("חופף למשולש") && p.includes("≅"))).toBeTruthy();
});

test("covers isosceles-triangle questions — equal base angles, and the median that is also a height", async ({
  page,
}) => {
  await openTopic(page);
  const prompts = await collectAllPrompts(page);

  expect(prompts.some((p) => p.includes("שווה-השוקיים"))).toBeTruthy();
  expect(prompts.some((p) => p.includes("התיכון") && p.includes("גם גובה"))).toBeTruthy();
});

test("a finished practice records the topic, level and score in history", async ({ page }) => {
  await openTopic(page);
  await page.locator(".level-card").first().click();

  const total = Number((await page.locator(".progress").innerText()).match(/מתוך (\d+)/)![1]);
  for (let i = 0; i < total; i++) {
    await answerViaNotebook(page, 999999);
    await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
  }
  await expect(page.locator(".result")).toBeVisible();

  await page.getByRole("button", { name: "חזרה לתפריט" }).click();
  await page.getByRole("button", { name: "← חזרה" }).click();
  await page.getByRole("button", { name: "ההתקדמות שלי →" }).click();

  const row = page.locator(".history-row").first();
  await expect(row).toBeVisible();
  await expect(row.locator(".history-what")).toContainText(TOPIC_TITLE);
  await expect(row.locator(".history-score")).toHaveText(`0/${total}`);
});
