import { test, expect, type Page } from "@playwright/test";
import { grades } from "../../src/data/curriculum";

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
  "זוויות וחפיפת משולשים",
  "פונקציה קווית",
  "בעיות מילוליות",
];

/** Rotem 1, Omer 2. */
const ROTEM = 1;
const OMER = 2;

async function open(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

/** Every student now picks a grade first (docs/features/any-grade-any-student) — the
 *  grade card index each student's own tests here actually need. */
const GRADE_CARD_INDEX: Record<number, number> = { 0: 0, [ROTEM]: 2, [OMER]: 3 };

async function pickStudent(page: Page, index: number) {
  await page.locator(".student-card").nth(index).click();
  await page.locator(".grade-card").nth(GRADE_CARD_INDEX[index]).click();
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

test("grade 1's written levels still hold ten questions each", () => {
  // This used to walk "חיבור עד 10" through the UI, since it was the one topic still
  // entered by level. docs/features/mika-adaptive-difficulty converted it (and חיסור עד
  // 10 alongside it) to adaptive — every one of grade 1's topics now enters by style or
  // adaptively, so there is no level screen left to click through. Same move
  // content.spec.ts's own comment already describes for criteria 3/4/6 above: a
  // statement about the data is checked against the data once walking the UI to reach it
  // stops being possible.
  const grade1 = grades.find((g) => g.id === "1")!;
  const wrongSize: string[] = [];
  for (const topic of grade1.topicSets) {
    for (const level of topic.levels) {
      if (level.questions.length !== 10) {
        wrongSize.push(`${topic.title}/${level.id} has ${level.questions.length}`);
      }
    }
  }
  expect(wrongSize, `\n${wrongSize.join("\n")}\n`).toEqual([]);
});
