import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test (docs/features/any-grade-any-student/product-spec.md).
 *
 * Every student can now practise in any grade, not just the one associated with them,
 * and a returning student lands back where they were in the menu — not always at home,
 * and never deeper than the menu itself (an active practice session is never resumed).
 */

async function freshStart(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

const studentCard = (page: Page, index: number) => page.locator(".student-card").nth(index);

test("student selection itself is unchanged — three named cards, no grade shown yet", async ({ page }) => {
  await freshStart(page);
  await expect(page.locator(".student-card")).toHaveCount(3);
  await expect(page.locator(".grade-card")).toHaveCount(0);
});

test("every student sees all four grades, not just their usual one", async ({ page }) => {
  for (let i = 0; i < 3; i++) {
    await freshStart(page);
    await studentCard(page, i).click();
    await expect(page.locator(".grade-card"), `student ${i}`).toHaveCount(4);
  }
});

test("a student can choose a grade that isn't their usual one and actually practise in it", async ({ page }) => {
  await freshStart(page);
  await studentCard(page, 1).click(); // Rotem, usually grade ו׳
  await page.locator(".grade-card").first().click(); // grade א׳ instead
  await expect(page.locator(".topic-card").first()).toBeVisible();
  await page.locator(".topic-card").first().click();
  // Landing on either a style/level picker or straight into practice both count as
  // "actually practising" — either way something concrete from grade א׳ shows up.
  await expect(
    page.locator(".style-card, .level-card, .progress").first(),
  ).toBeVisible();
});

test("the grade picker is shown to every student, including one who used to skip it", async ({ page }) => {
  await freshStart(page);
  await studentCard(page, 1).click(); // Rotem — had exactly one grade before this feature
  await expect(page.getByText("באיזו כיתה מתרגלים היום?")).toBeVisible();
});

test("reloading after reaching the topic list returns straight to that grade's topic list", async ({ page }) => {
  await freshStart(page);
  await studentCard(page, 0).click();
  await page.locator(".grade-card").nth(2).click(); // grade ו׳
  await expect(page.locator(".topic-card").first()).toBeVisible();

  await page.reload();
  await expect(page.locator(".student-card")).toHaveCount(0);
  await expect(page.locator(".grade-card")).toHaveCount(0);
  await expect(page.locator(".topic-card").first()).toBeVisible();
});

test("reloading after reaching a style picker returns straight to that same style picker", async ({ page }) => {
  await freshStart(page);
  await studentCard(page, 0).click(); // Mika
  await page.locator(".grade-card").first().click(); // grade א׳
  await page.locator(".topic-card").first().click(); // a style-based topic
  await expect(page.locator(".style-card").first()).toBeVisible();

  await page.reload();
  await expect(page.locator(".student-card")).toHaveCount(0);
  await expect(page.locator(".topic-card")).toHaveCount(0);
  await expect(page.locator(".style-card").first()).toBeVisible();
});

test("going back from a style picker to the topic list, then reloading, stays on the topic list", async ({
  page,
}) => {
  await freshStart(page);
  await studentCard(page, 0).click();
  await page.locator(".grade-card").first().click();
  await page.locator(".topic-card").first().click();
  await expect(page.locator(".style-card").first()).toBeVisible();

  await page.getByRole("button", { name: "← חזרה" }).click();
  await expect(page.locator(".topic-card").first()).toBeVisible();

  await page.reload();
  await expect(page.locator(".topic-card").first()).toBeVisible();
  await expect(page.locator(".style-card")).toHaveCount(0);
});

test("an adaptive topic never resumes inside an active practice session", async ({ page }) => {
  await freshStart(page);
  await studentCard(page, 0).click();
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
  await studentCard(page, 1).click(); // Rotem
  await page.locator(".grade-card").nth(3).click(); // grade ח׳ — not his usual grade
  await expect(page.locator(".greeting")).toContainText("כיתה ח");

  await page.reload();
  await expect(page.locator(".student-card")).toHaveCount(0);
  await expect(page.locator(".grade-card")).toHaveCount(0);
  await expect(page.locator(".greeting")).toContainText("כיתה ח");
});

test("one student's saved position isn't disturbed by another student's turn", async ({ page }) => {
  // Establishes Mika's saved position, then plants a saved position for Rotem directly
  // — exactly the state left behind after his own turn on the same shared device —
  // without ever routing through Mika's own "← חזרה", which (separately, and by
  // design predating this feature) forgets the current grade choice on its own. This
  // isolates the one thing this test is actually about: the two students' entries
  // don't collide or overwrite each other in storage.
  await freshStart(page);
  await studentCard(page, 0).click(); // Mika
  await page.locator(".grade-card").nth(1).click(); // grade ב׳
  await expect(page.locator(".greeting")).toContainText("כיתה ב");

  await page.evaluate(() => {
    const raw = localStorage.getItem("learn-math:menu-position");
    const saved = raw ? JSON.parse(raw) : {};
    saved.rotem = { gradeId: "8" };
    localStorage.setItem("learn-math:menu-position", JSON.stringify(saved));
  });

  await page.reload();
  await expect(page.locator(".student-card")).toHaveCount(0);
  await expect(page.locator(".grade-card")).toHaveCount(0);
  await expect(page.locator(".greeting")).toContainText("כיתה ב");
});

test("history keeps working exactly as before, reachable from the grade picker", async ({ page }) => {
  await freshStart(page);
  await studentCard(page, 0).click();
  await page.getByRole("button", { name: "ההתקדמות שלי →" }).click();
  await expect(page.getByText(/היסטוריה|התקדמות/)).toBeVisible();
});
