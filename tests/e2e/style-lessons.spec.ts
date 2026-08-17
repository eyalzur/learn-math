import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test (docs/features/style-lessons/product-spec.md).
 *
 * A topic is the unit of the syllabus, not of the lesson: "מספרים עד 20" holds five
 * kinds of question and a teacher teaches one of them in a day. These check that a child
 * can practise the one that was taught — and, just as much, that the topics which hold
 * only one kind are left exactly as they were.
 */

const MIKA = 0;
const ROTEM = 1;

/** Mika's topics, in the order the picker shows them. */
const NUMBERS = 0; // מספרים עד 20 — five styles
const ADD10 = 1; // חיבור עד 10 — one style, so levels stay
const PLACE = 4; // עשרות ויחידות — six styles
// חיבור וחיסור עד 20 (index 3) also has two styles; clearer-explanations.spec.ts walks it.

async function openTopic(page: Page, student: number, topic: number) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").nth(student).click();
  await page.locator(".topic-card").nth(topic).click();
}

// ------------------------------------------------- which screen a topic opens on

test("a topic with several styles asks which style, not which level", async ({ page }) => {
  await openTopic(page, MIKA, NUMBERS);

  await expect(page.locator(".style-card")).toHaveCount(5);
  await expect(page.locator(".level-card"), "the level screen must not also appear").toHaveCount(
    0,
  );
  await expect(page.locator(".subtitle")).toHaveText("על מה המורה לימד/ה היום?");
});

test("a topic with one style is untouched and never shows the new screen", async ({ page }) => {
  // "חיבור עד 10" is one kind of question. A screen offering a single choice teaches a
  // child that there is a decision here when there is not.
  await openTopic(page, MIKA, ADD10);

  await expect(page.locator(".level-card")).toHaveCount(3);
  await expect(page.locator(".style-card")).toHaveCount(0);
});

test("a grade that has not been classified still practises by level", async ({ page }) => {
  await openTopic(page, ROTEM, 0);

  await expect(page.locator(".level-card")).toHaveCount(3);
  await expect(page.locator(".style-card")).toHaveCount(0);
});

test("every one of Mika's topics lands somewhere, and never on both", async ({ page }) => {
  for (const topic of [0, 1, 2, 3, 4]) {
    await openTopic(page, MIKA, topic);
    const styles = await page.locator(".style-card").count();
    const levels = await page.locator(".level-card").count();
    expect(styles > 0 || levels > 0, `topic ${topic} opened on nothing`).toBe(true);
    expect(styles > 0 && levels > 0, `topic ${topic} opened on both screens`).toBe(false);
  }
});

// ------------------------------------------------------------- what a card says

test("each card shows only its title — no example, no question count", async ({ page }) => {
  await openTopic(page, MIKA, NUMBERS);

  const titles = await page.locator(".style-title").allInnerTexts();
  expect(titles).toEqual(["מה בא אחרי", "מה בא לפני", "מה גדול יותר", "מה נמצא באמצע", "מה קטן יותר"]);
  await expect(page.locator(".style-example")).toHaveCount(0);
  await expect(page.locator(".style-count")).toHaveCount(0);
});

test("a short lesson is shown as a lesson, not flagged as a short one", async ({ page }) => {
  // Four questions is a lesson. Marking it as an exception would teach that something is
  // wrong with it. "מה קטן יותר" (4 questions) and "מה בא אחרי" (8) are the same kind of
  // card in every way but how many questions sit behind them.
  await openTopic(page, MIKA, NUMBERS);

  const short = page.locator(".style-card").filter({ hasText: "מה קטן יותר" }).first();
  const long = page.locator(".style-card").filter({ hasText: "מה בא אחרי" }).first();
  expect(await short.getAttribute("class")).toBe(await long.getAttribute("class"));
});

test("entering a style produces questions of that same kind", async ({ page }) => {
  await openTopic(page, MIKA, NUMBERS);

  const card = page.locator(".style-card").filter({ hasText: "מה בא אחרי" }).first();
  await card.click();
  await expect(page.locator(".problem-text")).toContainText("בא אחרי");
});

// ------------------------------------------------------------------ the lesson

test("the lesson holds the whole style, and is titled with it", async ({ page }) => {
  await openTopic(page, MIKA, NUMBERS);
  await page.locator(".style-card").filter({ hasText: "מה נמצא באמצע" }).click();

  await expect(page.locator("h2")).toHaveText("מה נמצא באמצע");
  // Four questions, because that is how many the style holds — not padded to ten.
  await expect(page.locator(".progress")).toHaveText("שאלה 1 מתוך 4");
});

test("the questions climb, so the hardest is not the first one met", async ({ page }) => {
  // "מה בא לפני" is spread across all three levels; walking it must not open on the
  // hardest. Its easy questions are the small numbers.
  await openTopic(page, MIKA, NUMBERS);
  await page.locator(".style-card").filter({ hasText: "מה בא לפני" }).click();

  const seen: number[] = [];
  for (let i = 0; i < 7; i++) {
    const prompt = await page.locator(".problem-text").innerText();
    seen.push(Number(prompt.match(/\d+/)![0]));
    await page.locator(".answer-input").fill("999999");
    await page.getByRole("button", { name: "בדיקה" }).first().click();
    const next = page.getByRole("button", { name: /הבא|סיום/ });
    if (!(await next.count())) break;
    await next.click();
  }
  // The first question comes from the easy level, the last from the hard one.
  expect(seen[0], `walked ${seen.join(", ")}`).toBeLessThan(seen[seen.length - 1]);
});

test("leaving a lesson returns to the styles, not to the levels", async ({ page }) => {
  await openTopic(page, MIKA, NUMBERS);
  await page.locator(".style-card").first().click();
  await expect(page.locator(".problem-text")).toBeVisible();

  await page.locator(".link-button").first().click();
  await expect(page.locator(".style-card")).toHaveCount(5);
  await expect(page.locator(".level-card")).toHaveCount(0);
});

test("leaving a level still returns to the levels", async ({ page }) => {
  await openTopic(page, MIKA, ADD10);
  await page.locator(".level-card").first().click();
  await expect(page.locator(".problem-text")).toBeVisible();

  await page.locator(".link-button").first().click();
  await expect(page.locator(".level-card")).toHaveCount(3);
});

// ---------------------------------------------------------------- the history

test("history says which style was practised, not just which topic", async ({ page }) => {
  await openTopic(page, MIKA, PLACE);
  await page.locator(".style-card").filter({ hasText: "כמה עשרות" }).click();

  for (let i = 0; i < 5; i++) {
    await page.locator(".answer-input").fill("999999");
    await page.getByRole("button", { name: "בדיקה" }).first().click();
    await page.getByRole("button", { name: /הבא|סיום/ }).click();
  }

  await page.goto("/learn-math/");
  await page.locator(".history-link").click();
  await expect(page.locator("body")).toContainText("עשרות ויחידות · כמה עשרות");
});

// -------------------------------------------------------------- read-aloud

test("a child who cannot read gets the example spoken, one button per card", async ({ page }) => {
  await openTopic(page, MIKA, PLACE);
  // Read-aloud is the setting that exists for exactly this child; the speaker follows it.
  await expect(page.locator(".style-speak")).toHaveCount(0);

  await page.goto("/learn-math/");
  await page.locator(".read-aloud-switch").click();
  await page.locator(".topic-card").nth(PLACE).click();
  await expect(page.locator(".style-speak")).toHaveCount(6);

  // The speaker must not double as the card: tapping it stays on the screen.
  await page.locator(".style-speak").first().click();
  await expect(page.locator(".style-card")).toHaveCount(6);
});
