import { test, expect, type Page } from "@playwright/test";
import { createAndSelectStudent } from "./helpers/selectStudent";

/**
 * Acceptance criteria under test (docs/features/manage-students/product-spec.md):
 *  - A fresh profile has no users; the picker still offers a clear way to create one.
 *  - Creating requires a non-empty name and a usual grade; the new user appears
 *    immediately, but is not auto-selected.
 *  - There is no limit on how many users can be created.
 *  - Deleting requires explicit confirmation naming the student, and deletes their
 *    saved progress/history with them — irreversibly.
 *  - Per-user progress stays isolated; any-grade practice keeps working for a new user.
 *  - Choices persist across a reload.
 */

async function freshStart(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

test("a fresh profile shows only the add-student card, not an empty or broken screen", async ({
  page,
}) => {
  await freshStart(page);
  await expect(page.locator(".student-card-wrap")).toHaveCount(0);
  await expect(page.locator(".student-card-add")).toBeVisible();
  await expect(page.getByText("מי לומד היום?")).toBeVisible();
});

test("create is disabled until a name is entered, and still disabled for whitespace only", async ({
  page,
}) => {
  await freshStart(page);
  await page.locator(".student-card-add").click();
  const createButton = page.getByRole("button", { name: "יצירה" });
  await expect(createButton).toBeDisabled();
  await page.getByLabel("שם").fill("   ");
  await expect(createButton).toBeDisabled();
  await page.getByLabel("שם").fill("דנה");
  await expect(createButton).toBeEnabled();
});

test("creating a student adds them to the list without selecting them", async ({ page }) => {
  await freshStart(page);
  await page.locator(".student-card-add").click();
  await page.getByLabel("שם").fill("דנה");
  await page.locator(".grade-card-6").click();
  await page.getByRole("button", { name: "יצירה" }).click();

  // Still on the picker — not dropped into the grade/topic screen.
  await expect(page.getByText("מי לומד היום?")).toBeVisible();
  const card = page.locator(".student-card", { hasText: "דנה" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("כיתה ו׳");
});

test("cancelling the create dialog adds nobody", async ({ page }) => {
  await freshStart(page);
  await page.locator(".student-card-add").click();
  await page.getByLabel("שם").fill("לא-ניצור");
  await page.getByRole("button", { name: "ביטול" }).click();
  await expect(page.locator(".student-card-wrap")).toHaveCount(0);
});

test("any number of students can be created", async ({ page }) => {
  await freshStart(page);
  for (const name of ["אחד", "שתיים", "שלוש", "ארבע"]) {
    await page.locator(".student-card-add").click();
    await page.getByLabel("שם").fill(name);
    await page.getByRole("button", { name: "יצירה" }).click();
  }
  await expect(page.locator(".student-card-wrap")).toHaveCount(4);
});

test("deleting requires confirmation that names the student, and cancelling keeps them", async ({
  page,
}) => {
  await freshStart(page);
  await page.locator(".student-card-add").click();
  await page.getByLabel("שם").fill("דנה");
  await page.getByRole("button", { name: "יצירה" }).click();

  await page.getByRole("button", { name: "מחיקת דנה" }).click();
  await expect(page.getByText("למחוק את דנה?")).toBeVisible();
  await page.getByRole("button", { name: "ביטול" }).click();
  await expect(page.locator(".student-card", { hasText: "דנה" })).toBeVisible();
});

test("confirming deletion removes the student from the list", async ({ page }) => {
  await freshStart(page);
  await page.locator(".student-card-add").click();
  await page.getByLabel("שם").fill("דנה");
  await page.getByRole("button", { name: "יצירה" }).click();

  await page.getByRole("button", { name: "מחיקת דנה" }).click();
  await page.getByRole("button", { name: "מחיקה" }).click();
  await expect(page.locator(".student-card-wrap")).toHaveCount(0);
});

/** Every answer wrong, clicking past each one, until the level/style finishes — the
 *  score doesn't matter here, only that finishing writes a history record at all (see
 *  `App.tsx`'s `finish()`: it records regardless of how many were right). */
async function finishWithWrongAnswers(page: Page) {
  const progress = await page.locator(".progress").innerText();
  const total = Number(progress.match(/(\d+)\s*$/)![1]);
  for (let i = 0; i < total; i++) {
    // `.answer-input` is `readOnly` (docs/features/stitch-visual-refresh/) — typed
    // through the number pad instead, same reason answerQuestion.ts's helper is.
    const pad = page.locator(".number-pad");
    for (const digit of "999999") {
      await pad.getByRole("button", { name: digit, exact: true }).click();
    }
    await page.getByRole("button", { name: "בדיקה" }).click();
    await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
  }
}

test("deleting a student deletes their saved progress — a new student with the same name starts with none", async ({
  page,
}) => {
  await freshStart(page);
  const name = await createAndSelectStudent(page, "1", "דנה");
  await page.locator(".grade-card").first().click();
  await page.locator(".topic-card").first().click();
  await page.getByRole("button", { name: "דלג לתרגול →" }).click();
  await page.locator(".style-card, .level-card").first().click();
  await finishWithWrongAnswers(page);
  await expect(page.locator(".result")).toBeVisible();

  await page.getByRole("button", { name: "חזרה לתפריט" }).click();
  // "חזרה לתפריט" lands back on this topic's style picker, not home directly — one back
  // click reaches the topic list (home), a second reaches the grade picker, which is the
  // screen that offers "switch student".
  await page.getByText("← חזרה").click();
  await page.getByText("← חזרה").click();
  await page.getByText("← החלף תלמיד").click();
  await page.getByRole("button", { name: `מחיקת ${name}` }).click();
  await page.getByRole("button", { name: "מחיקה" }).click();

  // A new student, same display name, different identity under the hood. Lands on the
  // grade picker, which offers the history link directly — no grade needs picking first.
  await createAndSelectStudent(page, "1", "דנה");
  await page.getByText("ההתקדמות שלי").click();
  await expect(page.getByText("עוד לא תרגלת. אחרי התרגול הראשון הוא יופיע כאן.")).toBeVisible();
});

test("a newly created student can still practise in any grade, not just their usual one", async ({
  page,
}) => {
  await freshStart(page);
  await createAndSelectStudent(page, "8");
  await expect(page.locator(".grade-card")).toHaveCount(4);
  await page.locator(".grade-card-1").click();
  await expect(page.locator(".topic-card").first()).toBeVisible();
});

test("the roster survives a reload", async ({ page }) => {
  await freshStart(page);
  await page.locator(".student-card-add").click();
  await page.getByLabel("שם").fill("דנה");
  await page.getByRole("button", { name: "יצירה" }).click();

  await page.reload();
  await expect(page.locator(".student-card", { hasText: "דנה" })).toBeVisible();
});
