import { test, expect, type Page } from "@playwright/test";
import { answerViaNotebook } from "./helpers/notebookAnswer";

/**
 * Acceptance criteria under test
 * (docs/features/fraction-diagram/product-spec.md).
 *
 * Rotem's "שברים פשוטים" used to be reached level by level, with specific written
 * questions at specific indexes. It is now an adaptive topic (see
 * docs/features/levels-as-practice) — no level picker, and a random question generated
 * on entry. These tests were rewritten against that: they read whatever prompt actually
 * appears and compute the expected diagram from it, using the same phrase table
 * `fractionDiagram.ts` itself recognizes (`כמה זה <phrase> מ-<N>?`), rather than assuming
 * a fixed question.
 *
 * `innerText` returns undefined on SVG elements, so slice values are read with
 * `textContent` through `evaluateAll`.
 */

const ROTEM = 1;

/** Mirrors the phrase table `src/data/fractionDiagram.ts` recognizes — the ten shapes
 *  the two easiest generator tiers ("שברים פשוטים") can produce. */
const PHRASES: [string, number, number][] = [
  ["ארבע שביעיות", 4, 7],
  ["ארבע חמישיות", 4, 5],
  ["שלוש שמיניות", 3, 8],
  ["שלוש חמישיות", 3, 5],
  ["שלושה רבעים", 3, 4],
  ["שתי חמישיות", 2, 5],
  ["שני שלישים", 2, 3],
  ["חמש שישיות", 5, 6],
  ["חמישית", 1, 5],
  ["שמינית", 1, 8],
  ["שביעית", 1, 7],
  ["שישית", 1, 6],
  ["שליש", 1, 3],
  ["רבע", 1, 4],
  ["חצי", 1, 2],
];

/** Parses "כמה זה <phrase> מ-<N>?" into its numerator/denominator/whole/answer, or null
 *  for a prompt shape the circle cannot describe. */
function parseFractionPrompt(prompt: string): { numerator: number; denominator: number; whole: number; answer: number } | null {
  const m = prompt.trim().match(/^כמה זה (.+) מ-(\d+)\?$/);
  if (!m) return null;
  const found = PHRASES.find(([word]) => word === m[1].trim());
  if (!found) return null;
  const [, numerator, denominator] = found;
  const whole = Number(m[2]);
  return { numerator, denominator, whole, answer: (whole / denominator) * numerator };
}

async function openFractions(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").nth(ROTEM).click();
  await page.locator(".grade-card").nth(2).click(); // grade ו׳ (docs/features/any-grade-any-student)
  await page.locator(".topic-card").nth(0).click();
}

async function currentPrompt(page: Page): Promise<string> {
  return (await page.locator(".problem-text").innerText()).trim();
}

async function submit(page: Page, value: number) {
  await answerViaNotebook(page, value);
}

const answerWrong = (page: Page) => submit(page, 999999);

async function nextQuestion(page: Page) {
  await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
}

// ------------------------------------------------------- the picture never leaks

test("no diagram anywhere before the question is answered", async ({ page }) => {
  await openFractions(page);

  // This is the whole reason the picture lives in the explanation: a "כמה זה" question
  // carries its own answer in plain sight on the circle.
  await expect(page.locator(".fraction-circle")).toHaveCount(0);
  await expect(page.locator(".problem-text")).toBeVisible();
});

test("a correct answer shows no diagram", async ({ page }) => {
  await openFractions(page);

  // The first question is always the easiest tier — a single "כמה זה" shape — so it is
  // always describable and parseable.
  const parsed = parseFractionPrompt(await currentPrompt(page));
  expect(parsed, "the opening question is not the expected unit-fraction shape").not.toBeNull();
  await submit(page, parsed!.answer);

  await expect(page.locator(".feedback.correct")).toBeVisible();
  await expect(page.locator(".fraction-circle")).toHaveCount(0);
});

// ------------------------------------------------------- the picture matches the question

test("the slices match the denominator and the filled ones match the numerator", async ({ page }) => {
  // Walks several fresh entries so different denominators come up — an implementation
  // that always drew the same circle would sail through just one.
  const seenDenominators = new Set<number>();
  for (let i = 0; i < 8; i++) {
    await openFractions(page);
    const parsed = parseFractionPrompt(await currentPrompt(page));
    expect(parsed, "the opening question was not a describable fraction").not.toBeNull();
    const { numerator, denominator } = parsed!;
    await answerWrong(page);

    await expect(page.locator(".fraction-circle")).toBeVisible();
    await expect(page.locator(".slice")).toHaveCount(denominator);
    await expect(page.locator(".slice.taken")).toHaveCount(numerator);
    seenDenominators.add(denominator);
  }
  expect(seenDenominators.size, "every fresh entry landed on the same denominator").toBeGreaterThan(1);
});

test("every slice carries what one part is worth", async ({ page }) => {
  await openFractions(page);
  const parsed = parseFractionPrompt(await currentPrompt(page));
  expect(parsed).not.toBeNull();
  const { denominator, whole } = parsed!;
  await answerWrong(page);

  const values = await page.locator(".slice-value").evaluateAll((els) => els.map((el) => el.textContent));
  expect(values).toEqual(Array(denominator).fill(String(whole / denominator)));
});

// --------------------------------------------------- where no honest picture exists

test("questions the circle cannot describe get no circle, and still explain themselves", async ({ page }) => {
  // The generator's easiest two tiers are both "כמה זה" shapes (describable); the third
  // tier onward ("כמה חצאים יש בשני שלמים", and the like) is not. Three correct answers
  // in a row climbs from tier 1 to tier 3 (two to reach tier 2, one more to reach tier 3)
  // — see docs/features/levels-as-practice/architecture.md's difficulty mapping.
  await openFractions(page);
  let odd: { prompt: string } | null = null;
  for (let i = 0; i < 6 && !odd; i++) {
    const prompt = await currentPrompt(page);
    const parsed = parseFractionPrompt(prompt);
    if (parsed) {
      await submit(page, parsed.answer);
    } else {
      odd = { prompt };
      await expect(page.locator(".fraction-circle"), `${prompt} drew a circle`).toHaveCount(0);
      // Absence must not look like breakage: the explanation is still whole.
      await answerWrong(page);
      await expect(page.locator(".explanation")).toBeVisible();
      await expect(page.locator(".explanation-step").first()).toBeVisible();
    }
    if ((await page.getByRole("button", { name: /^(הבא|סיום)$/ }).count()) === 0) break;
    await nextQuestion(page);
  }

  expect(odd, "no odd-shaped question was reached in six questions").not.toBeNull();
});

// --------------------------------------------------------------- accessibility

test("the caption and the screen reader description say the same thing", async ({ page }) => {
  await openFractions(page);
  const parsed = parseFractionPrompt(await currentPrompt(page));
  expect(parsed).not.toBeNull();
  await answerWrong(page);

  const caption = await page.locator(".fraction-caption").innerText();
  const described = await page.locator(".fraction-circle").getAttribute("aria-label");

  expect(described, "the picture has no accessible name").toBeTruthy();
  // One string serves both, so a reader who cannot see the circle is not told something
  // different from what is printed under it.
  expect(described).toBe(caption);
  expect(caption).toContain(String(parsed!.whole));
});

test("numbers inside the slices read left to right", async ({ page }) => {
  await openFractions(page);
  expect(parseFractionPrompt(await currentPrompt(page))).not.toBeNull();
  await answerWrong(page);

  // An SVG does not inherit the page's direction habits, which is exactly where this
  // project's recurring bug likes to hide.
  const direction = await page
    .locator(".slice-value")
    .first()
    .evaluate((el) => getComputedStyle(el).direction);
  expect(direction).toBe("ltr");

  const svgDirection = await page.locator(".fraction-circle").evaluate((el) => getComputedStyle(el).direction);
  expect(svgDirection).toBe("ltr");
});

// ------------------------------------------------------------- nothing else moved

test("the written explanation is still there, above and below the picture", async ({ page }) => {
  await openFractions(page);
  expect(parseFractionPrompt(await currentPrompt(page))).not.toBeNull();
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
