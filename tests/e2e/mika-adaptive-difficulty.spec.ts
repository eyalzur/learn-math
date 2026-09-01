import { test, expect, type Page } from "@playwright/test";
import { answerViaNotebook } from "./helpers/notebookAnswer";

/**
 * Acceptance criteria under test (docs/features/mika-adaptive-difficulty/product-spec.md),
 * mirroring tests/e2e/adaptive-difficulty.spec.ts's own coverage of חיבור עד 1000 — this is
 * the same mechanism, applied to three more of Mika's topics: חיבור עד 10, חיסור עד 10
 * (grade א׳) and חיסור עד 1000 (grade ב׳).
 *
 *  1. Each topic skips the level picker entirely and lands straight on a 20-question
 *     practice session.
 *  2. The difficulty responds to real-time success: a run of correct answers should
 *     eventually reach the topic's hardest pattern, a run of wrong answers should not.
 *  3. A generated question still carries two hints and shows a real explanation after a
 *     wrong answer.
 *  4. Questions vary between sessions, even starting from the same initial difficulty.
 *  5. History keeps recording the topic, without inventing a level label that no longer
 *     exists.
 */

const MIKA = 0;

interface AdaptiveTopic {
  gradeIndex: number; // which of Mika's .grade-card entries (0 = א׳, 1 = ב׳)
  name: string;
  operator: "+" | "−";
  /** Whether this question's operands put it at the topic's hardest tier. */
  atHardestTier: (a: number, b: number) => boolean;
}

const TOPICS: AdaptiveTopic[] = [
  {
    gradeIndex: 0,
    name: "חיבור עד 10",
    operator: "+",
    atHardestTier: (a, b) => a + b >= 9,
  },
  {
    gradeIndex: 0,
    name: "חיסור עד 10",
    operator: "−",
    atHardestTier: (a) => a >= 9, // a is the minuend
  },
  {
    gradeIndex: 1,
    name: "חיסור עד 1000",
    operator: "−",
    // Needs borrowing — the topic's hardest mechanic, mirroring add100's carrying check.
    atHardestTier: (a, b) => a % 10 < b % 10,
  },
];

async function open(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

async function toGrade(page: Page, gradeIndex: number) {
  await page.locator(".student-card").nth(MIKA).click();
  await page.locator(".grade-card").nth(gradeIndex).click();
}

async function enterTopic(page: Page, topic: AdaptiveTopic) {
  await toGrade(page, topic.gradeIndex);
  await page.locator(".topic-card", { hasText: topic.name }).click();
}

function operands(prompt: string, operator: "+" | "−"): [number, number] {
  const escaped = operator === "+" ? "\\+" : "−";
  const m = prompt.trim().match(new RegExp(`^(\\d+)\\s*${escaped}\\s*(\\d+)\\s*=?$`));
  if (!m) throw new Error(`not a bare "${operator}" expression: "${prompt}"`);
  return [Number(m[1]), Number(m[2])];
}

async function currentOperands(page: Page, topic: AdaptiveTopic): Promise<[number, number]> {
  return operands(await page.locator(".problem-text").innerText(), topic.operator);
}

const computeAnswer = (topic: AdaptiveTopic, a: number, b: number) =>
  topic.operator === "+" ? a + b : a - b;

async function answer(page: Page, value: number) {
  await answerViaNotebook(page, value);
  await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
}

test.beforeEach(async ({ page }) => {
  await open(page);
});

for (const topic of TOPICS) {
  test(`${topic.name} skips the level picker and lands straight on a 20-question practice`, async ({
    page,
  }) => {
    await enterTopic(page, topic);

    await expect(page.locator(".level-card")).toHaveCount(0);
    await expect(page.locator(".problem-text")).toBeVisible();
    await expect(page.locator(".progress")).toContainText("מתוך 20");
  });

  test(`${topic.name}: a streak of correct answers reaches the hardest tier, a streak of wrong answers never does`, async ({
    page,
  }) => {
    // Run A: never answer correctly — difficulty can only back off, so no question in
    // this run should land on the topic's hardest pattern. Runs the full 20-question
    // session so it actually reaches the result screen below.
    await enterTopic(page, topic);
    const wrongRunHardest: boolean[] = [];
    for (let i = 0; i < 20; i++) {
      const [a, b] = await currentOperands(page, topic);
      wrongRunHardest.push(topic.atHardestTier(a, b));
      await answer(page, computeAnswer(topic, a, b) + 1000); // guaranteed wrong
    }
    expect(wrongRunHardest.some(Boolean), "a streak of wrong answers still reached the hardest tier").toBe(
      false,
    );
    await expect(page.locator(".result")).toBeVisible();

    // Run B: always answer correctly — difficulty should climb, so somewhere in the run
    // at least one question should land on the hardest tier.
    await page.getByRole("button", { name: "חזרה לתפריט" }).click();
    await page.locator(".topic-card", { hasText: topic.name }).click();
    const correctRunHardest: boolean[] = [];
    for (let i = 0; i < 12; i++) {
      const [a, b] = await currentOperands(page, topic);
      correctRunHardest.push(topic.atHardestTier(a, b));
      await answer(page, computeAnswer(topic, a, b));
    }
    expect(correctRunHardest.some(Boolean), "a streak of correct answers never reached the hardest tier").toBe(
      true,
    );
  });

  test(`${topic.name}: a generated question still has two hints and shows a real explanation after a wrong answer`, async ({
    page,
  }) => {
    await enterTopic(page, topic);

    await expect(page.locator(".hint-button")).toBeVisible();
    await page.locator(".hint-button").click();
    await expect(page.locator(".hint")).toHaveCount(1);
    await page.locator(".hint-button").click();
    await expect(page.locator(".hint")).toHaveCount(2);
    await expect(page.locator(".hint-button")).toHaveCount(0);

    const [a, b] = await currentOperands(page, topic);
    await answerViaNotebook(page, computeAnswer(topic, a, b) + 1000);

    await expect(page.locator(".feedback.wrong")).toBeVisible();
    await expect(page.locator(".explanation")).toContainText(String(a));
  });

  test(`${topic.name}: questions vary between sessions, even at the same starting difficulty`, async ({
    page,
  }) => {
    await toGrade(page, topic.gradeIndex);

    const seen = new Set<string>();
    for (let i = 0; i < 6; i++) {
      await page.locator(".topic-card", { hasText: topic.name }).click();
      seen.add((await page.locator(".problem-text").innerText()).trim());
      await page.locator(".link-button").first().click(); // ← חזרה
    }
    expect(seen.size, "every fresh entry showed the exact same first question").toBeGreaterThan(1);
  });

  test(`${topic.name}: history records the topic without a level suffix`, async ({ page }) => {
    await enterTopic(page, topic);
    for (let i = 0; i < 20; i++) {
      const [a, b] = await currentOperands(page, topic);
      await answer(page, computeAnswer(topic, a, b));
    }
    await expect(page.locator(".result")).toBeVisible();

    await page.getByRole("button", { name: "חזרה לתפריט" }).click();
    // Mika always has more than one grade, so "← חזרה" from the topics screen lands on
    // the grade picker — which carries its own history link directly (see
    // topics-and-progress.spec.ts's "each student's history is their own").
    await page.getByRole("button", { name: "← חזרה" }).click();
    await page.getByRole("button", { name: "ההתקדמות שלי →" }).click();

    const row = page.locator(".history-row").first();
    await expect(row).toBeVisible();
    await expect(row.locator(".history-what")).toHaveText(topic.name);
    await expect(row.locator(".history-score")).toHaveText("20/20");
  });
}
