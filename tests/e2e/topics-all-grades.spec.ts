import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test
 * (docs/features/topics-all-grades/product-spec.md):
 *  1. Picking Rotem or Omer shows their grade's topics as buttons, not a static list.
 *  2. Grade 6 has its six topics; grade 8 has its six.
 *  3. Every topic in those grades has exactly three levels.
 *  4. Every level in grades 6 and 8 has exactly five questions.
 *  5. All three grades follow the same route: student → topic → level → practice.
 *  6. A level practises only its own topic — the whole point of the feature.
 *  7. History records topic, level and score for Rotem and Omer too.
 *  8. Grade 1 still works exactly as before (regression).
 */

const GRADE_6_TOPICS = [
  "שברים פשוטים",
  "שברים עשרוניים",
  "אחוזים",
  "יחס ופרופורציה",
  "שטח והיקף",
  "ממוצע",
];

const GRADE_8_TOPICS = [
  "ביטויים אלגבריים",
  "משוואות",
  "חזקות ושורשים",
  "משפט פיתגורס",
  "פונקציה קווית",
  "בעיות מילוליות",
];

/** Mika 0, Rotem 1, Omer 2. */
const ROTEM = 1;
const OMER = 2;

async function open(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

async function pickStudent(page: Page, index: number) {
  await page.locator(".student-card").nth(index).click();
}

test.beforeEach(async ({ page }) => {
  await open(page);
});

test("picking Rotem shows grade 6's topics as buttons", async ({ page }) => {
  await pickStudent(page, ROTEM);

  const cards = page.locator(".topic-card");
  await expect(cards).toHaveCount(GRADE_6_TOPICS.length);
  // Buttons, not a read-only list — the frustration the feature exists to remove.
  for (const title of GRADE_6_TOPICS) {
    await expect(page.locator(".topic-card", { hasText: title })).toHaveCount(1);
  }
  await expect(cards.first()).toBeEnabled();
});

test("picking Omer shows grade 8's topics as buttons", async ({ page }) => {
  await pickStudent(page, OMER);

  const cards = page.locator(".topic-card");
  await expect(cards).toHaveCount(GRADE_8_TOPICS.length);
  for (const title of GRADE_8_TOPICS) {
    await expect(page.locator(".topic-card", { hasText: title })).toHaveCount(1);
  }
  await expect(cards.first()).toBeEnabled();
});

for (const [name, index, topics] of [
  ["grade 6", ROTEM, GRADE_6_TOPICS],
  ["grade 8", OMER, GRADE_8_TOPICS],
] as const) {
  test(`every topic in ${name} has three levels of five questions`, async ({ page }) => {
    for (let t = 0; t < topics.length; t++) {
      await open(page);
      await pickStudent(page, index);
      await page.locator(".topic-card").nth(t).click();

      const levels = page.locator(".level-card");
      await expect(levels, `topic "${topics[t]}"`).toHaveCount(3);

      for (let l = 0; l < 3; l++) {
        await levels.nth(l).click();
        await expect(page.locator(".progress")).toContainText("מתוך 5");
        await page.getByRole("button", { name: "← חזרה" }).click();
      }
    }
  });
}

for (const [name, index, topics] of [
  ["grade 6", ROTEM, GRADE_6_TOPICS],
  ["grade 8", OMER, GRADE_8_TOPICS],
] as const) {
  test(`a level in ${name} practises only its own topic`, async ({ page }) => {
    // The reason the feature exists: a student who picks "אחוזים" must not be handed a
    // question about area. Checked against the data the app itself ships, because the
    // screen never names the topic of an individual question.
    const offenders = await page.evaluate(
      async ([gradeLabel]) => {
        const mod = await import("/learn-math/src/data/curriculum.ts");
        type Q = { id: string; topic: string };
        type G = {
          label: string;
          topicSets: { title: string; levels: { questions: Q[] }[] }[];
        };
        const grade = (mod.grades as G[]).find((g) => g.label === gradeLabel)!;
        const bad: string[] = [];
        for (const topic of grade.topicSets) {
          for (const level of topic.levels) {
            for (const q of level.questions) {
              if (q.topic !== topic.title) {
                bad.push(`${q.id}: "${q.topic}" sits under "${topic.title}"`);
              }
            }
          }
        }
        return bad;
      },
      [index === ROTEM ? "כיתה ו׳" : "כיתה ח׳"] as const,
    );

    expect(offenders).toEqual([]);
    expect(topics.length).toBe(6);
  });
}

test("all three grades follow the same student → topic → level → practice route", async ({
  page,
}) => {
  for (const index of [0, ROTEM, OMER]) {
    await open(page);
    await pickStudent(page, index);

    // Topics first, for every grade — no grade skips this step any more.
    await expect(page.locator(".topic-card").first()).toBeVisible();
    await page.locator(".topic-card").first().click();

    await expect(page.locator(".level-card").first()).toBeVisible();
    await page.locator(".level-card").first().click();

    await expect(page.locator(".answer-input")).toBeVisible();
  }
});

test("you can walk back from level to topic to student in grades 6 and 8", async ({
  page,
}) => {
  for (const index of [ROTEM, OMER]) {
    await open(page);
    await pickStudent(page, index);
    await page.locator(".topic-card").first().click();

    await page.getByRole("button", { name: "← חזרה" }).click();
    await expect(page.locator(".topic-card").first()).toBeVisible();

    await page.getByRole("button", { name: "← החלף תלמיד" }).click();
    await expect(page.locator(".student-card").first()).toBeVisible();
  }
});

for (const [name, index] of [
  ["Rotem", ROTEM],
  ["Omer", OMER],
] as const) {
  test(`finishing a level records the topic, level and score for ${name}`, async ({
    page,
  }) => {
    await pickStudent(page, index);
    const topicTitle = await page
      .locator(".topic-card")
      .first()
      .locator(".topic-title")
      .innerText();
    await page.locator(".topic-card").first().click();
    const levelTitle = await page
      .locator(".level-card")
      .first()
      .locator(".level-title")
      .innerText();
    await page.locator(".level-card").first().click();

    for (let i = 0; i < 5; i++) {
      await page.locator(".answer-input").fill("999999");
      await page.getByRole("button", { name: "בדיקה" }).click();
      await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
    }
    await expect(page.locator(".result")).toBeVisible();

    await page.reload();
    await page.getByRole("button", { name: "ההתקדמות שלי →" }).click();

    const row = page.locator(".history-row").first();
    await expect(row).toBeVisible();
    await expect(row.locator(".history-what")).toContainText(topicTitle);
    await expect(row.locator(".history-what")).toContainText(levelTitle);
    // Five, not ten — the score line is where the grade's own count shows up.
    await expect(row.locator(".history-score")).toHaveText("0/5");
  });
}

test("grade 1 still practises ten questions per level", async ({ page }) => {
  // Regression: the feature changed grades 6 and 8 only.
  await pickStudent(page, 0);
  await page.locator(".topic-card").first().click();
  await page.locator(".level-card").first().click();
  await expect(page.locator(".progress")).toContainText("מתוך 10");
});
