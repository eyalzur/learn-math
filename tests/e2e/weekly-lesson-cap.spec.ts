import { test, expect, devices, type Page } from "@playwright/test";
import { answerQuestion, waitForNextQuestionOrEnd } from "./helpers/answerQuestion";
import { createAndSelectStudent } from "./helpers/selectStudent";

/**
 * Acceptance criteria under test (docs/features/weekly-lesson-cap/product-spec.md).
 *
 * The dev server for the suite raises the free allowance (VITE_FREE_LESSONS_PER_WEEK) so
 * other specs are never capped; this file seeds the real allowance back (or a small one)
 * through the documented localStorage override key.
 */
const { defaultBrowserType: _unused, ...iPhone13 } = devices["iPhone 13"];
test.use(iPhone13);

const OVERRIDE_KEY = "learn-math:free-lessons-override";

async function openWithAllowance(page: Page, free: number | null) {
  await page.addInitScript(
    ([key, value]) => {
      if (value === null) localStorage.removeItem(key as string);
      else localStorage.setItem(key as string, String(value));
    },
    [OVERRIDE_KEY, free],
  );
  await page.goto("/learn-math/");
}

async function toGradeB(page: Page) {
  const name = await createAndSelectStudent(page);
  await page.locator(".grade-card").nth(1).click();
  return name;
}

/** Writes N finished-practice records for the selected student, stamped now, then reloads. */
async function seedFinishedPractices(page: Page, count: number) {
  await page.evaluate((n) => {
    const users = JSON.parse(localStorage.getItem("learn-math:users") ?? "[]");
    const id = users[users.length - 1].id;
    const records = Array.from({ length: n }, () => ({
      at: new Date().toISOString(),
      studentId: id,
      gradeLabel: "כיתה ב׳",
      topicTitle: "חיבור עד 100",
      levelTitle: "",
      correct: 3,
      total: 5,
    }));
    localStorage.setItem("learn-math:history", JSON.stringify(records));
  }, count);
  await page.reload();
}

async function noPageScroll(page: Page) {
  const { h, v } = await page.evaluate(() => ({
    h: document.documentElement.scrollHeight,
    v: window.innerHeight,
  }));
  expect(h).toBeLessThanOrEqual(v);
}

test("the topics screen shows how many lessons are left, without scrolling", async ({ page }) => {
  await openWithAllowance(page, 3);
  await toGradeB(page);
  await expect(page.locator(".lessons-chip")).toHaveText("נשארו 3 שיעורים");
  await noPageScroll(page);
});

test("production default is 5 free lessons a week", async ({ page }) => {
  await openWithAllowance(page, null);
  await page.evaluate(() => localStorage.removeItem("learn-math:free-lessons-override"));
  // The dev server overrides via env, so assert the constant itself.
  const free = await page.evaluate(async () => {
    const mod = await import("/learn-math/src/data/lessonAllowance.ts");
    return mod.FREE_LESSONS_PER_WEEK;
  });
  expect(free).toBe(5);
});

test("finishing a practice uses one lesson", async ({ page }) => {
  test.setTimeout(120_000);
  await openWithAllowance(page, 3);
  await toGradeB(page);
  await page.locator(".topic-card", { hasText: "חיבור עד 100" }).click();
  await page.getByRole("button", { name: "דלג לתרגול →" }).click();
  // Leaving a practice before finishing must not count.
  await page.getByRole("button", { name: /חזרה/ }).first().click();
  await expect(page.locator(".lessons-chip")).toHaveText("נשארו 3 שיעורים");

  await page.locator(".topic-card", { hasText: "חיבור עד 100" }).click();
  await page.getByRole("button", { name: "דלג לתרגול →" }).click();
  while ((await page.locator(".score").count()) === 0) {
    const prompt = (await page.locator(".problem-box").first().innerText()).trim();
    const m = prompt.match(/(\d+)\s*\+\s*(\d+)/);
    if (!m) throw new Error(`unexpected prompt: ${prompt}`);
    await answerQuestion(page, Number(m[1]) + Number(m[2]));
    await waitForNextQuestionOrEnd(page);
  }
  await page.getByRole("button", { name: "חזרה לתפריט" }).click();
  await expect(page.locator(".lessons-chip")).toHaveText("נשארו 2 שיעורים");
});

test("at zero, starting a practice is blocked with a short message and a way to ask a parent", async ({ page }) => {
  await openWithAllowance(page, 2);
  await toGradeB(page);
  await seedFinishedPractices(page, 2);
  await expect(page.locator(".lessons-chip")).toHaveText("נגמרו שיעורים");

  await page.locator(".topic-card", { hasText: "חיבור עד 100" }).click(); // the lesson: browsing still works
  await page.getByRole("button", { name: "דלג לתרגול →" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("נגמרו השיעורים של השבוע.");
  await expect(dialog).toContainText("אפשר לבקש מאמא או אבא.");
  await expect(page.locator(".answer-input")).toHaveCount(0);
  const box = await page.locator(".lessons-dialog").boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(664);
  await dialog.getByRole("button", { name: "סגירה" }).click();
  await expect(dialog).toHaveCount(0);
});

test("the parent gate rejects a wrong answer, then the free pack adds 10 lessons", async ({ page }) => {
  await openWithAllowance(page, 2);
  await toGradeB(page);
  await seedFinishedPractices(page, 2);
  await page.locator(".lessons-chip").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "בקשו מההורים" }).or(dialog.getByRole("button", { name: /עוד שיעורים/ })).click();

  await dialog.getByLabel("תשובה").fill("1");
  await dialog.getByRole("button", { name: "המשך" }).click();
  await expect(dialog).toContainText("לא נכון, נסו שוב.");

  const math = (await dialog.locator(".lessons-gate-math").innerText()).match(/(\d+)\s*×\s*(\d+)/)!;
  await dialog.getByLabel("תשובה").fill(String(Number(math[1]) * Number(math[2])));
  await dialog.getByRole("button", { name: "המשך" }).click();

  await expect(dialog).toContainText("10 שיעורים נוספים");
  await expect(dialog).toContainText("חינם כרגע");
  await expect(dialog.locator("input")).toHaveCount(0); // no card / payment fields
  await dialog.getByRole("button", { name: "קבלו" }).click();
  await expect(dialog).toContainText("נוספו 10 שיעורים!");
  await dialog.getByRole("button", { name: "סגירה" }).click();
  await expect(page.locator(".lessons-chip")).toHaveText("נשארו 10 שיעורים");

  // Practice starts again.
  await page.locator(".topic-card", { hasText: "חיבור עד 100" }).click();
  await page.getByRole("button", { name: "דלג לתרגול →" }).click();
  await expect(page.locator(".answer-input")).toBeVisible();
});

test("extra lessons belong to their week and expire", async ({ page }) => {
  await openWithAllowance(page, 2);
  await toGradeB(page);
  await seedFinishedPractices(page, 2);
  await page.evaluate(() => {
    const users = JSON.parse(localStorage.getItem("learn-math:users") ?? "[]");
    localStorage.setItem(
      "learn-math:lessons",
      JSON.stringify({ [users[users.length - 1].id]: { week: "2020-01-05", extra: 10 } }),
    );
  });
  await page.reload();
  await expect(page.locator(".lessons-chip")).toHaveText("נגמרו שיעורים");
});

test("extra lessons are per student", async ({ page }) => {
  await openWithAllowance(page, 1);
  await toGradeB(page);
  await seedFinishedPractices(page, 1);
  await page.locator(".lessons-chip").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /בקשו מההורים|עוד שיעורים/ }).click();
  const math = (await dialog.locator(".lessons-gate-math").innerText()).match(/(\d+)\s*×\s*(\d+)/)!;
  await dialog.getByLabel("תשובה").fill(String(Number(math[1]) * Number(math[2])));
  await dialog.getByRole("button", { name: "המשך" }).click();
  await dialog.getByRole("button", { name: "קבלו" }).click();
  await dialog.getByRole("button", { name: "סגירה" }).click();

  // A second student starts with just the free allowance.
  await page.getByRole("button", { name: /חזרה/ }).first().click(); // to the grade picker
  await page.getByRole("button", { name: /החלף תלמיד/ }).click(); // to the student picker
  await createAndSelectStudent(page);
  await page.locator(".grade-card").nth(1).click();
  await expect(page.locator(".lessons-chip")).toHaveText("נשאר שיעור אחד");
});

test("the lessons dialog fits a short phone", async ({ page }) => {
  await openWithAllowance(page, 1);
  await toGradeB(page);
  await seedFinishedPractices(page, 1);
  await page.locator(".lessons-chip").click();
  const box = await page.locator(".lessons-dialog").boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(664);
});
