import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test
 * (docs/features/more-diagrams/product-spec.md, first wave).
 *
 * Mika's two shapes: the number line for "מספרים עד 20" and the ten-frame for
 * "עשרות ויחידות". She is seven and still learning to read, so for her these are not
 * illustrations of the explanation — they are the explanation, which is why her topics
 * went first of the seven.
 *
 * `innerText` returns undefined on SVG elements, so tick values are read with
 * `textContent` through `evaluateAll`.
 */

const MIKA = 0;
const NUMBERS = 0;
const PLACE = 4;

async function open(page: Page, topicIdx: number, levelIdx: number) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").nth(MIKA).click();
  await page.locator(".topic-card").nth(topicIdx).click();
  await page.locator(".level-card").nth(levelIdx).click();
}

const answer = async (page: Page, value: string) => {
  await page.locator(".answer-input").fill(value);
  await page.getByRole("button", { name: "בדיקה" }).first().click();
};

/** Walks the level until the prompt contains `wanted`, then answers it wrong. */
async function failAt(page: Page, wanted: string) {
  for (let i = 0; i < 12; i++) {
    const prompt = await page.locator(".problem-text").innerText();
    if (prompt.includes(wanted)) break;
    await answer(page, "999999");
    await page.getByRole("button", { name: /הבא|סיום/ }).click();
  }
  await expect(page.locator(".problem-text")).toContainText(wanted);
  await answer(page, "999999");
}

const ticks = (page: Page) =>
  page.locator(".nl-label").evaluateAll((els) => els.map((el) => Number(el.textContent)));

// -------------------------------------------------------- the picture never leaks early

test("no number line before the question is answered", async ({ page }) => {
  await open(page, NUMBERS, 1);
  await expect(page.locator(".problem-text")).toBeVisible();
  await expect(page.locator(".number-line")).toHaveCount(0);
});

test("no ten-frame before the question is answered", async ({ page }) => {
  await open(page, PLACE, 0);
  await expect(page.locator(".problem-text")).toBeVisible();
  await expect(page.locator(".ten-frame")).toHaveCount(0);
});

test("a correct answer shows no picture", async ({ page }) => {
  await open(page, NUMBERS, 1); // opens on "איזה מספר בא אחרי 12?"
  await answer(page, "13");

  await expect(page.locator(".feedback.correct")).toBeVisible();
  await expect(page.locator(".number-line")).toHaveCount(0);
});

// ------------------------------------------------------------- the line ascends, left to right

test("the ticks run left to right and ascend", async ({ page }) => {
  await open(page, NUMBERS, 1);
  await failAt(page, "בא אחרי 12");

  const values = await ticks(page);
  expect(values.length, "fewer than five ticks").toBeGreaterThanOrEqual(5);
  // The page is right-to-left; the line is not. This is the classroom convention, and
  // the decision is recorded in design.md.
  expect(values, "the ticks are not ascending").toEqual([...values].sort((a, b) => a - b));
  expect(values).toContain(12);
  expect(values).toContain(13);
});

test("the line is one isolated left-to-right island", async ({ page }) => {
  await open(page, NUMBERS, 1);
  await failAt(page, "בא אחרי 12");

  const style = await page.locator(".number-line").evaluate((el) => {
    const c = getComputedStyle(el);
    return { direction: c.direction, unicodeBidi: c.unicodeBidi };
  });
  expect(style.direction).toBe("ltr");
});

test("even at the top of the range the window still holds five ticks", async ({ page }) => {
  // "בא אחרי 19" clips at 20, so a window that only grows rightwards would come out
  // with four ticks and nothing to add.
  await open(page, NUMBERS, 1);
  await failAt(page, "בא אחרי 19");

  const values = await ticks(page);
  expect(values.length, "the window did not widen downwards").toBeGreaterThanOrEqual(5);
  expect(Math.max(...values)).toBe(20);
});

// -------------------------------------------------- the marks say something, per question shape

test("a comparison marks the number that was NOT the answer", async ({ page }) => {
  // The criterion easiest to implement backwards. Both candidates sit on the line; the
  // answer is starred and the other is dotted, so the child sees which is further along
  // rather than being told which is bigger.
  await open(page, NUMBERS, 0);
  await failAt(page, "גדול יותר, 4 או 8");

  await expect(page.locator(".nl-from")).toHaveCount(1);
  await expect(page.locator(".nl-to")).toHaveCount(1);

  const values = await ticks(page);
  expect(values).toContain(4);
  expect(values).toContain(8);

  // The dot's x must line up with 4's tick, and the star's with 8's.
  const dotX = await page.locator(".nl-from").evaluate((el) => el.getBoundingClientRect().x);
  const starX = await page.locator(".nl-to").evaluate((el) => el.getBoundingClientRect().x);
  expect(dotX, "the dot is not left of the star, so it is not on the smaller number").toBeLessThan(
    starX,
  );
});

test("a between-question marks both ends", async ({ page }) => {
  await open(page, NUMBERS, 2);
  await failAt(page, "נמצא בין 6 ל-8");

  await expect(page.locator(".nl-from"), "both ends of the range must be marked").toHaveCount(2);
  await expect(page.locator(".nl-to")).toHaveCount(1);
  expect(await ticks(page)).toEqual(expect.arrayContaining([6, 7, 8]));
});

// ------------------------------------------------------------------------ the ten-frame

test("asking about units fills the loose ones, not the box", async ({ page }) => {
  await open(page, PLACE, 0);
  await failAt(page, "כמה יחידות יש במספר 13");

  await expect(page.locator(".ten-frame")).toBeVisible();
  await expect(page.locator(".tf-box")).toHaveCount(1);
  // Thirteen: ten inside the box, three loose. Only the three are filled.
  await expect(page.locator(".tf-dot")).toHaveCount(13);
  await expect(page.locator(".tf-dot.filled")).toHaveCount(3);
});

test("asking about tens fills the box, not the loose ones", async ({ page }) => {
  await open(page, PLACE, 0);
  await failAt(page, "כמה עשרות יש במספר 13");

  await expect(page.locator(".tf-dot")).toHaveCount(13);
  await expect(page.locator(".tf-dot.filled"), "the wrong side is filled").toHaveCount(10);
});

test("the ten-frame comes before the vertical sum on the one question that has both", async ({
  page,
}) => {
  await open(page, PLACE, 1);
  await failAt(page, "10 + 6");

  await expect(page.locator(".ten-frame")).toBeVisible();
  await expect(page.locator(".vertical-sum")).toBeVisible();

  const frameY = await page.locator(".ten-frame").evaluate((el) => el.getBoundingClientRect().y);
  const sumY = await page.locator(".vertical-sum").evaluate((el) => el.getBoundingClientRect().y);
  expect(frameY, "the vertical sum came first").toBeLessThan(sumY);
});

// ------------------------------------------------- where no honest picture exists

test("the hard place-value questions get no frame, and still explain themselves", async ({
  page,
}) => {
  // All ten are about the gap between digits, or completing to twenty. One box describes
  // neither, and the absence is deliberate.
  await open(page, PLACE, 2);

  for (let i = 0; i < 3; i++) {
    await answer(page, "999999");
    await expect(page.locator(".ten-frame")).toHaveCount(0);
    // Absence must not look like breakage.
    await expect(page.locator(".explanation")).toBeVisible();
    await expect(page.locator(".explanation-step").first()).toBeVisible();
    await page.getByRole("button", { name: /הבא|סיום/ }).click();
  }
});

// --------------------------------------------------------------------- accessibility

test("each picture's caption is what a screen reader is told", async ({ page }) => {
  await open(page, NUMBERS, 1);
  await failAt(page, "בא אחרי 12");
  const lineCaption = await page.locator(".figure-caption").innerText();
  expect(await page.locator(".number-line").getAttribute("aria-label")).toBe(lineCaption);

  await open(page, PLACE, 0);
  await failAt(page, "כמה יחידות יש במספר 13");
  const frameCaption = await page.locator(".figure-caption").innerText();
  expect(await page.locator(".ten-frame").getAttribute("aria-label")).toBe(frameCaption);
});

test("the captions are sentences, not lists of numbers", async ({ page }) => {
  // Mika cannot read the screen, so the caption is her channel — it is what the
  // read-aloud says in place of the picture.
  await open(page, NUMBERS, 1);
  await failAt(page, "בא אחרי 12");

  const caption = await page.locator(".figure-caption").innerText();
  expect(caption.split(/\s+/).length, "the caption is too terse to be spoken").toBeGreaterThan(4);
  expect(caption).toContain("על הציר");
});
