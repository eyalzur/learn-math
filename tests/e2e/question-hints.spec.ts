import { test, expect, type Page } from "@playwright/test";
import { answerViaNotebook } from "./helpers/notebookAnswer";

/**
 * Acceptance criteria under test
 * (docs/features/question-hints/product-spec.md):
 *  1. A hint can be asked for before the answer is checked.
 *  2. No hint shows itself — it appears only on request.
 *  3. First press gives the method hint; the second is a separate request.
 *  4. There is no third hint and no way to ask for one.
 *  5. Hints stay visible, including after the answer is checked.
 *  6. Moving to the next question starts over with nothing shown.
 *  7. Taking a hint does not change the score.
 *  8. After an answer is checked, no more hints can be asked for.
 *  9. A question with no written hints shows no button at all.
 *
 * "חיבור וחיסור עד 20" is the topic that has hints in this round; the other topics are
 * deliberately still without them, which is what test 9 relies on.
 */

const HINT = "רמז 💡";
const MORE_HINT = "עוד רמז 💡";

async function openTopic(page: Page, topicTitle: string) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").first().click();
  // Mika now has two grades available; every topic this file tests is grade 1 (א׳).
  await page.locator(".grade-card").first().click();
  await page.locator(".topic-card", { hasText: topicTitle }).click();
  // Grade 1's multi-style topics are entered by style; a written-level topic still asks
  // for a level; an adaptive topic (docs/features/mika-adaptive-difficulty) skips both
  // and lands straight on practice.
  const byStyle = page.locator(".style-card");
  const byLevel = page.locator(".level-card");
  if (await byStyle.count()) await byStyle.first().click();
  else if (await byLevel.count()) await byLevel.first().click();
}

const openHinted = (page: Page) => openTopic(page, "חיבור וחיסור עד 20");

test("a hint can be asked for before answering, and none shows itself", async ({ page }) => {
  await openHinted(page);

  await expect(page.locator(".hint")).toHaveCount(0);
  await expect(page.getByRole("button", { name: HINT })).toBeVisible();
});

test("the first press gives one hint, the second gives the other", async ({ page }) => {
  await openHinted(page);

  await page.getByRole("button", { name: HINT }).click();
  await expect(page.locator(".hint")).toHaveCount(1);
  const first = await page.locator(".hint").first().innerText();

  await page.getByRole("button", { name: MORE_HINT }).click();
  await expect(page.locator(".hint")).toHaveCount(2);

  // The first hint is still there and unchanged; the second is a different one.
  expect(await page.locator(".hint").first().innerText()).toBe(first);
  expect(await page.locator(".hint").nth(1).innerText()).not.toBe(first);
});

test("there is no third hint to ask for", async ({ page }) => {
  await openHinted(page);

  await page.getByRole("button", { name: HINT }).click();
  await page.getByRole("button", { name: MORE_HINT }).click();

  await expect(page.locator(".hint-button")).toHaveCount(0);
  await expect(page.locator(".hint")).toHaveCount(2);
});

test("hints stay on screen after the answer is checked", async ({ page }) => {
  await openHinted(page);

  await page.getByRole("button", { name: HINT }).click();
  await page.getByRole("button", { name: MORE_HINT }).click();

  await answerViaNotebook(page, 999999);

  // The mistake does not erase what the student tried with.
  await expect(page.locator(".hint")).toHaveCount(2);
});

test("no more hints can be asked for once an answer is checked", async ({ page }) => {
  await openHinted(page);

  await answerViaNotebook(page, 999999);

  await expect(page.locator(".hint-button")).toHaveCount(0);
});

test("the next question starts over with no hints shown", async ({ page }) => {
  await openHinted(page);

  await page.getByRole("button", { name: HINT }).click();
  await expect(page.locator(".hint")).toHaveCount(1);

  await answerViaNotebook(page, 999999);
  await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();

  await expect(page.locator(".hint")).toHaveCount(0);
  await expect(page.getByRole("button", { name: HINT })).toBeVisible();
});

test("taking a hint does not cost anything in the score", async ({ page }) => {
  await openHinted(page);

  // How many questions this lesson holds is a property of the lesson, not a fixed ten —
  // read it rather than assume it.
  const total = Number((await page.locator(".progress").innerText()).match(/(\d+)\s*$/)![1]);

  // Answer every one correctly, taking both hints on every question.
  for (let i = 0; i < total; i++) {
    await page.getByRole("button", { name: HINT }).click();
    await page.getByRole("button", { name: MORE_HINT }).click();

    const prompt = await page.locator(".problem-text").innerText();
    const [, a, op, b] = prompt.match(/(\d+)\s*([+−])\s*(\d+)/)!;
    const answer = op === "+" ? Number(a) + Number(b) : Number(a) - Number(b);

    await answerViaNotebook(page, answer);
    await expect(page.locator(".feedback.correct")).toBeVisible();
    await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
  }

  // A perfect score after using every hint available.
  await expect(page.locator(".score")).toContainText(`${total} מתוך ${total}`);
});

test("every topic offers hints, not just the one they were written for first", async ({
  page,
}) => {
  // This test used to assert the opposite: that a topic without hints shows no button.
  // That state no longer exists — `hints` is a required field, so a question without them
  // does not compile. The check that remains is the one that still means something: a
  // topic that was never part of the original hint work offers them all the same.
  await openTopic(page, "חיבור עד 10");

  await expect(page.locator(".problem-box")).toBeVisible();
  await expect(page.locator(".hint-button")).toBeVisible();

  await page.locator(".hint-button").click();
  await expect(page.locator(".hint")).toHaveCount(1);
  await page.locator(".hint-button").click();
  await expect(page.locator(".hint")).toHaveCount(2);
  // Two and no more.
  await expect(page.locator(".hint-button")).toHaveCount(0);
});
