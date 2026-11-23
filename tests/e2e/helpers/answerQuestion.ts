import { expect, type Page } from "@playwright/test";

/**
 * Answering a question — for every spec in this suite, not just scored-answer-practice's
 * own. docs/features/scored-answer-practice/ replaced the notebook (draw → "שלח למורה" →
 * mocked teacher reading) with a typed final-answer field checked synchronously, client
 * side — so every spec that used to `answerViaNotebook(page, value)` (tests/e2e/helpers/
 * notebookAnswer.ts, removed with the notebook) needs this instead.
 *
 * Types through the on-screen number pad, one key per character — `.answer-input` is
 * `readOnly` now (docs/features/stitch-visual-refresh/, the native virtual keyboard was
 * reported live as worse than the pad, not a fallback worth keeping), so `.fill()` no
 * longer works on it at all (Playwright refuses to fill a non-editable element). No "-"
 * key exists because no real question's answer is ever negative — a caller that needs a
 * guaranteed-wrong sentinel should use an implausibly large positive number instead (see
 * e.g. grade2-syllabus.spec.ts, grade8-angles-congruence.spec.ts), not a negative one.
 *
 * Waits for `.answer-input` to become disabled, not for `.feedback` to appear — a wrong
 * answer with a diagnosis follow-up (docs/features/mistake-diagnosis/) deliberately keeps
 * `.feedback` hidden until that mini-conversation resolves (Practice.tsx's `revealed`
 * gate), but the input disables the moment the check happens either way, so this is the
 * one signal every caller can rely on regardless of what kind of question they just
 * answered.
 */
export async function answerQuestion(page: Page, value: number | string) {
  const input = page.locator(".answer-input");
  const pad = page.locator(".number-pad");
  for (const char of String(value)) {
    if (char === "-") throw new Error('answerQuestion: no "-" key on the number pad — use a large positive sentinel instead');
    const name = char === "." ? "נקודה עשרונית" : char;
    await pad.getByRole("button", { name, exact: true }).click();
  }
  await expect(input).toHaveValue(String(value));
  await page.getByRole("button", { name: "בדיקה" }).click();
  await expect(input).toBeDisabled();
}

/**
 * After a *correct* answer, Practice.tsx advances on its own 700ms later — no "הבא"
 * button for that path (see scored-answer-practice/). A caller looping through several
 * correct answers in a row (adaptive-lesson-start.spec.ts, mika-adaptive-difficulty.spec.ts,
 * grade2-syllabus.spec.ts) used to just `page.waitForTimeout(800)` and move on, which was
 * a tight-but-working margin when answering meant one atomic `.fill()`. Typing through the
 * number pad (docs/features/stitch-visual-refresh/) is now one round-trip per digit, which
 * eats into that margin — and a session's *last* correct answer lands on the result screen
 * instead of a fresh question, where `.answer-input` isn't just disabled, it doesn't exist
 * at all, so a wait that only checks for "enabled again" breaks exactly that iteration.
 * This polls for either real outcome instead of sleeping a guessed duration.
 */
export async function waitForNextQuestionOrEnd(page: Page) {
  await page.waitForFunction(() => {
    const input = document.querySelector(".answer-input") as HTMLInputElement | null;
    return (input !== null && !input.disabled) || document.querySelector(".score") !== null;
  });
}
