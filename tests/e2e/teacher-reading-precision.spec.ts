import { test, expect, type Page } from "@playwright/test";
import { generateEquationsQuestion } from "../../src/data/adaptiveEquations";
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
 * - **Varied analogies for `x + A = B` / `x − A = B`** IS fully deterministic and testable —
 *   in two complementary ways:
 *   1. One small end-to-end UI test proves the real notebook flow actually renders an
 *      analogy on screen in the "unknown starting amount, solved backwards" shape (mocking
 *      only /read-page, never a real paid Claude call).
 *   2. A bulk, data-level check — calling the real `generateEquationsQuestion` directly
 *      (the same function `tests/e2e/content.spec.ts` already imports this way for every
 *      other adaptive generator's content rules, not a reimplementation) — proves variety
 *      and that the original analogies are kept, with enough draws that the result is
 *      actually deterministic rather than hoping one random UI session happens to be lucky.
 *      A first attempt did this entirely through one live 20-question UI session; it was
 *      flaky by construction (with only a handful of draws per direction among 4 uniformly
 *      random options, a perfectly healthy run has a real chance of never landing on the
 *      original one) and failed exactly that way in CI — this version fixes that.
 */

function additiveDirection(prompt: string): "plus" | "minus" | null {
  if (/^x\s*\+\s*\d+\s*=\s*-?\d+/.test(prompt)) return "plus";
  if (/^x\s*[−-]\s*\d+\s*=\s*-?\d+/.test(prompt)) return "minus";
  return null;
}

test("bulk: additive-equation analogies vary per direction and keep the original options", () => {
  const plusAnalogies: string[] = [];
  const minusAnalogies: string[] = [];

  // 1000 draws at the easiest difficulty (where every wrong answer in the UI test below
  // stays) is enough to make "never landing on a specific 1-of-4 option" astronomically
  // unlikely for a healthy implementation, instead of a real chance for a small live sample.
  for (let i = 0; i < 1000; i++) {
    const q = generateEquationsQuestion(1, Math.random);
    const direction = additiveDirection(q.prompt);
    if (direction === "plus") plusAnalogies.push(q.analogy);
    else if (direction === "minus") minusAnalogies.push(q.analogy);
  }

  expect(plusAnalogies.length, "no x+A=B draws at all in 1000 tries").toBeGreaterThan(0);
  expect(minusAnalogies.length, "no x−A=B draws at all in 1000 tries").toBeGreaterThan(0);

  expect(new Set(plusAnalogies).size, `+ analogies: ${[...new Set(plusAnalogies)].join(" | ")}`).toBeGreaterThan(1);
  expect(new Set(minusAnalogies).size, `− analogies: ${[...new Set(minusAnalogies)].join(" | ")}`).toBeGreaterThan(1);

  expect(plusAnalogies.some((a) => a.includes("חסכת")), "original + analogy ('חסכת...') missing").toBe(true);
  expect(minusAnalogies.some((a) => a.includes("הוצאת")), "original − analogy ('הוצאת...') missing").toBe(true);

  // Every analogy in both pools follows the "unknown starting amount, solved backwards"
  // shape design.md requires — not just the original two.
  for (const analogy of [...new Set(plusAnalogies), ...new Set(minusAnalogies)]) {
    expect(analogy, analogy).toMatch(/מלכתחילה|בהתחלה/);
  }
});

async function openEquationsTopic(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card", { hasText: "עומר" }).click();
  await page.locator(".grade-card", { hasText: "כיתה ח" }).click();
  await page.locator(".topic-card", { hasText: "משוואות" }).first().click();
}

/** Clicks "הבא"/"סיום" and reports which one it was — "סיום" ends the session (moves to a
 *  results screen with no further questions), so callers must stop there, not loop again. */
async function goToNextQuestion(page: Page): Promise<"next" | "finished"> {
  const btn = page.getByRole("button", { name: /^(הבא|סיום)$/ });
  const label = (await btn.textContent())?.trim();
  await btn.click();
  return label === "סיום" ? "finished" : "next";
}

test("end-to-end: an additive-equation analogy actually renders on screen, in the real notebook flow", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await openEquationsTopic(page);

  // A single practice session on this topic holds exactly 20 questions
  // (EQUATIONS_QUESTION_COUNT, confirmed by the on-screen "שאלה N מתוך 20" counter and by
  // "סיום" replacing "הבא" on the last one — found by running the real app, not by reading
  // the generator's source). The easiest difficulty (where every wrong answer here keeps
  // it) draws additive-pattern questions often enough in practice that one such session
  // reliably includes at least one — this test only needs one to prove the real rendering
  // path works; the bulk test above owns variety/originality with a sample large enough to
  // be reliable.
  for (let i = 0; i < 20; i++) {
    // The question now lives on the notebook page itself, not a separate .problem-box — see
    // docs/features/notebook-question-on-page/.
    const prompt = (await page.locator(".notebook-question-header").innerText()).trim();
    if (additiveDirection(prompt)) {
      await answerViaNotebook(page, -1); // never a real equation's answer, always "wrong"
      const analogy = page.locator(".explanation-analogy");
      await analogy.waitFor({ state: "visible" });
      const text = (await analogy.textContent())?.trim() ?? "";
      expect(text, text).toMatch(/מלכתחילה|בהתחלה/);
      return;
    }
    if ((await goToNextQuestion(page)) === "finished") break;
  }

  throw new Error("no x+A=B/x−A=B question appeared in a full 20-question session");
});
