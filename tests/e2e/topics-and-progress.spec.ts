import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test
 * (docs/features/topics-and-progress/product-spec.md):
 *  1. Picking a student shows that grade's topics as buttons.
 *  2. Picking a topic shows three levels for it.
 *  3. Picking a level practises only that topic and level.
 *  4. Grade 1 has three levels per topic and ten questions per level.
 *  5. You can walk back level -> topic -> student.
 *  6. Finishing a practice records date, topic, level and score.
 *  7. History survives a reload.
 *  8. Each student's history is their own.
 *  9. History is reachable and shows newest first.
 * 10. An empty history says so rather than showing a blank screen.
 */

const MIKA = 0;
const ROTEM = 1;

async function open(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

async function playLevel(page: Page, answerWith: string) {
  const total = Number((await page.locator(".progress").innerText()).match(/מתוך (\d+)/)![1]);
  for (let i = 0; i < total; i++) {
    await page.locator(".answer-input").fill(answerWith);
    await page.getByRole("button", { name: "בדיקה" }).click();
    await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
  }
  return total;
}

test.beforeEach(async ({ page }) => {
  await open(page);
});

test("picking a student shows the grade's topics, and a topic leads somewhere to practise", async ({
  page,
}) => {
  await page.locator(".student-card").nth(MIKA).click();
  // Mika now has two grades available; this suite is entirely about her grade 1 (א׳).
  await page.locator(".grade-card").first().click();

  await expect(page.locator(".topic-picker h1")).toHaveText("מה נתרגל היום?");
  const topics = page.locator(".topic-card");
  await expect(topics).toHaveCount(5);
  await expect(topics.first().locator(".topic-title")).not.toBeEmpty();

  // A topic card shows its name and nothing else — the level count told a child
  // nothing they could act on, and every card said the same number anyway.
  await expect(topics.first()).toHaveText(
    await topics.first().locator(".topic-title").innerText(),
  );

  // A topic leads to a level, a style, or straight into practice (an adaptive topic,
  // docs/features/mika-adaptive-difficulty) — which one is this test's sibling below.
  await topics.nth(1).click();
  const landed =
    (await page.locator(".level-card").count()) ||
    (await page.locator(".style-card").count()) ||
    (await page.locator(".problem-text").count());
  expect(landed, "picking a topic opened on nothing").toBeGreaterThan(0);
});

test("grade 1 has three levels of ten questions for every topic", async ({ page }) => {
  // Only the topics that still offer levels — the ones holding a single kind of question.
  // The rest are entered by style and run however many that style has; style-lessons
  // covers them.
  await page.locator(".student-card").nth(MIKA).click();
  await page.locator(".grade-card").first().click();
  const topicCount = await page.locator(".topic-card").count();
  expect(topicCount).toBe(5);

  for (let t = 0; t < topicCount; t++) {
    await page.locator(".topic-card").nth(t).click();
    const levels = page.locator(".level-card");
    if (!(await levels.count())) {
      const styles = page.locator(".style-card");
      if (await styles.count()) {
        await expect(styles.first()).toBeVisible();
      } else {
        // No style, no level: an adaptive topic (docs/features/mika-adaptive-difficulty)
        // lands straight on practice instead.
        await expect(page.locator(".problem-text")).toBeVisible();
      }
      await page.getByRole("button", { name: "← חזרה" }).click();
      continue;
    }
    await expect(levels).toHaveCount(3);

    for (let l = 0; l < 3; l++) {
      await expect(levels.nth(l).locator(".level-count")).toHaveText("10 שאלות");
      await levels.nth(l).click();
      await expect(page.locator(".progress")).toContainText("מתוך 10");
      await page.getByRole("button", { name: "← חזרה" }).click();
    }
    await page.getByRole("button", { name: "← חזרה" }).click();
  }
});

/**
 * Enters the lesson chooser a topic actually shows, and reports the chosen lesson's name.
 *
 * Grade 1's multi-style topics are entered by style; a written-level topic still by
 * level; an adaptive topic (docs/features/mika-adaptive-difficulty) is already on
 * practice with nothing to pick, and no level/style name to report (same empty
 * `levelTitle` an adaptive topic already records in history). Tests that are about
 * history or navigation do not care which of the three it was — they care that a lesson
 * was entered and what it was called.
 */
async function enterFirstLesson(page: Page): Promise<string> {
  const style = page.locator(".style-card").first();
  if (await page.locator(".style-card").count()) {
    const title = await style.locator(".style-title").innerText();
    await style.click();
    return title;
  }
  const level = page.locator(".level-card").first();
  if (await page.locator(".level-card").count()) {
    const title = await level.locator(".level-title").innerText();
    await level.click();
    return title;
  }
  return "";
}

test("a level practises only its own topic", async ({ page }) => {
  // Every question in "חיסור עד 10" must be a subtraction — the whole point of choosing
  // a topic is not getting a mixed sample. Adaptive now (docs/features/mika-adaptive-
  // difficulty), so it lands straight on practice with no level to pick.
  await page.locator(".student-card").nth(MIKA).click();
  await page.locator(".grade-card").first().click();
  await page.getByText("חיסור עד 10", { exact: true }).click();

  for (let i = 0; i < 10; i++) {
    const prompt = await page.locator(".problem-text").innerText();
    expect(prompt, `"${prompt}" is not a subtraction`).toContain("−");
    await page.locator(".answer-input").fill("0");
    await page.getByRole("button", { name: "בדיקה" }).click();
    await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
  }
});

test("you can walk back from level to topic to student", async ({ page }) => {
  await page.locator(".student-card").nth(MIKA).click();
  await page.locator(".grade-card").first().click();
  await page.locator(".topic-card").first().click();
  await expect(page.locator(".style-card, .level-card").first()).toBeVisible();

  await page.getByRole("button", { name: "← חזרה" }).click();
  await expect(page.locator(".topic-card")).toHaveCount(5);

  // One more "back" than before this feature: Mika's topics screen now leads to the
  // grade picker first, not straight to switching student — "← חזרה", not "← החלף
  // תלמיד", since the history link (and the switch-student label with it) sits on the
  // grade screen for her now, not duplicated here too.
  await page.getByRole("button", { name: "← חזרה" }).click();
  await expect(page.getByRole("heading", { name: "באיזו כיתה מתרגלים היום?" })).toBeVisible();

  await page.getByRole("button", { name: "← החלף תלמיד" }).click();
  await expect(page.locator(".student-card")).toHaveCount(3);
});

test("an empty history says so instead of showing a blank screen", async ({ page }) => {
  await page.locator(".student-card").nth(MIKA).click();
  await page.getByRole("button", { name: "ההתקדמות שלי →" }).click();

  await expect(page.locator(".history h1")).toHaveText("ההתקדמות שלי");
  await expect(page.locator(".history-empty")).toBeVisible();
  await expect(page.locator(".history-row")).toHaveCount(0);
});

test("finishing a practice records the topic, level and score, and it survives a reload", async ({
  page,
}) => {
  await page.locator(".student-card").nth(MIKA).click();
  await page.locator(".grade-card").first().click();
  const topicTitle = await page.locator(".topic-card").first().locator(".topic-title").innerText();
  await page.locator(".topic-card").first().click();
  const levelTitle = await enterFirstLesson(page);

  const total = await playLevel(page, "999999");
  await expect(page.locator(".result")).toBeVisible();

  // A reload doesn't resume inside the finished practice or its result screen
  // (docs/features/any-grade-any-student) — it resumes at the deepest *menu* screen
  // reached along the way, which for this topic is its style/level picker, one screen
  // short of the topics list (and its history link) the same way "history is newest
  // first" below already accounts for.
  await page.reload();
  if (!(await page.locator(".topic-card").count())) {
    await page.getByRole("button", { name: "← חזרה" }).click();
  }
  await page.getByRole("button", { name: "ההתקדמות שלי →" }).click();

  const row = page.locator(".history-row").first();
  await expect(row).toBeVisible();
  await expect(row.locator(".history-what")).toContainText(topicTitle);
  await expect(row.locator(".history-what")).toContainText(levelTitle);
  await expect(row.locator(".history-score")).toHaveText(`0/${total}`);
  await expect(row.locator(".history-when")).not.toBeEmpty();
});

test("history is newest first", async ({ page }) => {
  await page.locator(".student-card").nth(MIKA).click();
  await page.locator(".grade-card").first().click();

  for (const topicIndex of [0, 1]) {
    await page.locator(".topic-card").nth(topicIndex).click();
    await enterFirstLesson(page);
    await playLevel(page, "999999");
    await page.getByRole("button", { name: "חזרה לתפריט" }).click();
    // A style-based or written-level topic lands one screen short of the topics list
    // (styles/levels), needing one more "← חזרה"; an adaptive topic
    // (docs/features/mika-adaptive-difficulty) goes there directly, so only click again
    // if the topics list is not already showing.
    if (!(await page.locator(".topic-card").count())) {
      await page.getByRole("button", { name: "← חזרה" }).click();
    }
  }

  const second = await page.locator(".topic-card").nth(1).locator(".topic-title").innerText();
  await page.getByRole("button", { name: "ההתקדמות שלי →" }).click();

  await expect(page.locator(".history-row")).toHaveCount(2);
  await expect(page.locator(".history-row").first().locator(".history-what")).toContainText(
    second,
  );
});

test("each student's history is their own", async ({ page }) => {
  await page.locator(".student-card").nth(MIKA).click();
  await page.locator(".grade-card").first().click();
  await page.locator(".topic-card").first().click();
  await enterFirstLesson(page);
  await playLevel(page, "999999");
  await page.getByRole("button", { name: "חזרה לתפריט" }).click();
  await page.getByRole("button", { name: "← חזרה" }).click();
  // Mika's topics screen leads to the grade picker first ("← חזרה"), and switching
  // student happens from there ("← החלף תלמיד") — one more step than a single-grade
  // student, since her "back" and "switch student" are no longer the same click.
  await page.getByRole("button", { name: "← חזרה" }).click();
  await page.getByRole("button", { name: "← החלף תלמיד" }).click();

  // Rotem's grade still practises straight from levels, and his history starts empty.
  await page.locator(".student-card").nth(ROTEM).click();
  await page.getByRole("button", { name: "ההתקדמות שלי →" }).click();
  await expect(page.locator(".history-empty")).toBeVisible();

  await page.getByRole("button", { name: "← חזרה" }).click();
  await page.getByRole("button", { name: "← החלף תלמיד" }).click();
  // Mika's grade choice from earlier in this test is still remembered (survives exactly
  // like the student choice does), so this lands straight back on her topics screen.
  await page.locator(".student-card").nth(MIKA).click();
  await page.getByRole("button", { name: "ההתקדמות שלי →" }).click();
  await expect(page.locator(".history-row")).toHaveCount(1);
});
