import { test, expect, type Page } from "@playwright/test";
import { answerViaNotebook } from "./helpers/notebookAnswer";

/**
 * Acceptance criteria under test (docs/features/grade2-clock/product-spec.md and
 * design.md):
 *
 *  1. "שעון וזמן" is adaptive — no level picker, straight into a 20-question practice,
 *     the same mechanism as the other three adaptive grade ב׳ topics.
 *  2. Every question shows an analog clock face next to the question itself, not only
 *     inside the post-answer explanation — the one deliberate exception to
 *     more-diagrams' "the picture only in the explanation" rule (see design.md).
 *  3. Every clock carries a non-empty aria-label describing the time in words.
 *  4. The first question of a fresh session is always the easy tier (one clock, round
 *     hour) — reading its face and answering with that hour is marked correct.
 *  5. A streak of correct answers reaches the hardest tier: two clocks, captioned
 *     "התחלה"/"סיום".
 *  6. "התחלה" renders visually to the right of "סיום" — the time-axis RTL decision from
 *     design.md, mirroring the number line's own left-to-right decision.
 *  7. The clock face is not duplicated after a wrong answer reveals the explanation
 *     panel — it was already on screen, above it.
 *  8. Every clock's `<svg>` is direction:ltr, the same RTL/LTR guard every diagram in
 *     this app needs.
 *  9. The lesson (📖) screen shows the clock too, for all three difficulty tiers.
 */

const MIKA = 0;
const GRADE_B = 1;

const HOUR_WORD_TO_NUM: Record<string, number> = {
  אחת: 1,
  שתיים: 2,
  שלוש: 3,
  ארבע: 4,
  חמש: 5,
  שש: 6,
  שבע: 7,
  שמונה: 8,
  תשע: 9,
  עשר: 10,
  "אחת עשרה": 11,
  "שתים עשרה": 12,
};

async function open(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

async function enterClock(page: Page) {
  await page.locator(".student-card").nth(MIKA).click();
  await page.locator(".grade-card").nth(GRADE_B).click();
  await page.locator(".topic-card", { hasText: "שעון וזמן" }).click();
}

/** Reads a single clock's aria-label the way a child would read the picture itself —
 *  "השעון מראה <hour>" or "...חצי שעה אחרי <hour>" — and returns the hour it names. Never
 *  reads anything off internal data; if this ever disagreed with the actual hour drawn,
 *  that would be exactly the bug docs/features/grade2-clock/architecture.md worries about
 *  ("the picture doesn't match what the question asks"). */
function hourFromLabel(label: string): number {
  const m = label.match(/(אחת עשרה|שתים עשרה|אחת|שתיים|שלוש|ארבע|חמש|שש|שבע|שמונה|תשע|עשר)$/);
  if (!m) throw new Error(`no hour word found in "${label}"`);
  return HOUR_WORD_TO_NUM[m[1]];
}

async function answer(page: Page, value: number) {
  await answerViaNotebook(page, value);
  await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
}

/** Answers correctly, by reading the current single clock's face, until the two-clock
 *  duration tier shows up (or gives up after a generous number of rounds — the same
 *  budget mika-adaptive-difficulty.spec.ts uses for the other three adaptive topics). */
async function climbToHardestTier(page: Page) {
  for (let i = 0; i < 12; i++) {
    if (await page.locator(".clock-pair").count()) return;
    const label = await page.locator(".clock-face").getAttribute("aria-label");
    await answer(page, hourFromLabel(label!));
  }
}

test.beforeEach(async ({ page }) => {
  await open(page);
});

test("שעון וזמן skips the level picker and lands straight on a 20-question practice", async ({
  page,
}) => {
  await enterClock(page);
  await expect(page.locator(".level-card")).toHaveCount(0);
  await expect(page.locator(".problem-text")).toBeVisible();
  await expect(page.locator(".progress")).toContainText("מתוך 20");
});

test("every question shows a clock face next to the question itself, with an aria-label", async ({
  page,
}) => {
  await enterClock(page);
  const face = page.locator(".clock-face").first();
  await expect(face).toBeVisible();
  await expect(face).toHaveAttribute("role", "img");
  const label = await face.getAttribute("aria-label");
  expect(label?.trim().length ?? 0).toBeGreaterThan(0);
});

test("the first question of a fresh session is the easy tier, and reading its face correctly is marked right", async ({
  page,
}) => {
  await enterClock(page);
  await expect(page.locator(".clock-pair")).toHaveCount(0); // one clock, not two — easy tier
  const label = await page.locator(".clock-face").getAttribute("aria-label");
  await answerViaNotebook(page, hourFromLabel(label!));
  await expect(page.locator(".feedback.correct")).toBeVisible();
});

test("a streak of correct answers reaches the hardest tier — two clocks, התחלה/סיום", async ({
  page,
}) => {
  await enterClock(page);
  await climbToHardestTier(page);
  await expect(page.locator(".clock-pair"), "a streak of correct answers never reached the duration tier").toHaveCount(1);
  await expect(page.locator(".clock-pair-caption")).toHaveCount(2);
  await expect(page.locator(".clock-pair-caption").nth(0)).toHaveText("התחלה");
  await expect(page.locator(".clock-pair-caption").nth(1)).toHaveText("סיום");
});

test("in the hardest tier, התחלה sits visually to the right of סיום", async ({ page }) => {
  await enterClock(page);
  await climbToHardestTier(page);
  await expect(page.locator(".clock-pair")).toHaveCount(1);

  const items = page.locator(".clock-pair-item");
  const startX = await items.nth(0).evaluate((el) => el.getBoundingClientRect().x);
  const endX = await items.nth(1).evaluate((el) => el.getBoundingClientRect().x);
  expect(startX, "התחלה is not to the right of סיום").toBeGreaterThan(endX);
});

test("the clock face is not duplicated after a wrong answer reveals the explanation", async ({
  page,
}) => {
  await enterClock(page);
  await answerViaNotebook(page, 9999); // guaranteed wrong for any hour or minute-count answer
  await expect(page.locator(".feedback.wrong")).toBeVisible();
  await expect(page.locator(".explanation")).toBeVisible();
  await expect(page.locator(".clock-face")).toHaveCount(1);
});

test("every clock's svg renders left-to-right, inside the RTL page", async ({ page }) => {
  await enterClock(page);
  const svg = page.locator(".clock-svg").first();
  const direction = await svg.evaluate((el) => getComputedStyle(el).direction);
  expect(direction).toBe("ltr");
});

test("the lesson (📖) screen shows the clock face too, for every difficulty tier", async ({
  page,
}) => {
  await page.locator(".student-card").nth(MIKA).click();
  await page.locator(".grade-card").nth(GRADE_B).click();
  const row = page.locator(".topic-row", { has: page.locator(".topic-card", { hasText: "שעון וזמן" }) });
  await row.locator(".lesson-link").click();

  // Easy tier's example.
  await expect(page.locator(".clock-face")).toHaveCount(1);
  await expect(page.locator(".clock-pair")).toHaveCount(0);

  // Medium tier's example.
  await page.getByRole("button", { name: "הבא →" }).click();
  await expect(page.locator(".clock-face")).toHaveCount(1);
  await expect(page.locator(".clock-pair")).toHaveCount(0);

  // Hard tier's example — two clocks, captioned התחלה/סיום.
  await page.getByRole("button", { name: "הבא →" }).click();
  await expect(page.locator(".clock-pair")).toHaveCount(1);
  await expect(page.locator(".clock-pair-caption").nth(0)).toHaveText("התחלה");
  await expect(page.locator(".clock-pair-caption").nth(1)).toHaveText("סיום");
});
