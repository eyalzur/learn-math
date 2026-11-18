import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test (docs/features/struggle-diagnosis/product-spec.md).
 *
 * Seeds `learn-math:history` directly to set up each scenario deterministically — the same
 * technique tests/e2e/adaptive-lesson-start.spec.ts already uses to test history-dependent
 * behavior without having to actually play dozens of practices through the UI first.
 */

const ROTEM = 1;
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

function record(daysAgo: number, correct: number, overrides: Partial<Record_> = {}): Record_ {
  return {
    at: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
    studentId: "rotem",
    gradeLabel: GRADE_LABEL,
    topicTitle: TOPIC,
    levelTitle: "",
    correct,
    total: 10,
    ...overrides,
  };
}

async function openHistoryWithSeededRecords(page: Page, records: Record_[]) {
  await page.goto("/learn-math/");
  await page.evaluate((recs) => {
    localStorage.clear();
    localStorage.setItem("learn-math:history", JSON.stringify(recs));
  }, records);
  await page.goto("/learn-math/");
  await page.locator(".student-card").nth(ROTEM).click();
  await page.getByRole("button", { name: "ההתקדמות שלי →" }).click();
  await expect(page.locator(".history h1")).toHaveText("ההתקדמות שלי");
}

function stuckCard(page: Page) {
  return page.locator(".stuck-topic-card");
}

test("a topic with three straight practices under 70% is flagged", async ({ page }) => {
  await openHistoryWithSeededRecords(page, [record(2, 2), record(1, 3), record(0, 2)]); // 20%, 30%, 20%

  await expect(stuckCard(page)).toHaveCount(1);
  await expect(stuckCard(page)).toContainText(`נראה ש${TOPIC} קצת מאתגר השבוע`);
  await expect(stuckCard(page).getByRole("button", { name: "לתרגל עכשיו" })).toBeVisible();
});

test("fewer than three practices of the topic: not flagged", async ({ page }) => {
  await openHistoryWithSeededRecords(page, [record(1, 2), record(0, 2)]); // only 2 practices, both 20%

  await expect(stuckCard(page)).toHaveCount(0);
});

test("one good practice among the last three breaks the streak", async ({ page }) => {
  // The most recent of the three is 80% — above the 70% threshold — so the topic should not
  // be flagged even though the two before it were bad.
  await openHistoryWithSeededRecords(page, [record(2, 2), record(1, 2), record(0, 8)]);

  await expect(stuckCard(page)).toHaveCount(0);
});

test("no stuck topic: the history screen looks exactly as it does today", async ({ page }) => {
  await openHistoryWithSeededRecords(page, [record(0, 9)]); // a single good practice

  await expect(stuckCard(page)).toHaveCount(0);
  await expect(page.locator(".history-row")).toHaveCount(1);
});

test("an empty history still shows the existing empty state, with no stuck-topic card", async ({ page }) => {
  await openHistoryWithSeededRecords(page, []);

  await expect(stuckCard(page)).toHaveCount(0);
  await expect(page.locator(".history-empty")).toBeVisible();
});

test("'לתרגל עכשיו' starts practice on that exact topic, even with no grade chosen yet", async ({ page }) => {
  await page.goto("/learn-math/");
  await page.evaluate(
    (recs) => {
      localStorage.clear();
      localStorage.setItem("learn-math:history", JSON.stringify(recs));
    },
    [record(2, 2), record(1, 3), record(0, 2)],
  );
  await page.goto("/learn-math/");
  await page.locator(".student-card").nth(ROTEM).click();
  // The grade-picker screen's own "ההתקדמות שלי" link — reached before any grade is chosen.
  await page.getByRole("button", { name: "ההתקדמות שלי →" }).click();

  await stuckCard(page).getByRole("button", { name: "לתרגל עכשיו" }).click();

  await expect(page.getByRole("heading", { name: TOPIC })).toBeVisible();
  await expect(page.locator(".problem-text")).toBeVisible();
});

test("the card disappears once a recent practice brings the topic back above 70%", async ({ page }) => {
  // Same three bad practices as the first test, but with a 4th, good and most recent,
  // practice added — only the last three count, so the oldest (bad) one falls out of the
  // window entirely.
  await openHistoryWithSeededRecords(page, [record(3, 2), record(2, 3), record(1, 2), record(0, 9)]);

  await expect(stuckCard(page)).toHaveCount(0);
});
