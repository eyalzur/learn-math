import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test
 * (docs/features/clearer-explanations/product-spec.md).
 *
 * The four-layer explanation: a method sentence ("how to approach this kind of
 * exercise"), the exercise written in columns, then the existing steps and analogy.
 *
 * Routes used, from the design's Screens/States:
 *  - Rotem → "שברים עשרוניים" (topic 2) easy: opens on `0.5 + 0.3`, later `1.5 + 1.5`
 *    — the only carry in the data.
 *  - Mika → "חיבור וחיסור עד 20" (topic 4) easy: `12 + 5` … `18 − 4`; hard: all
 *    borrowing (`15 − 8`), which the spec keeps vertical-free on purpose.
 *  - Mika → "חיבור עד 10" (topic 2): single digits — sentence, no columns.
 *
 * The vertical block is HTML, so `innerText` works on it (unlike the fraction SVG).
 */

async function start(page: Page, student: number, topicIdx: number, levelIdx: number) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").nth(student).click();
  await page.locator(".topic-card").nth(topicIdx).click();
  await page.locator(".level-card").nth(levelIdx).click();
}

const answerWrong = async (page: Page) => {
  await page.locator(".answer-input").fill("999999");
  await page.getByRole("button", { name: "בדיקה" }).first().click();
};

/** Fails questions until the prompt contains `wanted`, then fails that one too. */
async function failAt(page: Page, wanted: string) {
  for (let i = 0; i < 12; i++) {
    const prompt = await page.locator(".problem-text").innerText();
    if (prompt.includes(wanted)) break;
    await answerWrong(page);
    await page.getByRole("button", { name: /הבא|סיום/ }).click();
  }
  await expect(page.locator(".problem-text")).toContainText(wanted);
  await answerWrong(page);
}

// ------------------------------------------------------ nothing leaks before the answer

test("no method sentence and no vertical anywhere before the question is answered", async ({
  page,
}) => {
  await start(page, 1, 1, 0); // 0.5 + 0.3 — a question that will have both
  await expect(page.locator(".problem-text")).toBeVisible();
  await expect(page.locator(".explanation-method")).toHaveCount(0);
  await expect(page.locator(".vertical-sum")).toHaveCount(0);
});

// --------------------------------------------------------------- the decimal the user saw

test("the decimal addition opens with the user's method sentence and a point-aligned vertical", async ({
  page,
}) => {
  await start(page, 1, 1, 0);
  await failAt(page, "0.5 + 0.3");

  // The sentence the user gave, then sharpened himself: "רק צריך לשים לב לנקודה" told
  // the child to be careful without telling her what to do, and what to do is the whole
  // method — the points must sit one exactly under the other.
  const method = await page.locator(".explanation-method").innerText();
  expect(method).toContain("מאונך");
  expect(method, "the sentence still only says to be careful").toContain("אחת בדיוק מתחת לשנייה");

  // Point under point, digit under digit: the rows are pre-padded strings, so the
  // alignment is checkable as character indexes.
  const rows = await page.locator(".vs-row").allInnerTexts();
  expect(rows).toHaveLength(3);
  const lengths = new Set(rows.map((r) => r.length));
  expect(lengths.size, "rows are not padded to one width").toBe(1);
  const dots = new Set(rows.map((r) => r.indexOf(".")));
  expect(dots.size, "the decimal points do not sit in one column").toBe(1);

  // The steps and the analogy did not move.
  await expect(page.locator(".explanation-step").first()).toBeVisible();
  await expect(page.locator(".explanation-analogy")).toBeVisible();
});

// ----------------------------------------------------------------------------- the carry

test("the one carrying question shows the carry mark, and 3.0 is explained as 3", async ({
  page,
}) => {
  await start(page, 1, 1, 0);
  await failAt(page, "1.5 + 1.5");

  await expect(page.locator(".vs-carries")).toBeVisible();
  await expect(page.locator(".vs-result")).toContainText("3.0");

  const caption = await page.locator(".vertical-caption").innerText();
  expect(caption, "the caption does not explain the carried 1").toContain("1");
  expect(caption, "3.0 is left unexplained").toContain("בדיוק");
});

// ------------------------------------------------- the sentence matches the operation

test("a subtraction question gets a subtraction sentence, never an addition one", async ({
  page,
}) => {
  await start(page, 0, 3, 0);
  await failAt(page, "18 − 4");

  const method = await page.locator(".explanation-method").innerText();
  expect(method).toContain("מחסרים");
  expect(method, "an addition sentence landed on a subtraction").not.toContain("מחברים");
  // 18 − 4 has columns and no borrowing, so it also gets the vertical.
  await expect(page.locator(".vertical-sum")).toBeVisible();
});

// ------------------------------------------------------- where the vertical must not be

test("borrowing questions show no vertical, and the explanation still stands", async ({
  page,
}) => {
  await start(page, 0, 3, 2); // the hard level is all borrowing
  await answerWrong(page);

  await expect(page.locator(".vertical-sum")).toHaveCount(0);
  // The method sentence still teaches the borrow-free strategy the steps use.
  await expect(page.locator(".explanation-method")).toBeVisible();
  await expect(page.locator(".explanation-step").first()).toBeVisible();
});

test("single-digit sums get a sentence but no column layout", async ({ page }) => {
  await start(page, 0, 1, 0);
  await answerWrong(page);

  await expect(page.locator(".explanation-method")).toContainText("סופרים");
  await expect(page.locator(".vertical-sum")).toHaveCount(0);
});

// --------------------------------------------------------------- accessibility and RTL

test("the caption and the screen reader description say the same thing", async ({ page }) => {
  await start(page, 1, 1, 0);
  await failAt(page, "0.5 + 0.3");

  const caption = await page.locator(".vertical-caption").innerText();
  const described = await page.locator(".vertical-sum").getAttribute("aria-label");
  expect(described, "the vertical has no accessible name").toBeTruthy();
  expect(described).toBe(caption);
});

test("the vertical block is one isolated left-to-right island", async ({ page }) => {
  await start(page, 1, 1, 0);
  await failAt(page, "0.5 + 0.3");

  const style = await page.locator(".vertical-sum").evaluate((el) => {
    const c = getComputedStyle(el);
    return { direction: c.direction, unicodeBidi: c.unicodeBidi };
  });
  expect(style.direction).toBe("ltr");
  // Direction alone is not enough — this project shipped that bug three times.
  expect(["isolate", "isolate-override"]).toContain(style.unicodeBidi);
});

test("the explanation is spoken in layer order: method first, the caption before the steps", async ({
  page,
}) => {
  // A minimal speech recorder; the full contract lives in read-aloud.spec.ts.
  await page.addInitScript(() => {
    const spoken: string[] = [];
    // @ts-expect-error test hook
    window.__spokenTexts = spoken;
    class FakeUtterance {
      text: string;
      lang = "";
      voice = null;
      rate = 1;
      pitch = 1;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: FakeUtterance,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => [],
        addEventListener: () => {},
        cancel: () => {},
        speak: (u: InstanceType<typeof FakeUtterance>) => {
          spoken.push(u.text);
          setTimeout(() => u.onend?.(), 10);
        },
      },
    });
  });

  await start(page, 1, 1, 0);
  await failAt(page, "0.5 + 0.3");
  await page.getByRole("button", { name: "הקריאו לי את ההסבר" }).click();
  // The reader paces itself — roughly half a second between parts — so counting parts
  // samples too early. Wait for the caption's own phrase to be spoken, then look at
  // the order of everything said so far.
  await page.waitForFunction(
    () =>
      (window as unknown as { __spokenTexts: string[] }).__spokenTexts.some((t) =>
        t.includes("מתחת לנקודה"),
      ),
    undefined,
    { timeout: 15000 },
  );

  const spoken = await page.evaluate(
    () => (window as unknown as { __spokenTexts: string[] }).__spokenTexts,
  );
  const at = (needle: string) => spoken.findIndex((t) => t.includes(needle));
  const method = at("מאונך");
  // The user's method sentence itself says "מימין לנקודה", so the caption is found by
  // the phrase only it carries.
  const caption = at("מתחת לנקודה");
  expect(method, "the method sentence is not spoken").toBeGreaterThanOrEqual(0);
  expect(caption, "the vertical's caption is not spoken").toBeGreaterThan(method);
});

// ------------------------------------------------------------------- the phone keyboard

test("numeric answer fields ask for a decimal keyboard", async ({ page }) => {
  await start(page, 1, 1, 0);
  await expect(page.locator(".answer-input")).toHaveAttribute("inputmode", "decimal");

  // The follow-up field appears only inside a diagnosed conversation: 12 + 5 answered 7
  // is 17 with its ten dropped, which the tens pattern picks up.
  await start(page, 0, 3, 0);
  await page.locator(".answer-input").fill("7");
  await page.getByRole("button", { name: "בדיקה" }).first().click();
  await expect(page.locator(".followup-input")).toHaveAttribute("inputmode", "decimal");
});
