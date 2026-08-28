import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test
 * (docs/features/clearer-explanations/product-spec.md).
 *
 * The four-layer explanation: a method sentence ("how to approach this kind of
 * exercise"), the exercise written in columns, then the existing steps and analogy.
 *
 * Routes used, from the design's Screens/States:
 *  - Rotem → "שברים עשרוניים" is now adaptive (no level picker — see
 *    docs/features/levels-as-practice), so these tests read whatever decimal-addition
 *    question the session actually generates (`enterDecimals`/`retryDecimalAddition`
 *    below) instead of assuming a fixed one.
 *  - Mika → "חיבור וחיסור עד 20" (topic 4) easy: `12 + 5` … `18 − 4`; hard: all
 *    borrowing (`15 − 8`), which the spec keeps vertical-free on purpose.
 *  - Mika → "חיבור עד 10" (topic 2): single digits — sentence, no columns.
 *
 * The vertical block is HTML, so `innerText` works on it (unlike the fraction SVG).
 */

/**
 * Grade 1's multi-style topics are entered by picking a style; a written-level topic
 * still asks for a level. Passing a string means "this style", a number means "this
 * level", `null` means "neither — an adaptive topic (docs/features/mika-adaptive-
 * difficulty) that lands straight on practice", so each call site says which screen it is
 * actually going through.
 */
async function start(page: Page, student: number, topicIdx: number, pick: number | string | null) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").nth(student).click();
  // Mika (student 0) now has two grades available; every route this file uses for her is
  // grade 1 (א׳). Rotem (student 1) has just the one grade and never sees this screen.
  if (student === 0) await page.locator(".grade-card").first().click();
  await page.locator(".topic-card").nth(topicIdx).click();
  if (pick === null) {
    // Adaptive: already on practice, nothing left to click.
  } else if (typeof pick === "string") {
    await page.locator(".style-card").filter({ hasText: pick }).first().click();
  } else {
    await page.locator(".level-card").nth(pick).click();
  }
}

/** Rotem's "שברים עשרוניים" — adaptive, so entering it lands straight on practice with a
 *  generated question rather than a chosen level. */
async function enterDecimals(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").nth(1).click(); // Rotem
  await page.locator(".topic-card").nth(1).click(); // שברים עשרוניים
}

const answerWrong = async (page: Page) => {
  await page.locator(".answer-input").fill("999999");
  await page.getByRole("button", { name: "בדיקה" }).first().click();
};

async function currentPrompt(page: Page): Promise<string> {
  return (await page.locator(".problem-text").innerText()).trim();
}

/** Reads the two decimal operands off a `"A + B"` prompt, and whether their tenths carry
 *  (sum to 10 or more) — the same distinction `verticalSum.ts` draws when it decides
 *  whether to show a carry mark and an "X.0 is exactly X" caption. */
function parseDecimalAddition(prompt: string): { a: string; b: string; carries: boolean } | null {
  const m = prompt.match(/^(\d+\.\d)\s*\+\s*(\d+\.\d)\s*=?$/);
  if (!m) return null;
  const tenths = (s: string) => Number(s.split(".")[1]);
  return { a: m[1], b: m[2], carries: tenths(m[1]) + tenths(m[2]) >= 10 };
}

/** Skips forward (answering wrong each time) until the current decimal-addition question
 *  matches `wantCarry`, then answers that one wrong too so its explanation is on screen.
 *  Every fresh question at this topic's starting difficulty is an addition (see
 *  `adaptiveDecimals.ts`), so this only ever needs to wait out the carry/no-carry coin
 *  flip, never a different shape entirely. */
async function failAtDecimalAddition(page: Page, wantCarry: boolean) {
  for (let i = 0; i < 20; i++) {
    const parsed = parseDecimalAddition(await currentPrompt(page));
    expect(parsed, "the opening tier of שברים עשרוניים is always an addition").not.toBeNull();
    if (parsed!.carries === wantCarry) {
      await answerWrong(page);
      return parsed!;
    }
    await answerWrong(page);
    await page.getByRole("button", { name: /הבא|סיום/ }).click();
  }
  throw new Error(`never saw a ${wantCarry ? "carrying" : "non-carrying"} decimal addition in 20 tries`);
}

// ------------------------------------------------------ nothing leaks before the answer

test("no method sentence and no vertical anywhere before the question is answered", async ({
  page,
}) => {
  await enterDecimals(page); // a decimal addition — a question that will have both
  await expect(page.locator(".problem-text")).toBeVisible();
  await expect(page.locator(".explanation-method")).toHaveCount(0);
  await expect(page.locator(".vertical-sum")).toHaveCount(0);
});

// --------------------------------------------------------------- the decimal the user saw

test("the decimal addition opens with the user's method sentence and a point-aligned vertical", async ({
  page,
}) => {
  await enterDecimals(page);
  await failAtDecimalAddition(page, false);

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

test("a carrying question shows the carry mark, and a whole-number result is explained as itself", async ({
  page,
}) => {
  await enterDecimals(page);
  const { a, b } = await failAtDecimalAddition(page, true);
  const wholeResult = Math.round((Number(a) + Number(b)) * 10) % 10 === 0;

  await expect(page.locator(".vs-carries")).toBeVisible();
  const caption = await page.locator(".vertical-caption").innerText();
  expect(caption, "the caption does not explain the carried 1").toContain("1");
  if (wholeResult) {
    // Column-honest ("3.0") but the answer is the plain whole number ("3") — the caption
    // has to say so, the same way it does for the written "1.5 + 1.5" = 3.
    await expect(page.locator(".vs-result")).toContainText(".0");
    expect(caption, "a column-honest .0 result is left unexplained").toContain("בדיוק");
  }
});

// ------------------------------------------------- the sentence matches the operation

test("a subtraction question gets a subtraction sentence, never an addition one", async ({
  page,
}) => {
  await start(page, 0, 3, "חיסור");
  const failAt = async (wanted: string) => {
    for (let i = 0; i < 12; i++) {
      const prompt = await currentPrompt(page);
      if (prompt.includes(wanted)) break;
      await answerWrong(page);
      await page.getByRole("button", { name: /הבא|סיום/ }).click();
    }
    await expect(page.locator(".problem-text")).toContainText(wanted);
    await answerWrong(page);
  };
  await failAt("18 − 4");

  const method = await page.locator(".explanation-method").innerText();
  expect(method).toContain("מחסרים");
  expect(method, "an addition sentence landed on a subtraction").not.toContain("מחברים");
  // 18 − 4 has columns and no borrowing, so it also gets the vertical.
  await expect(page.locator(".vertical-sum")).toBeVisible();
});

// ------------------------------------------------------- a single borrow draws too

test("a borrowing question shows the vertical with a borrow mark, and the explanation still stands", async ({
  page,
}) => {
  // A lesson now climbs from the easy end, so the borrowing questions are no longer
  // whatever comes first — walk to one by name.
  await start(page, 0, 3, "חיסור");
  for (let i = 0; i < 12; i++) {
    const prompt = await currentPrompt(page);
    if (prompt.includes("15 − 8")) break;
    await answerWrong(page);
    await page.getByRole("button", { name: /הבא|סיום/ }).click();
  }
  await expect(page.locator(".problem-text")).toContainText("15 − 8");
  await answerWrong(page);

  // One borrow is drawable — the neighbouring column shows its reduced digit, the
  // borrowing column shows the ten it received, same visual language as a carry.
  await expect(page.locator(".vs-carries")).toBeVisible();
  const caption = await page.locator(".vertical-caption").innerText();
  expect(caption, "the caption does not explain the borrow").toContain("שואלים");
  await expect(page.locator(".explanation-method")).toBeVisible();
  await expect(page.locator(".explanation-step").first()).toBeVisible();
});

test("single-digit sums get a sentence but no column layout", async ({ page }) => {
  // חיבור עד 10 is adaptive now (docs/features/mika-adaptive-difficulty), always starting
  // at its easiest tier — single-digit sums — so the first question already fits.
  await start(page, 0, 1, null);
  await answerWrong(page);

  await expect(page.locator(".explanation-method")).toContainText("סופרים");
  await expect(page.locator(".vertical-sum")).toHaveCount(0);
});

// --------------------------------------------------------------- accessibility and RTL

test("the caption and the screen reader description say the same thing", async ({ page }) => {
  await enterDecimals(page);
  await failAtDecimalAddition(page, false);

  const caption = await page.locator(".vertical-caption").innerText();
  const described = await page.locator(".vertical-sum").getAttribute("aria-label");
  expect(described, "the vertical has no accessible name").toBeTruthy();
  expect(described).toBe(caption);
});

test("the vertical block is one isolated left-to-right island", async ({ page }) => {
  await enterDecimals(page);
  await failAtDecimalAddition(page, false);

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

  await enterDecimals(page);
  // A non-carrying addition is the case whose caption says "מתחת לנקודה" — a carrying one
  // is phrased differently ("מעבירים 1 לעמודה הבאה"), so this needs that specific shape.
  await failAtDecimalAddition(page, false);
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
  await enterDecimals(page);
  await expect(page.locator(".answer-input")).toHaveAttribute("inputmode", "decimal");

  // The follow-up field appears only inside a diagnosed conversation: 12 + 5 answered 7
  // is 17 with its ten dropped, which the tens pattern picks up.
  await start(page, 0, 3, "חיבור");
  await page.locator(".answer-input").fill("7");
  await page.getByRole("button", { name: "בדיקה" }).first().click();
  await expect(page.locator(".followup-input")).toHaveAttribute("inputmode", "decimal");
});
