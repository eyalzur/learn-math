import { test, expect, type Page } from "@playwright/test";
import { grades } from "../../src/data/curriculum";

/**
 * Acceptance criteria under test (docs/features/mika-grade2-content/product-spec.md).
 *
 * Mika finished grade א׳ with no question above 20 anywhere in its 150 questions — she
 * outgrew it. These check that grade ב׳ (addition/subtraction to 100, with regrouping)
 * exists as a real *choice* alongside grade א׳, not a one-way switch that takes א׳ away,
 * and that the new questions actually require the new skill rather than just bigger
 * numbers wearing the old one.
 */

const MIKA = 0;

const GRADE_1_TOPICS = ["מספרים עד 20", "חיבור עד 10", "חיסור עד 10", "חיבור וחיסור עד 20", "עשרות ויחידות"];

async function open(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

test.beforeEach(async ({ page }) => {
  await open(page);
});

test("picking Mika offers a choice between grade א׳ and grade ב׳, not an automatic switch", async ({
  page,
}) => {
  await page.locator(".student-card").nth(MIKA).click();

  await expect(page.locator("h1")).toHaveText("באיזו כיתה מתרגלים היום?");
  await expect(page.locator(".grade-card")).toHaveCount(2);
  await expect(page.locator(".grade-card").nth(0)).toContainText("כיתה א׳");
  await expect(page.locator(".grade-card").nth(1)).toContainText("כיתה ב׳");
});

test("both grades stay reachable in the same visit — picking one does not lose the other", async ({
  page,
}) => {
  await page.locator(".student-card").nth(MIKA).click();
  await page.locator(".grade-card").first().click(); // כיתה א׳
  await expect(page.locator(".topic-card")).toHaveCount(GRADE_1_TOPICS.length);

  // Back to the grade choice — not stuck inside grade א׳.
  await page.locator(".link-button").first().click();
  await expect(page.locator(".grade-card")).toHaveCount(2);

  // The other grade is right there, still offering its own topics.
  await page.locator(".grade-card").nth(1).click(); // כיתה ב׳
  await expect(page.locator(".topic-card")).toHaveCount(2);
  await expect(page.locator(".topic-card", { hasText: "חיבור עד 100" })).toHaveCount(1);
  await expect(page.locator(".topic-card", { hasText: "חיסור עד 100" })).toHaveCount(1);
});

test("grade א׳ keeps its original five topics, unchanged by the new grade", async ({ page }) => {
  await page.locator(".student-card").nth(MIKA).click();
  await page.locator(".grade-card").first().click();

  await expect(page.locator(".topic-card")).toHaveCount(GRADE_1_TOPICS.length);
  for (const title of GRADE_1_TOPICS) {
    await expect(page.locator(".topic-card", { hasText: title })).toHaveCount(1);
  }
});

test("grade ב׳'s topics run three levels of ten questions, same shape as grade א׳", async ({
  page,
}) => {
  // חיבור עד 100 is now adaptive (see docs/features/adaptive-difficulty) and skips the
  // level picker on purpose — חיסור עד 100 is its untouched twin, still level-based.
  await page.locator(".student-card").nth(MIKA).click();
  await page.locator(".grade-card").nth(1).click();
  await page.locator(".topic-card", { hasText: "חיסור עד 100" }).click();

  await expect(page.locator(".level-card")).toHaveCount(3);
  await page.locator(".level-card").first().click();
  await expect(page.locator(".progress")).toContainText("מתוך 10");
});

test("a grade ב׳ arithmetic problem still renders left-to-right inside the RTL page", async ({
  page,
}) => {
  // The same bug that has shipped three times in this project: a bare expression handed
  // to the browser's bidi algorithm can render its operands in the wrong order.
  await page.locator(".student-card").nth(MIKA).click();
  await page.locator(".grade-card").nth(1).click();
  await page.locator(".topic-card", { hasText: "חיסור עד 100" }).click();
  await page.locator(".level-card").first().click();

  const box = page.locator(".problem-box, .problem-text").first();
  await expect(box).toBeVisible();
  const direction = await box.evaluate((el) => getComputedStyle(el).direction);
  expect(direction).toBe("ltr");
});

test("you can walk back from the topics screen to the grade choice, and from there to the student picker", async ({
  page,
}) => {
  await page.locator(".student-card").nth(MIKA).click();
  await page.locator(".grade-card").nth(1).click();
  await expect(page.locator(".topic-card")).toHaveCount(2);

  await page.locator(".link-button").first().click();
  await expect(page.locator(".grade-card")).toHaveCount(2);

  await page.locator(".link-button").first().click();
  await expect(page.locator(".student-card")).toHaveCount(3);
});

// ---------------------------------------------------------- content, read from the data

/** `"47 + 8"` → `[47, 8]`. Grade 2's questions are bare arithmetic, always this shape. */
function operands(prompt: string): [number, number] {
  const m = prompt.match(/^(\d+)\s*[+−-]\s*(\d+)$/);
  if (!m) throw new Error(`not a bare two-operand expression: "${prompt}"`);
  return [Number(m[1]), Number(m[2])];
}

function grade2Topic(id: string) {
  const grade2 = grades.find((g) => g.id === "2")!;
  const topic = grade2.topicSets.find((t) => t.id === id)!;
  return topic;
}

test("every hard חיבור עד 100 question requires carrying past a ten, not just bigger numbers", () => {
  const hard = grade2Topic("add100").levels.find((l) => l.id === "hard")!;
  const notCarrying = hard.questions
    .map((q) => ({ id: q.id, ops: operands(q.prompt) }))
    .filter(({ ops: [a, b] }) => (a % 10) + (b % 10) < 10)
    .map(({ id }) => id);
  expect(notCarrying, `\n${notCarrying.join("\n")}\n`).toEqual([]);
});

test("every hard חיסור עד 100 question requires borrowing, not just bigger numbers", () => {
  const hard = grade2Topic("sub100").levels.find((l) => l.id === "hard")!;
  const notBorrowing = hard.questions
    .map((q) => ({ id: q.id, ops: operands(q.prompt) }))
    .filter(({ ops: [a, b] }) => a % 10 >= b % 10)
    .map(({ id }) => id);
  expect(notBorrowing, `\n${notBorrowing.join("\n")}\n`).toEqual([]);
});
