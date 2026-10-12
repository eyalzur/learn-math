import { test, expect, type Page } from "@playwright/test";
import { answerViaNotebook } from "./helpers/notebookAnswer";

/**
 * Acceptance criteria under test (docs/features/teacher-reading-precision/product-spec.md).
 *
 * Two independent changes, only one of which an e2e test can actually verify:
 *
 * - **errorPointer wording precision** (server/, the Claude-vision reading) is NOT tested
 *   here. Choosing between the specific/generic register is real-model inference — exactly
 *   the same "QA can't check the quality of this inference" limitation already on record
 *   for errorPointer generally (docs/features/notebook-default-practice/architecture.md,
 *   Risks). A test that mocked /read-page to return a specific-register string would only
 *   prove the display plumbing works (already covered by notebook-usability-fixes.spec.ts's
 *   existing errorPointer-display tests) — it would say nothing about whether the real
 *   model picks the right register for a real page. See tests.md for what was verified by
 *   hand instead (the developer phase's own prompt-string check).
 * - **Varied analogies for `x + A = B` / `x − A = B`** IS fully deterministic and testable:
 *   this file generates additive-equation questions through the real notebook flow (mocking
 *   only /read-page, per the existing `answerViaNotebook` helper — never a real, paid
 *   Claude call) and checks the analogy shown for each.
 *
 * A single practice session on this topic holds exactly 20 questions
 * (`EQUATIONS_QUESTION_COUNT`, confirmed by the on-screen "שאלה N מתוך 20" counter and by
 * the "סיום" button replacing "הבא" on the last one — found by running the real app, not by
 * reading the generator's source) — every additive-equation sample this file needs is
 * collected in one such session instead of three, both for speed and to avoid the one real
 * trap here: clicking past "סיום" lands on a results screen with no more questions to read.
 */

async function openEquationsTopic(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card", { hasText: "עומר" }).click();
  await page.locator(".grade-card", { hasText: "כיתה ח" }).click();
  await page.locator(".topic-card", { hasText: "משוואות" }).first().click();
}

function additiveDirection(prompt: string): "plus" | "minus" | null {
  if (/^x\s*\+\s*\d+\s*=\s*-?\d+/.test(prompt)) return "plus";
  if (/^x\s*[−-]\s*\d+\s*=\s*-?\d+/.test(prompt)) return "minus";
  return null;
}

/** Answers the current question (deliberately wrong, so the explanation — and its analogy
 *  — appears) and reads the analogy text shown underneath the explanation. */
async function readAnalogyForCurrentQuestion(page: Page): Promise<string> {
  await answerViaNotebook(page, -1); // never a real equation's answer, always "wrong"
  const analogy = page.locator(".explanation-analogy");
  await analogy.waitFor({ state: "visible" });
  return (await analogy.textContent())?.trim() ?? "";
}

/** Clicks "הבא"/"סיום" and reports which one it was — "סיום" ends the session (moves to a
 *  results screen with no further questions), so callers must stop there, not loop again. */
async function goToNextQuestion(page: Page): Promise<"next" | "finished"> {
  const btn = page.getByRole("button", { name: /^(הבא|סיום)$/ });
  const label = (await btn.textContent())?.trim();
  await btn.click();
  return label === "סיום" ? "finished" : "next";
}

test("additive-equation analogies: vary across questions, keep the original options, and keep the 'unknown starting amount' shape", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await openEquationsTopic(page);

  const plusAnalogies: string[] = [];
  const minusAnalogies: string[] = [];

  for (let i = 0; i < 20; i++) {
    const prompt = (await page.locator(".problem-box").innerText()).trim();
    const direction = additiveDirection(prompt);
    if (direction === "plus") plusAnalogies.push(await readAnalogyForCurrentQuestion(page));
    else if (direction === "minus") minusAnalogies.push(await readAnalogyForCurrentQuestion(page));

    if ((await goToNextQuestion(page)) === "finished") break;
  }

  // Every sample follows the "unknown starting amount, solved backwards" shape — product-
  // spec.md's requirement that this stays true for every analogy in the new pools, not just
  // the original two.
  for (const analogy of [...plusAnalogies, ...minusAnalogies]) {
    expect(analogy, analogy).toMatch(/מלכתחילה|בהתחלה/);
  }

  // Varied, not always the same sentence. Gated on at least 4 draws per direction (not just
  // 2) on purpose: each draw picks uniformly among 4 templates, so with only 2 draws a
  // perfectly healthy random session has a real 1-in-4 chance of landing on the same one
  // twice and failing this honestly, not flakily. At 4+ draws that chance drops to 1-in-64 —
  // and this topic's easiest difficulty (where every wrong answer here keeps it) draws
  // additive-pattern questions often enough in practice that a 20-question session routinely
  // clears this bar for both directions; skip only if an unusually lopsided session didn't.
  if (plusAnalogies.length >= 4) {
    expect(new Set(plusAnalogies).size, `+ analogies seen: ${plusAnalogies.join(" | ")}`).toBeGreaterThan(1);
  }
  if (minusAnalogies.length >= 4) {
    expect(new Set(minusAnalogies).size, `− analogies seen: ${minusAnalogies.join(" | ")}`).toBeGreaterThan(1);
  }

  // The original savings/spent analogies are kept, not removed, among the new pool.
  expect(plusAnalogies.some((a) => a.includes("חסכת")) || plusAnalogies.length === 0).toBe(true);
  expect(minusAnalogies.some((a) => a.includes("הוצאת")) || minusAnalogies.length === 0).toBe(true);

  // Sanity: this topic's easiest difficulty draws additive questions often enough that a
  // single 20-question session is a meaningful sample, not an accidental near-empty one.
  expect(plusAnalogies.length + minusAnalogies.length).toBeGreaterThan(0);
});
