import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test
 * (docs/features/fraction-diagram/product-spec.md).
 *
 * Rotem's first topic is "שברים פשוטים". Its easy level opens on "כמה זה חצי מ-20?"
 * (two slices) and its medium level on "כמה זה שלושה רבעים מ-100?" (four slices) — two
 * different shapes, which is what stops an implementation that always draws the same
 * circle from passing.
 *
 * `innerText` returns undefined on SVG elements, so slice values are read with
 * `textContent` through `evaluateAll`.
 */

const ROTEM = 1;

async function openFractions(page: Page, levelIndex: number) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").nth(ROTEM).click();
  await page.locator(".topic-card").nth(0).click();
  await page.locator(".level-card").nth(levelIndex).click();
}

const answerWrong = async (page: Page) => {
  await page.locator(".answer-input").fill("999999");
  await page.getByRole("button", { name: "בדיקה" }).click();
};

const sliceValues = (page: Page) =>
  page.locator(".slice-value").evaluateAll((els) => els.map((el) => el.textContent));

// ------------------------------------------------------- the picture never leaks

test("no diagram anywhere before the question is answered", async ({ page }) => {
  await openFractions(page, 0);

  // This is the whole reason the picture lives in the explanation: for "חצי מ-20" the
  // circle carries the answer in plain sight.
  await expect(page.locator(".fraction-circle")).toHaveCount(0);
  await expect(page.locator(".problem-text")).toBeVisible();
});

test("a correct answer shows no diagram", async ({ page }) => {
  await openFractions(page, 0);

  await page.locator(".answer-input").fill("10");
  await page.getByRole("button", { name: "בדיקה" }).click();

  await expect(page.locator(".feedback.correct")).toBeVisible();
  await expect(page.locator(".fraction-circle")).toHaveCount(0);
});

// ------------------------------------------------------- the picture matches the question

test("the slices match the denominator and the filled ones match the numerator", async ({
  page,
}) => {
  // One half of twenty: two slices, one filled.
  await openFractions(page, 0);
  await expect(page.locator(".problem-text")).toContainText("חצי");
  await answerWrong(page);

  await expect(page.locator(".fraction-circle")).toBeVisible();
  await expect(page.locator(".slice")).toHaveCount(2);
  await expect(page.locator(".slice.taken")).toHaveCount(1);

  // Three quarters of a hundred: four slices, three filled. A second shape, because an
  // implementation that always drew the same circle would sail through the first.
  await openFractions(page, 1);
  await expect(page.locator(".problem-text")).toContainText("רבעים");
  await answerWrong(page);

  await expect(page.locator(".slice")).toHaveCount(4);
  await expect(page.locator(".slice.taken")).toHaveCount(3);
});

test("every slice carries what one part is worth", async ({ page }) => {
  await openFractions(page, 0);
  await answerWrong(page);
  // Twenty split two ways.
  expect(await sliceValues(page)).toEqual(["10", "10"]);

  await openFractions(page, 1);
  await answerWrong(page);
  // A hundred split four ways.
  expect(await sliceValues(page)).toEqual(["25", "25", "25", "25"]);
});

// --------------------------------------------------- where no honest picture exists

test("questions the circle cannot describe get no circle, and still explain themselves", async ({
  page,
}) => {
  // The hard level holds the topic's six odd shapes — "how many thirds in two wholes"
  // and the like. One circle would be describing a different question.
  await openFractions(page, 2);

  let checked = 0;
  for (let i = 0; i < 10; i++) {
    const prompt = await page.locator(".problem-text").innerText();
    await answerWrong(page);

    if (!prompt.startsWith("כמה זה")) {
      await expect(page.locator(".fraction-circle"), `${prompt} drew a circle`).toHaveCount(0);
      // Absence must not look like breakage: the explanation is still whole.
      await expect(page.locator(".explanation")).toBeVisible();
      await expect(page.locator(".explanation-step").first()).toBeVisible();
      checked++;
    }

    const next = page.getByRole("button", { name: /הבא|סיום/ });
    if ((await next.count()) === 0) break;
    await next.click();
    if ((await page.locator(".problem-text").count()) === 0) break;
  }

  expect(checked, "no odd-shaped question was reached").toBeGreaterThan(0);
});

// --------------------------------------------------------------- accessibility

test("the caption and the screen reader description say the same thing", async ({ page }) => {
  await openFractions(page, 0);
  await answerWrong(page);

  const caption = await page.locator(".fraction-caption").innerText();
  const described = await page.locator(".fraction-circle").getAttribute("aria-label");

  expect(described, "the picture has no accessible name").toBeTruthy();
  // One string serves both, so a reader who cannot see the circle is not told something
  // different from what is printed under it.
  expect(described).toBe(caption);
  expect(caption).toContain("20");
});

test("numbers inside the slices read left to right", async ({ page }) => {
  await openFractions(page, 1);
  await answerWrong(page);

  // An SVG does not inherit the page's direction habits, which is exactly where this
  // project's recurring bug likes to hide.
  const direction = await page
    .locator(".slice-value")
    .first()
    .evaluate((el) => getComputedStyle(el).direction);
  expect(direction).toBe("ltr");

  const svgDirection = await page
    .locator(".fraction-circle")
    .evaluate((el) => getComputedStyle(el).direction);
  expect(svgDirection).toBe("ltr");
});

// ------------------------------------------------------------- nothing else moved

test("the written explanation is still there, above and below the picture", async ({
  page,
}) => {
  await openFractions(page, 1);
  await answerWrong(page);

  await expect(page.locator(".explanation")).toContainText("איך פותרים?");
  await expect(page.locator(".explanation-step").first()).toBeVisible();
  await expect(page.locator(".explanation-analogy")).toBeVisible();
});

test("a grade with no fractions is untouched", async ({ page }) => {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").nth(0).click(); // Mika
  // Mika now has two grades available; this test is about her grade 1 (א׳) content.
  await page.locator(".grade-card").first().click();
  await page.locator(".topic-card").nth(0).click();
  // Grade 1 enters this topic by style, not by level.
  await page.locator(".style-card").first().click();
  await answerWrong(page);

  await expect(page.locator(".explanation")).toBeVisible();
  await expect(page.locator(".fraction-circle")).toHaveCount(0);
});
