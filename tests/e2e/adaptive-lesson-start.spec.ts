import { test, expect, type Page } from "@playwright/test";
import { answerViaNotebook } from "./helpers/notebookAnswer";

/**
 * Acceptance criteria under test (docs/features/adaptive-lesson-start/product-spec.md):
 *
 *  1. First-ever visit to an adaptive topic still starts at the easiest tier — no
 *     regression from today's behavior (docs/features/adaptive-difficulty/).
 *  2. A repeat visit resumes from the difficulty tier last reached in that topic, instead
 *     of always resetting to the easiest — whether the previous visit ended by leaving
 *     early (back button) or by finishing the full session.
 *  3. A different adaptive topic for the same student is unaffected by another topic's
 *     saved tier — each topic's resumed difficulty is independent.
 *  4. History that predates this feature (no saved tier at all) behaves exactly like a
 *     first-ever visit — old history isn't reinterpreted or migrated.
 *
 * Reuses the same "parse the prompt's operands, check whether this needs carrying" proxy
 * for difficulty tier that tests/e2e/adaptive-difficulty.spec.ts already uses for this
 * exact topic (חיבור עד 1000) — not a new mechanism, just applied to a new question:
 * does a *repeat* visit's first question still land on the easy end, or does it reflect
 * where the previous visit left off.
 */

const MIKA = 0;
const GRADE_B = 1; // כיתה ב׳

async function open(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

async function toGradeB(page: Page) {
  await page.locator(".student-card").nth(MIKA).click();
  await page.locator(".grade-card").nth(GRADE_B).click();
}

async function enterAdd100(page: Page) {
  await toGradeB(page);
  await page.locator(".topic-card", { hasText: "חיבור עד 1000" }).click();
}

async function enterSub100(page: Page) {
  await toGradeB(page);
  await page.locator(".topic-card", { hasText: "חיסור עד 1000" }).click();
}

function addOperands(prompt: string): [number, number] {
  const m = prompt.trim().match(/^(\d+)\s*\+\s*(\d+)\s*=?$/);
  if (!m) throw new Error(`not a bare addition: "${prompt}"`);
  return [Number(m[1]), Number(m[2])];
}

function subOperands(prompt: string): [number, number] {
  const m = prompt.trim().match(/^(\d+)\s*[−-]\s*(\d+)\s*=?$/);
  if (!m) throw new Error(`not a bare subtraction: "${prompt}"`);
  return [Number(m[1]), Number(m[2])];
}

const needsCarrying = ([a, b]: [number, number]) => (a % 10) + (b % 10) >= 10;
const needsBorrowing = ([a, b]: [number, number]) => a % 10 < b % 10;

async function currentAddOperands(page: Page): Promise<[number, number]> {
  return addOperands(await page.locator(".problem-text").innerText());
}

async function currentSubOperands(page: Page): Promise<[number, number]> {
  return subOperands(await page.locator(".problem-text").innerText());
}

async function answerAdd(page: Page, a: number, b: number) {
  await answerViaNotebook(page, a + b);
  await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
}

/** Answers add100 questions correctly until a question actually needing carrying shows
 *  up — proof the tier climbed, not just "we answered a bunch of times". Bounded well
 *  under the 20-question session so the caller can still choose how the session ends. */
async function climbAddUntilCarrying(page: Page) {
  for (let i = 0; i < 15; i++) {
    const ops = await currentAddOperands(page);
    if (needsCarrying(ops)) return;
    await answerAdd(page, ops[0], ops[1]);
  }
  throw new Error("never reached a carrying question after 15 correct answers in a row");
}

test.beforeEach(async ({ page }) => {
  await open(page);
});

test("a first-ever visit to an adaptive topic starts at the easiest tier", async ({ page }) => {
  await enterAdd100(page);
  const ops = await currentAddOperands(page);
  expect(needsCarrying(ops), `expected an easy first question, got ${ops[0]} + ${ops[1]}`).toBe(false);
});

test("leaving mid-session through the back button still resumes from the reached tier next time", async ({
  page,
}) => {
  await enterAdd100(page);
  await climbAddUntilCarrying(page);
  // Mid-session, not finished — the back button, not "סיום".
  await page.getByRole("button", { name: "← חזרה" }).click();

  await page.locator(".topic-card", { hasText: "חיבור עד 1000" }).click();
  const ops = await currentAddOperands(page);
  expect(needsCarrying(ops), `expected a resumed (carrying) question, got ${ops[0]} + ${ops[1]}`).toBe(
    true,
  );
});

test("finishing a full session also resumes from the reached tier next time", async ({ page }) => {
  await enterAdd100(page);
  await climbAddUntilCarrying(page);
  // Finish the rest of the 20-question session rather than leaving early.
  let reachedResult = false;
  for (let i = 0; i < 20 && !reachedResult; i++) {
    const resultVisible = await page.locator(".result").isVisible();
    if (resultVisible) {
      reachedResult = true;
      break;
    }
    const ops = await currentAddOperands(page);
    await answerAdd(page, ops[0], ops[1]);
  }
  await expect(page.locator(".result")).toBeVisible();
  await page.getByRole("button", { name: "חזרה לתפריט" }).click();

  await page.locator(".topic-card", { hasText: "חיבור עד 1000" }).click();
  const ops = await currentAddOperands(page);
  expect(needsCarrying(ops), `expected a resumed (carrying) question, got ${ops[0]} + ${ops[1]}`).toBe(
    true,
  );
});

test("a different adaptive topic for the same student is unaffected by another topic's saved tier", async ({
  page,
}) => {
  await enterAdd100(page);
  await climbAddUntilCarrying(page);
  await page.getByRole("button", { name: "← חזרה" }).click();

  // חיסור עד 1000 — a sibling adaptive topic, never visited before in this test.
  await page.locator(".topic-card", { hasText: "חיסור עד 1000" }).click();
  const ops = await currentSubOperands(page);
  expect(needsBorrowing(ops), `expected an easy first question, got ${ops[0]} − ${ops[1]}`).toBe(false);
});

test("history from before this feature (no saved tier) behaves like a first-ever visit", async ({
  page,
}) => {
  // Simulates a student who already has practice history, written before this feature
  // existed — the old history format carries no difficulty tier at all. This should not
  // crash and should not be reinterpreted as "start hard" or anything else — just the
  // same easy-tier fallback as truly no history.
  await page.evaluate(() => {
    localStorage.setItem(
      "learn-math:history",
      JSON.stringify([
        {
          at: new Date().toISOString(),
          studentId: "mika",
          gradeLabel: "כיתה ב׳",
          topicTitle: "חיבור עד 1000",
          levelTitle: "",
          correct: 18,
          total: 20,
        },
      ]),
    );
  });
  await page.goto("/learn-math/");
  await enterAdd100(page);
  const ops = await currentAddOperands(page);
  expect(needsCarrying(ops), `expected an easy first question, got ${ops[0]} + ${ops[1]}`).toBe(false);
});
