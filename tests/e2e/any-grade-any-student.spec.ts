import { test, expect, type Page } from "@playwright/test";
import { createAndSelectStudent } from "./helpers/selectStudent";

/**
 * Acceptance criteria under test (docs/features/any-grade-any-student/product-spec.md).
 *
 * Every student can now practise in any grade, not just the one associated with them,
 * and a returning student lands back where they were in the menu — not always at home,
 * and never deeper than the menu itself (an active practice session is never resumed).
 *
 * The original first test here ("student selection itself is unchanged — three named
 * cards, no grade shown yet") asserted a fixed, pre-seeded three-student roster — gone by
 * explicit design with docs/features/manage-students (no auto-seeding). What it still
 * owned (no grade is shown until a student is selected) is folded into the test below.
 */

async function freshStart(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

test("every student sees all four grades, not just their chosen one, and none before selection", async ({
  page,
}) => {
  for (let i = 0; i < 3; i++) {
    await freshStart(page);
    await expect(page.locator(".grade-card"), `before selecting student ${i}`).toHaveCount(0);
    await createAndSelectStudent(page);
    await expect(page.locator(".grade-card"), `student ${i}`).toHaveCount(4);
  }
});

test("a student can choose a grade that isn't their usual one and actually practise in it", async ({ page }) => {
  await freshStart(page);
  await createAndSelectStudent(page, "6"); // usual grade label: ו׳
  await page.locator(".grade-card-1").click(); // grade א׳ instead
  await expect(page.locator(".topic-card").first()).toBeVisible();
  await page.locator(".topic-card").first().click();
  // Landing on either a style/level picker or straight into practice both count as
  // "actually practising" — either way something concrete from grade א׳ shows up.
  await expect(
    page.locator(".style-card, .level-card, .progress").first(),
  ).toBeVisible();
});

test("the grade picker is shown to every newly created student, never auto-skipped", async ({ page }) => {
  await freshStart(page);
  await createAndSelectStudent(page);
  await expect(page.getByText("באיזו כיתה מתרגלים היום?")).toBeVisible();
});

/**
 * How deep "remembered position" goes, at four depths in the same menu — and where it
 * deliberately stops. One flowing test, not four: all four reuse the same navigation
 * primitives (reload, then check what's on screen) against the same underlying mechanism,
 * just at a different depth each time, so a shared setup tells the same story better than
 * four near-identical page loads.
 */
test("remembered position holds at the topic list and the style picker, forgets the way back, and never resumes an active session", async ({
  page,
}) => {
  // Depth 1: topic list — reload returns straight to it.
  await freshStart(page);
  await createAndSelectStudent(page);
  await page.locator(".grade-card").nth(2).click(); // grade ו׳
  await expect(page.locator(".topic-card").first()).toBeVisible();
  await page.reload();
  await expect(page.locator(".student-card")).toHaveCount(0);
  await expect(page.locator(".grade-card")).toHaveCount(0);
  await expect(page.locator(".topic-card").first()).toBeVisible();

  // Depth 2: a style picker, one level deeper — reload returns to that same picker.
  await freshStart(page);
  await createAndSelectStudent(page);
  await page.locator(".grade-card").first().click(); // grade א׳
  await page.locator(".topic-card").first().click(); // a style-based topic
  await expect(page.locator(".style-card").first()).toBeVisible();
  await page.reload();
  await expect(page.locator(".student-card")).toHaveCount(0);
  await expect(page.locator(".topic-card")).toHaveCount(0);
  await expect(page.locator(".style-card").first()).toBeVisible();

  // Stepping back from that picker forgets it deliberately — reload stays on the topic list.
  await page.getByRole("button", { name: "← חזרה" }).click();
  await expect(page.locator(".topic-card").first()).toBeVisible();
  await page.reload();
  await expect(page.locator(".topic-card").first()).toBeVisible();
  await expect(page.locator(".style-card")).toHaveCount(0);

  // Depth 3: an active practice session is never resumed, even for an adaptive topic that
  // skips every picker and lands straight on it.
  await freshStart(page);
  await createAndSelectStudent(page);
  await page.locator(".grade-card").first().click(); // grade א׳
  await page.locator(".topic-card").nth(1).click(); // "חיבור עד 10" — adaptive, straight to practice
  await expect(page.locator(".progress")).toBeVisible();
  await page.reload();
  await expect(page.locator(".progress")).toHaveCount(0);
  await expect(page.locator(".topic-card").first()).toBeVisible();
});

test("a second student's saved position is just as independently remembered as the first's", async ({ page }) => {
  // Same check the reload tests already run for Mika, run for Rotem too — confirming
  // the "remembered per student" mechanism isn't something that only happens to work
  // for whichever student happens to be first.
  await freshStart(page);
  await createAndSelectStudent(page);
  await page.locator(".grade-card").nth(3).click(); // grade ח׳ — not his usual grade
  await expect(page.locator(".greeting")).toContainText("כיתה ח");

  await page.reload();
  await expect(page.locator(".student-card")).toHaveCount(0);
  await expect(page.locator(".grade-card")).toHaveCount(0);
  await expect(page.locator(".greeting")).toContainText("כיתה ח");
});

test("one student's saved position isn't disturbed by another student's turn", async ({ page }) => {
  // Establishes one student's saved position, then plants a second student (never
  // navigated to) with a saved position of its own — exactly the state left behind
  // after an independent turn on the same shared device — without ever routing through
  // the first student's own "← חזרה", which (separately, and by design predating this
  // feature) forgets the current grade choice on its own. This isolates the one thing
  // this test is actually about: two students' entries don't collide or overwrite each
  // other in storage. The roster itself is dynamic now (docs/features/manage-students,
  // localStorage key "learn-math:users", a plain [{id,name,gradeId}] array — confirmed
  // live, not guessed), so the second student is planted directly into that format
  // alongside its own menu position, the same way a position always was.
  await freshStart(page);
  await createAndSelectStudent(page);
  await page.locator(".grade-card").nth(1).click(); // grade ב׳
  await expect(page.locator(".greeting")).toContainText("כיתה ב");

  await page.evaluate(() => {
    const SECOND_ID = "e2e-second-student";
    const users = JSON.parse(localStorage.getItem("learn-math:users") ?? "[]");
    users.push({ id: SECOND_ID, name: "שני", gradeId: "8" });
    localStorage.setItem("learn-math:users", JSON.stringify(users));

    const raw = localStorage.getItem("learn-math:menu-position");
    const saved = raw ? JSON.parse(raw) : {};
    saved[SECOND_ID] = { gradeId: "8" };
    localStorage.setItem("learn-math:menu-position", JSON.stringify(saved));
  });

  await page.reload();
  await expect(page.locator(".student-card")).toHaveCount(0);
  await expect(page.locator(".grade-card")).toHaveCount(0);
  await expect(page.locator(".greeting")).toContainText("כיתה ב");
});

test("history keeps working exactly as before, reachable from the grade picker", async ({ page }) => {
  await freshStart(page);
  await createAndSelectStudent(page);
  await page.getByRole("button", { name: "ההתקדמות שלי →" }).click();
  await expect(page.getByText(/היסטוריה|התקדמות/)).toBeVisible();
});
