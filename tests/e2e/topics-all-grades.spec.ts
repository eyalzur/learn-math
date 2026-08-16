import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test
 * (docs/features/topics-all-grades/product-spec.md):
 *  1. Picking Rotem or Omer shows their grade's topics, not a static list.
 *  2. Grade 6 has its six topics; grade 8 has its six.
 *  8. Grade 1 still works exactly as before (regression).
 *
 * Criteria 3, 4 and 6 — three levels, five questions each, and every question sitting
 * under its own topic — are content, and moved to `content.spec.ts` where they are
 * checked against the data. They were always statements about the data; walking the UI
 * to reach them was the long way round, and it stopped working once review-status began
 * blocking unreviewed topics.
 *
 * Criteria 5 and 7 — the full route and history — can no longer be exercised for grades 6
 * and 8, because those grades are blocked until someone reviews them. Both are covered
 * for grade 1 in `topics-and-progress.spec.ts`, and the route is one code path shared by
 * every grade. This is a real, named reduction in coverage rather than a silent one: when
 * a grade is marked reviewed, these are worth restoring for it.
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
const MIKA = 0;
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

for (const [name, index, topics] of [
  ["grade 6", ROTEM, GRADE_6_TOPICS],
  ["grade 8", OMER, GRADE_8_TOPICS],
] as const) {
  test(`picking ${name}'s student shows that grade's six topics`, async ({ page }) => {
    await pickStudent(page, index);

    // Shown as cards either way — whether they can be opened is review-status's business,
    // and it has its own spec. What matters here is that the syllabus reached the screen.
    await expect(page.locator(".topic-card")).toHaveCount(topics.length);
    for (const title of topics) {
      await expect(page.locator(".topic-card", { hasText: title })).toHaveCount(1);
    }
  });
}

test("grade 1 still practises ten questions per level", async ({ page }) => {
  // "חיבור עד 10" holds one kind of question, so it is still entered by level — which is
  // what this test is about. The topics that hold several kinds are entered by style and
  // run however many questions that style has; style-lessons.spec.ts covers those.
  await pickStudent(page, MIKA);
  await page.locator(".topic-card", { hasText: "חיבור עד 10" }).click();
  await page.locator(".level-card").first().click();

  await expect(page.locator(".progress")).toContainText("מתוך 10");
});
