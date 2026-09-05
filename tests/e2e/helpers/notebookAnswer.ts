import type { Page } from "@playwright/test";

/**
 * Answering a question — for every spec in this suite, not just the notebook's own.
 *
 * docs/features/notebook-default-practice/ removed the typed answer field: the notebook is
 * now the only way to answer, and the teacher's reading of it is what feeds the existing
 * local check. Every spec that used to `page.locator(".answer-input").fill(...)` needs an
 * equivalent that ends the same way — a confident reading with a specific final answer —
 * without any of them making a real (paid) call to Claude. playwright.config.ts already
 * points VITE_NOTEBOOK_SERVER_URL at an unresolvable host, so every /read-page request in
 * this suite is intercepted here, never sent.
 */

/** A short ink stroke on the notebook canvas — just enough for `pageHasContent()` to be
 *  true and the "שלח למורה" button to enable. What's actually drawn never matters to these
 *  tests: the teacher's reading is always mocked below. */
export async function drawOnCanvas(page: Page) {
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("notebook canvas not found");
  const cx = box.x + 100;
  const cy = box.y + 100;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 30, cy + 30, { steps: 5 });
  await page.mouse.up();
}

/**
 * Draws something, mocks a confident teacher reading of `value` as the final answer, and
 * clicks "שלח למורה" — the single action that used to be "type an answer and press בדיקה".
 * `unroute` first so a test answering several questions in a row (a loop over a whole
 * lesson) mocks a fresh value each time rather than stacking handlers.
 *
 * Waits for the resulting feedback to actually appear before returning. Unlike the old
 * typed answer (checked synchronously, in the same click handler), sending to the teacher
 * is inherently async — even mocked, the response crosses a real await — so the DOM update
 * lands a tick after Playwright's `.click()` resolves. Every one of this suite's many
 * "answer, then immediately assert" call sites depends on this helper closing that gap
 * itself, rather than each one remembering to wait afterward.
 */
export async function answerViaNotebook(page: Page, value: number | string) {
  await page.unroute("**/read-page").catch(() => {});
  await page.route("**/read-page", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        // The teacher describes what the *student* did, in her own voice ("I saw that
        // you wrote..."), never "I wrote" — she isn't the one answering.
        reading: { certain: true, processReflection: `ראיתי שכתבת \`${value}\`.`, finalAnswer: Number(value) },
      }),
    }),
  );
  await drawOnCanvas(page);
  await page.getByRole("button", { name: "שלח למורה" }).click();
  // .teacher-reading, not .feedback: a diagnosed wrong answer with a follow-up question
  // holds .feedback back until that mini-conversation resolves (see Practice.tsx's
  // `revealed`), but the teacher's panel itself is never gated on that — it is the
  // earliest reliable sign a confident reading actually landed.
  await page.locator(".teacher-reading").waitFor({ state: "visible" });
}

/** Mocks an uncertain reading (the teacher couldn't confidently read the page) for the next
 *  send only — see the "כשהקריאה לא ודאית" acceptance criteria. Waits for the uncertain
 *  message itself, for the same reason answerViaNotebook waits for feedback. */
export async function answerUncertainly(page: Page) {
  await page.unroute("**/read-page").catch(() => {});
  await page.route("**/read-page", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ reading: { certain: false } }),
    }),
  );
  await drawOnCanvas(page);
  await page.getByRole("button", { name: "שלח למורה" }).click();
  await page.getByText("לא הצלחתי לקרוא את זה בבירור").waitFor({ state: "visible" });
}

/** Mocks the /read-page call itself failing (network/server/timeout) for the next send
 *  only — see the "נכשלת" acceptance criteria. */
export async function mockTeacherCommunicationFailure(page: Page) {
  await page.unroute("**/read-page").catch(() => {});
  await page.route("**/read-page", (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "boom" }) }),
  );
}

/**
 * Mocks a sequence of teacher readings, one per call to /read-page — the first call gets
 * `readings[0]`, the second `readings[1]`, and so on, repeating the last entry if called
 * more times than the list has. Supports notebook-teacher-feedback's correction flow,
 * where a *second* (or third) call needs to return a different reading than the first so a
 * test can prove the corrected verdict actually took effect, not just that the same mock
 * fired again.
 */
export async function mockTeacherReadingSequence(
  page: Page,
  readings: ({ certain: false } | { certain: true; processReflection: string; errorPointer?: string; finalAnswer: number })[],
) {
  await page.unroute("**/read-page").catch(() => {});
  let call = 0;
  await page.route("**/read-page", (route) => {
    const reading = readings[Math.min(call, readings.length - 1)];
    call++;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ reading }) });
  });
}
