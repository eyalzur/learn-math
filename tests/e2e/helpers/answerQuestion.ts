import { expect, type Page } from "@playwright/test";

/**
 * Answering a question — for every spec in this suite, not just scored-answer-practice's
 * own. docs/features/scored-answer-practice/ replaced the notebook (draw → "שלח למורה" →
 * mocked teacher reading) with a typed final-answer field checked synchronously, client
 * side — so every spec that used to `answerViaNotebook(page, value)` (tests/e2e/helpers/
 * notebookAnswer.ts, removed with the notebook) needs this instead.
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
  await input.fill(String(value));
  await page.getByRole("button", { name: "בדיקה" }).click();
  await expect(input).toBeDisabled();
}
