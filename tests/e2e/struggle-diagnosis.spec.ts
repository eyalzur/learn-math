import { test, expect, type Page } from "@playwright/test";
import { createAndSelectStudent } from "./helpers/selectStudent";

/**
 * Acceptance criteria under test (docs/features/struggle-diagnosis/product-spec.md).
 *
 * Seeds `learn-math:history` directly (after creating a real student through the UI, so
 * its id is a real `crypto.randomUUID()` read back from `learn-math:users` rather than
 * guessed) to set up each scenario deterministically — the same technique
 * tests/e2e/adaptive-lesson-start.spec.ts already uses to test history-dependent behavior
 * without having to actually play dozens of practices through the UI first.
 */

const TOPIC = "אחוזים";
const GRADE_LABEL = "כיתה ו׳";

type Record_ = {
  at: string;
  studentId: string;
  gradeLabel: string;
  topicTitle: string;
  levelTitle: string;
  correct: number;
  total: number;
};

function record(studentId: string, daysAgo: number, correct: number, overrides: Partial<Record_> = {}): Record_ {
  return {
    at: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
    studentId,
    gradeLabel: GRADE_LABEL,
    topicTitle: TOPIC,
    levelTitle: "",
    correct,
    total: 10,
    ...overrides,
  };
}

/** Creates a real student (grade ו׳, so its home grade matches `TOPIC`'s own
 *  `GRADE_LABEL`), reads back its real id, and seeds `learn-math:history` with it. */
async function createStudentWithHistory(page: Page, records: (studentId: string) => Record_[]): Promise<string> {
  const name = await createAndSelectStudent(page, "6");
  const studentId: string = await page.evaluate(() => {
    const users = JSON.parse(localStorage.getItem("learn-math:users") ?? "[]");
    return users[users.length - 1].id;
  });
  await page.evaluate((recs) => {
    localStorage.setItem("learn-math:history", JSON.stringify(recs));
  }, records(studentId));
  return name;
}

async function openHistory(page: Page) {
  await page.getByRole("button", { name: "ההתקדמות שלי →" }).click();
  await expect(page.locator(".history h1")).toHaveText("ההתקדמות שלי");
}

function stuckCard(page: Page) {
  return page.locator(".stuck-topic-card");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
});

test("a topic with three straight practices under 70% is flagged", async ({ page }) => {
  await createStudentWithHistory(page, (id) => [record(id, 2, 2), record(id, 1, 3), record(id, 0, 2)]); // 20%, 30%, 20%
  await openHistory(page);

  await expect(stuckCard(page)).toHaveCount(1);
  await expect(stuckCard(page)).toContainText(`נראה ש${TOPIC} קצת מאתגר השבוע`);
  await expect(stuckCard(page).getByRole("button", { name: "לתרגל עכשיו" })).toBeVisible();
});

test("fewer than three practices of the topic: not flagged", async ({ page }) => {
  await createStudentWithHistory(page, (id) => [record(id, 1, 2), record(id, 0, 2)]); // only 2 practices, both 20%
  await openHistory(page);

  await expect(stuckCard(page)).toHaveCount(0);
});

test("one good practice among the last three breaks the streak", async ({ page }) => {
  // The most recent of the three is 80% — above the 70% threshold — so the topic should not
  // be flagged even though the two before it were bad.
  await createStudentWithHistory(page, (id) => [record(id, 2, 2), record(id, 1, 2), record(id, 0, 8)]);
  await openHistory(page);

  await expect(stuckCard(page)).toHaveCount(0);
});

test("no stuck topic: the history screen looks exactly as it does today", async ({ page }) => {
  await createStudentWithHistory(page, (id) => [record(id, 0, 9)]); // a single good practice
  await openHistory(page);

  await expect(stuckCard(page)).toHaveCount(0);
  await expect(page.locator(".history-row")).toHaveCount(1);
});

test("an empty history still shows the existing empty state, with no stuck-topic card", async ({ page }) => {
  await createAndSelectStudent(page, "6");
  await openHistory(page);

  await expect(stuckCard(page)).toHaveCount(0);
  await expect(page.locator(".history-empty")).toBeVisible();
});

test("'לתרגל עכשיו' starts practice on that exact topic, even with no grade chosen yet", async ({ page }) => {
  await createStudentWithHistory(page, (id) => [record(id, 2, 2), record(id, 1, 3), record(id, 0, 2)]);
  // The grade-picker screen's own "ההתקדמות שלי" link — reached before any grade is chosen.
  await openHistory(page);

  await stuckCard(page).getByRole("button", { name: "לתרגל עכשיו" }).click();

  await expect(page.getByRole("heading", { name: TOPIC })).toBeVisible();
  await expect(page.locator(".problem-text")).toBeVisible();
});

test("the card disappears once a recent practice brings the topic back above 70%", async ({ page }) => {
  // Same three bad practices as the first test, but with a 4th, good and most recent,
  // practice added — only the last three count, so the oldest (bad) one falls out of the
  // window entirely.
  await createStudentWithHistory(page, (id) => [
    record(id, 3, 2),
    record(id, 2, 3),
    record(id, 1, 2),
    record(id, 0, 9),
  ]);
  await openHistory(page);

  await expect(stuckCard(page)).toHaveCount(0);
});
