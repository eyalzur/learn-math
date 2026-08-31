import { test, expect, type Page } from "@playwright/test";
import { answerViaNotebook } from "./helpers/notebookAnswer";

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

/**
 * Both of Mika's topics here are entered by picking a style rather than a level, so a
 * test names the kind of exercise it is about instead of a difficulty it never cared
 * about. That is also more honest: every one of these tests then walks to a particular
 * question, and the style is where that question lives.
 */
async function open(page: Page, topicIdx: number, style: string) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").nth(MIKA).click();
  // Mika now has two grades available; every topic this file tests is grade 1 (א׳).
  await page.locator(".grade-card").first().click();
  await page.locator(".topic-card").nth(topicIdx).click();
  await page.locator(".style-card").filter({ hasText: style }).first().click();
}

const answer = async (page: Page, value: string) => {
  await answerViaNotebook(page, value);
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
  await open(page, NUMBERS, "מה בא אחרי");
  await expect(page.locator(".problem-text")).toBeVisible();
  await expect(page.locator(".number-line")).toHaveCount(0);
});

test("no ten-frame before the question is answered", async ({ page }) => {
  await open(page, PLACE, "כמה עשרות");
  await expect(page.locator(".problem-text")).toBeVisible();
  await expect(page.locator(".ten-frame")).toHaveCount(0);
});

test("a correct answer shows no picture", async ({ page }) => {
  // A lesson climbs from the easy end, so this opens on "איזה מספר בא אחרי 3?".
  await open(page, NUMBERS, "מה בא אחרי");
  await answer(page, "4");

  await expect(page.locator(".feedback.correct")).toBeVisible();
  await expect(page.locator(".number-line")).toHaveCount(0);
});

// ------------------------------------------------------------- the line ascends, left to right

test("the ticks run left to right and ascend", async ({ page }) => {
  await open(page, NUMBERS, "מה בא אחרי");
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
  await open(page, NUMBERS, "מה בא אחרי");
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
  await open(page, NUMBERS, "מה בא אחרי");
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
  await open(page, NUMBERS, "מה גדול יותר");
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

test("a between-question counts up and still marks the far end", async ({ page }) => {
  // Two criteria at once, and they pull in different directions: the run has to show that
  // you count (`4`, `5`, `6`), and the upper bound has to stay marked, because the
  // question is about a place between two bounds and a picture that only counts upwards
  // loses half of it.
  await open(page, NUMBERS, "מה נמצא באמצע");
  await failAt(page, "נמצא בין 6 ל-8");

  await expect(page.locator(".nl-from"), "the run plus the far end").toHaveCount(4);
  await expect(page.locator(".nl-to")).toHaveCount(1);
  expect(await ticks(page)).toEqual(expect.arrayContaining([4, 5, 6, 7, 8]));

  const caption = await page.locator(".figure-caption").innerText();
  for (const n of [4, 5, 6, 7, 8]) {
    expect(caption, `${n} is marked but not spoken`).toContain(String(n));
  }
});

test("a counting question shows the run it counted, not two marks", async ({ page }) => {
  // The review's words: "אולי צריך לספור מעוד כמה, למשל: 16, 15, 14 ועכשיו מה בא?"
  await open(page, NUMBERS, "מה בא לפני");
  await failAt(page, "בא לפני 14");

  await expect(page.locator(".nl-from"), "a run of three").toHaveCount(3);
  await expect(page.locator(".nl-to")).toHaveCount(1);

  const values = await ticks(page);
  for (const n of [13, 14, 15, 16]) expect(values).toContain(n);

  // Counted backwards, and said so in that order.
  const caption = await page.locator(".figure-caption").innerText();
  expect(caption).toContain("סופרים אחורה");
  expect(caption.indexOf("16")).toBeLessThan(caption.indexOf("14"));
});

test("the run shortens rather than running off the end of the line", async ({ page }) => {
  // "איזה מספר בא לפני 20" would count 22, 21, 20 — two numbers outside everything Mika
  // has been taught. Less than we wanted beats showing her a number she does not know.
  await open(page, NUMBERS, "מה בא לפני");
  await failAt(page, "בא לפני 20");

  await expect(page.locator(".nl-from")).toHaveCount(1);
  const values = await ticks(page);
  expect(Math.max(...values), "the line went past twenty").toBe(20);

  const caption = await page.locator(".figure-caption").innerText();
  expect(caption).not.toContain("21");
  expect(caption).not.toContain("22");
});

test("the opening sentence matches whether zero is really on screen", async ({ page }) => {
  // The pair that separates a caption read off the final ticks from one guessed at: two
  // counting questions a single tick apart, one drawing 0 and one not.
  await open(page, NUMBERS, "מה בא אחרי");
  await failAt(page, "בא אחרי 3");
  expect(await ticks(page), "0 should be drawn here").toContain(0);
  expect(await page.locator(".figure-caption").innerText()).toContain("כאן משמאל");

  await open(page, NUMBERS, "מה בא לפני");
  await failAt(page, "בא לפני 4");
  expect(await ticks(page), "0 should be off the window here").not.toContain(0);
  expect(await page.locator(".figure-caption").innerText()).toContain("מחוץ לתמונה");
});

test("no picture or step tells a child something is far without saying from what", async ({
  page,
}) => {
  // "רחוק יותר לא אומר כלום." The whole screen, not just the caption — the phrase lived
  // in the steps too, and fixing only the picture would have left two languages on one
  // screen for the same idea.
  await open(page, NUMBERS, "מה גדול יותר");
  await failAt(page, "גדול יותר, 13 או 18");

  const explanation = await page.locator(".explanation").innerText();
  expect(explanation, "an unanchored distance survived").not.toMatch(/רחוק(?!\S*\s+\S*\s*מ)/);
  expect(explanation).toContain("ימינה");
});

test("the strip of twenty fills what the question starts from and leaves the answer empty", async ({
  page,
}) => {
  // "צריך פה ציור של 20 כדורים, 13 צבועים ו-7 ריקים."
  await open(page, PLACE, "כמה חסר עד עשרים");
  await failAt(page, "להוסיף ל-13");

  await expect(page.locator(".twenty-strip")).toBeVisible();
  await expect(page.locator(".ts-dot")).toHaveCount(20);
  await expect(page.locator(".ts-dot.filled")).toHaveCount(13);
  // And no ten-frame: the two shapes partition this topic, they do not stack.
  await expect(page.locator(".ten-frame")).toHaveCount(0);
});

test("the place-value explanation calls the digits by their names", async ({ page }) => {
  // "מידי פעם צריך להזכיר שהיחידות היא הימנית והעשרות היא השמאלית" — the questions ask in
  // that vocabulary, so the explanation has to answer in it.
  await open(page, PLACE, "איזו ספרה גדולה יותר");
  await failAt(page, "במספר 16, בכמה");

  const method = await page.locator(".explanation-method").innerText();
  expect(method).toContain("השמאלית");
  expect(method).toContain("העשרות");
  expect(method).toContain("הימנית");
  expect(method).toContain("היחידות");
});

// ------------------------------------------------------------------------ the ten-frame

test("asking about units fills the loose ones, not the box", async ({ page }) => {
  await open(page, PLACE, "כמה יחידות");
  await failAt(page, "כמה יחידות יש במספר 13");

  await expect(page.locator(".ten-frame")).toBeVisible();
  await expect(page.locator(".tf-box")).toHaveCount(1);
  // Thirteen: ten inside the box, three loose. Only the three are filled.
  await expect(page.locator(".tf-dot")).toHaveCount(13);
  await expect(page.locator(".tf-dot.filled")).toHaveCount(3);
});

test("asking about tens fills the box, not the loose ones", async ({ page }) => {
  await open(page, PLACE, "כמה עשרות");
  await failAt(page, "כמה עשרות יש במספר 13");

  await expect(page.locator(".tf-dot")).toHaveCount(13);
  await expect(page.locator(".tf-dot.filled"), "the wrong side is filled").toHaveCount(10);
});

test("the ten-frame comes before the vertical sum on the one question that has both", async ({
  page,
}) => {
  await open(page, PLACE, "עשר ועוד");
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
  // These five are about the gap between two digits. One box of ten describes a number,
  // not a comparison between its digits, and the absence is deliberate.
  //
  // The five "completing to twenty" questions used to sit in the same hard level and had
  // no picture either; they now have their own — a strip of twenty — so naming the style
  // instead of the level is what keeps this test about the questions it was written for.
  await open(page, PLACE, "איזו ספרה גדולה יותר");

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
  await open(page, NUMBERS, "מה בא אחרי");
  await failAt(page, "בא אחרי 12");
  // The caption is two lines and the label is one string: it is one picture, so a screen
  // reader gets one description. Whitespace is normalised because that difference is the
  // rendering, not the content.
  const flat = (s: string | null) => (s ?? "").replace(/\s+/g, " ").trim();
  const lineCaption = await page.locator(".figure-caption").innerText();
  expect(flat(await page.locator(".number-line").getAttribute("aria-label"))).toBe(flat(lineCaption));

  await open(page, PLACE, "כמה יחידות");
  await failAt(page, "כמה יחידות יש במספר 13");
  const frameCaption = await page.locator(".figure-caption").innerText();
  expect(flat(await page.locator(".ten-frame").getAttribute("aria-label"))).toBe(flat(frameCaption));
});

test("the captions are sentences, not lists of numbers", async ({ page }) => {
  // Mika cannot read the screen, so the caption is her channel — it is what the
  // read-aloud says in place of the picture.
  await open(page, NUMBERS, "מה בא אחרי");
  await failAt(page, "בא אחרי 12");

  const caption = await page.locator(".figure-caption").innerText();
  expect(caption.split(/\s+/).length, "the caption is too terse to be spoken").toBeGreaterThan(4);
  // Two sentences now: what the line is, then what this question shows on it. The first
  // is the same every time on purpose — repetition is how a rule is learned by a child
  // who cannot read the screen.
  expect(caption).toContain("זהו ציר המספרים");
});
