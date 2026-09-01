import { test, expect, type Page } from "@playwright/test";
import { answerUncertainly, answerViaNotebook, drawOnCanvas, mockTeacherCommunicationFailure } from "./helpers/notebookAnswer";

/**
 * Acceptance criteria under test (docs/features/notebook-default-practice/product-spec.md
 * and design.md).
 *
 * This supersedes three earlier spec files whose own acceptance criteria this feature
 * deliberately inverts or replaces, rather than extends:
 *  - practice-notebook.spec.ts: asserted the notebook was a side scratchpad that never
 *    affected right/wrong, opened via a toggle and closed back to a typed-answer screen.
 *    Both are now false by design — deleted, not patched.
 *  - notebook-teacher-understanding.spec.ts: asserted a modal dialog with two fixed lines
 *    ("מה שכתבת:"/"התשובה שרשמת:") and a `question`/`answer`/`imageDataUrl` response shape.
 *    The dialog, the two-line format, and that response shape are all gone — deleted, not
 *    patched. Its still-true guarantees (no verdict language from the teacher, uncertain
 *    readings say so plainly, read-aloud toggles like every other speak button, a failed
 *    call doesn't block the rest of the notebook) are re-tested below against the new UI.
 *  - notebook-server-relay.spec.ts: trimmed to keep only its still-valid "no Anthropic SDK
 *    client-side" check (still there, not duplicated here); its toolbar/dialog/button-
 *    ordering tests described UI that no longer exists.
 *
 * Two things product-spec.md promises are not covered here, and can't be by an e2e test
 * against a mocked server:
 *  - "התיאור נאמן למה שבאמת נכתב בדף" — a promise about what Claude actually does when
 *    reading a real page; a mocked /read-page only proves the client displays what the
 *    server said.
 *  - "אין מפתח או סוד Anthropic בקוד הלקוח" — covered in notebook-server-relay.spec.ts.
 *
 * playwright.config.ts points VITE_NOTEBOOK_SERVER_URL at a fixed, unresolvable host, so
 * every /read-page request in this file is intercepted — no real network call, and
 * certainly no real (paid) call to Claude, ever happens in this suite.
 */

async function openLevel(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").first().click();
  await page.locator(".grade-card").first().click();
  await page.locator(".topic-card").first().click();
  await page.locator(".style-card").first().click();
}

function sendButton(page: Page) {
  return page.getByRole("button", { name: /^שלח למורה$|^המורה קוראת\.\.\.$/ });
}

/** Same recorder-based stub read-aloud-questions.spec.ts already uses for this purpose. */
async function stubSpeech(page: Page) {
  await page.addInitScript(() => {
    const spoken: { text: string }[] = [];
    // @ts-expect-error test hook
    window.__spoken = spoken;

    class FakeUtterance {
      text: string;
      lang = "";
      voice: { name: string } | null = null;
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

    let pendingEnd: ReturnType<typeof setTimeout> | undefined;
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => [{ name: "Carmit", lang: "he-IL", voiceURI: "carmit" }],
        addEventListener: () => {},
        cancel: () => {
          clearTimeout(pendingEnd);
          pendingEnd = undefined;
        },
        speak: (u: FakeUtterance) => {
          spoken.push({ text: u.text });
          pendingEnd = setTimeout(() => u.onend?.(), 10);
        },
      },
    });
  });
}

async function stubNoSpeech(page: Page) {
  await page.addInitScript(() => {
    // @ts-expect-error deleting a read-only global for the test
    delete window.speechSynthesis;
  });
}

// ------------------------------------------------------- the merged screen, default state

test("the notebook is ready to write in the moment a question loads — no separate open step, and no typed answer field anywhere", async ({
  page,
}) => {
  await openLevel(page);
  await expect(page.locator(".problem-box")).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator(".answer-input")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "📝 מחברת" })).toHaveCount(0);
  // The old, separate "check" button is gone — "שלח למורה" is the only way to answer.
  await expect(page.getByRole("button", { name: "בדיקה" })).toHaveCount(0);
  await expect(sendButton(page)).toBeVisible();
});

test("the send button is disabled on an empty page, and enables once something is written", async ({ page }) => {
  await openLevel(page);
  await expect(sendButton(page)).toBeDisabled();
  await drawOnCanvas(page);
  await expect(sendButton(page)).toBeEnabled();
});

test("sending only happens on an explicit click — drawing on the page never triggers it on its own", async ({ page }) => {
  await openLevel(page);
  let requests = 0;
  await page.route("**/read-page", (route) => {
    requests++;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ reading: { certain: false } }),
    });
  });

  await drawOnCanvas(page);
  await page.waitForTimeout(200); // give any accidental auto-trigger a chance to fire
  expect(requests).toBe(0);

  await sendButton(page).click();
  await expect(page.getByText("לא הצלחתי לקרוא את זה בבירור")).toBeVisible();
  expect(requests).toBe(1);
});

// ------------------------------------------------------------------ a confident reading

test("a correct final answer shows the teacher's reflection and the existing correct feedback, with no judgment from the teacher itself", async ({
  page,
}) => {
  // Learn the correct answer from a first wrong pass (the feedback line states it), then
  // restart the level fresh and answer it right — same harvesting technique
  // mistake-explanation.spec.ts and teaching-explanations.spec.ts already use, more robust
  // than guessing the operator from the prompt text.
  await openLevel(page);
  await answerViaNotebook(page, 999999);
  const feedback = await page.locator(".feedback.wrong").innerText();
  const correct = feedback.match(/(-?\d+(?:\.\d+)?)\s*$/)![1];
  await openLevel(page);

  await answerViaNotebook(page, correct);

  await expect(page.locator(".feedback.correct")).toBeVisible();
  const panel = page.locator(".teacher-reading");
  await expect(panel).toBeVisible();
  await expect(panel.getByText("מה המורה הבינה")).toBeVisible();
  await expect(panel).toContainText(correct);

  const panelText = (await panel.innerText()).replace(/\s+/g, " ");
  for (const word of ["נכון", "טעות", "טעית", "צדקת", "שגוי"]) {
    expect(panelText, `teacher panel should not contain "${word}"`).not.toContain(word);
  }
});

test("a wrong final answer still runs the existing diagnosis/explanation flow, unchanged, alongside the teacher's reflection", async ({
  page,
}) => {
  await openLevel(page);
  await answerViaNotebook(page, 999999);

  await expect(page.locator(".feedback.wrong")).toBeVisible();
  await expect(page.locator(".teacher-reading")).toBeVisible();
  // The existing four-layer explanation still fires off the (teacher-supplied) wrong
  // answer, exactly as it would have off a typed one.
  await expect(page.locator(".explanation")).toBeVisible();
});

test("an error pointer from the teacher appears as a second, separate line after the process reflection", async ({ page }) => {
  await openLevel(page);
  await page.route("**/read-page", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reading: {
          certain: true,
          processReflection: "ראיתי שכתבת את התהליך.",
          errorPointer: "שמתי לב לטעות בשלב האמצעי.",
          finalAnswer: 999999,
        },
      }),
    }),
  );
  await drawOnCanvas(page);
  await sendButton(page).click();

  const lines = page.locator(".teacher-reading-line");
  await expect(lines).toHaveCount(2);
  await expect(lines.nth(0)).toContainText("ראיתי שכתבת את התהליך");
  await expect(lines.nth(1)).toContainText("שמתי לב לטעות בשלב האמצעי");
});

// ----------------------------------------------------------- uncertain reading, no verdict

test("an uncertain reading says so plainly, gives no verdict, and lets the student write again with no limit", async ({
  page,
}) => {
  await openLevel(page);
  await answerUncertainly(page);

  await expect(page.getByText("לא הצלחתי לקרוא את זה בבירור. אפשר לכתוב שוב, קצת יותר גדול או ברור?")).toBeVisible();
  await expect(page.locator(".feedback.correct, .feedback.wrong")).toHaveCount(0);
  await expect(page.locator(".teacher-reading")).toHaveCount(0);
  // Free to try again immediately — no lockout, no "out of attempts".
  await expect(sendButton(page)).toBeEnabled();

  await answerViaNotebook(page, 7);
  await expect(page.locator(".feedback.correct, .feedback.wrong")).toBeVisible();
});

// --------------------------------------------------------------------------- send fails

test("a failed call to the teacher shows a clear, non-technical error and lets you try again — the rest of the notebook keeps working", async ({
  page,
}) => {
  await openLevel(page);
  await mockTeacherCommunicationFailure(page);
  await drawOnCanvas(page);
  await sendButton(page).click();

  const error = page.getByText("לא הצלחנו לשלוח את הדף. נסו שוב.");
  await expect(error).toBeVisible();
  await expect(error).toHaveAttribute("aria-live", "polite");
  await expect(page.getByRole("button", { name: "עט" })).toBeEnabled();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(sendButton(page)).toBeEnabled();

  await answerViaNotebook(page, 7);
  await expect(page.locator(".feedback.correct, .feedback.wrong")).toBeVisible();
});

// ------------------------------------------------------------------------ read-aloud

test("reading the teacher's note aloud speaks the reflection and error pointer, and toggles like every other speak button", async ({
  page,
}) => {
  await stubSpeech(page);
  await openLevel(page);
  await page.route("**/read-page", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reading: {
          certain: true,
          processReflection: "ראיתי שחישבת `7 + 5` וקיבלת `12`.",
          errorPointer: "שמתי לב לטעות קטנה.",
          finalAnswer: 12,
        },
      }),
    }),
  );
  await drawOnCanvas(page);
  await sendButton(page).click();

  const panel = page.locator(".teacher-reading");
  const speakButton = panel.locator(".speak-button");
  await expect(speakButton).toHaveAttribute("aria-label", "הקראת מה שהמורה הבינה");

  await speakButton.click();
  await expect(speakButton).toHaveAttribute("aria-label", "עצרו את ההקראה");

  const spokenText = () =>
    page.evaluate(() => (window as unknown as { __spoken: { text: string }[] }).__spoken.map((s) => s.text).join(" "));
  // The reflection and the error pointer are spoken as separate parts with a real pause
  // between them (data/speech.ts) — poll for the second part rather than reading once right
  // after the first appears, so the assertion doesn't race that pause.
  await expect.poll(spokenText).toContain("12");
  await expect.poll(spokenText).toContain("שמתי לב לטעות קטנה");

  await speakButton.click();
  await expect(speakButton).toHaveAttribute("aria-label", "הקראת מה שהמורה הבינה");
});

test("with no speech engine, the teacher panel has no read-aloud button at all", async ({ page }) => {
  await stubNoSpeech(page);
  await openLevel(page);
  await answerViaNotebook(page, 7);
  await expect(page.locator(".teacher-reading .speak-button")).toHaveCount(0);
});

// --------------------------------------------------------------- locked after an answer

test("once answered, the notebook's primary action becomes moving on, not sending again", async ({ page }) => {
  await openLevel(page);
  await answerViaNotebook(page, 7);
  await expect(sendButton(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^(הבא|סיום)$/ })).toBeEnabled();
  // Page navigation and drawing tools stay usable so the student can still look things over.
  await expect(page.getByRole("button", { name: "עט" })).toBeEnabled();
});

test("moving to the next question opens a fresh, empty page", async ({ page }) => {
  await openLevel(page);
  await expect(page.getByText("דף 1 מתוך 1")).toBeVisible();
  await answerViaNotebook(page, 7);
  await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
  await expect(page.getByText("דף 2 מתוך 2")).toBeVisible();
  await expect(sendButton(page)).toBeDisabled();
});

// ------------------------------------------------------------- the notebook itself, ported

test("a new page can be added, an existing one removed (never the last), and pages can be navigated", async ({ page }) => {
  await openLevel(page);
  await expect(page.getByText("דף 1 מתוך 1")).toBeVisible();

  await page.getByRole("button", { name: "דף חדש" }).click();
  await expect(page.getByText("דף 2 מתוך 2")).toBeVisible();

  await page.getByRole("button", { name: "דף קודם" }).click();
  await expect(page.getByText("דף 1 מתוך 2")).toBeVisible();
  await page.getByRole("button", { name: "דף הבא" }).click();
  await expect(page.getByText("דף 2 מתוך 2")).toBeVisible();

  const removeButton = page.getByRole("button", { name: "הסר דף" });
  await removeButton.click();
  await expect(page.getByText("דף 1 מתוך 1")).toBeVisible();
  await expect(removeButton).toBeDisabled();
});

// ------------------------ default writing-surface height and real fullscreen (סבב רוויזיה א׳)
// docs/features/notebook-default-practice/product-spec.md, "Acceptance Criteria — עדכון
// (סבב רוויזיה א׳)". A mobile-sized viewport on purpose — the live-site bug report this
// revision fixes was specifically about a phone screen.

test("the writing surface fills most of the free screen height by default, with no scrolling needed to reach the hint button below it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await openLevel(page);

  const viewport = page.viewportSize()!;
  const box = (await page.locator(".notebook-screen").boundingBox())!;
  // Not a small fixed box: comfortably above what a capped 60vh/620px box (the previous,
  // reported-as-too-small behaviour) would ever give this question on this viewport.
  expect(box.height / viewport.height).toBeGreaterThan(0.4);

  const hint = (await page.locator(".hint-button").boundingBox())!;
  expect(hint.y + hint.height).toBeLessThanOrEqual(viewport.height + 2);
});

test('the "⤢" button expands the notebook box itself to cover (almost) the whole screen, not just the zoom inside it', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await openLevel(page);
  const before = (await page.locator(".notebook-screen").boundingBox())!;

  await page.getByRole("button", { name: "הגדילו את המחברת למסך מלא" }).click();

  const viewport = page.viewportSize()!;
  const after = (await page.locator(".notebook-screen").boundingBox())!;
  expect(after.height).toBeGreaterThan(before.height);
  expect(after.width).toBeGreaterThanOrEqual(viewport.width - 2);
  expect(after.height).toBeGreaterThanOrEqual(viewport.height - 2);
});

test("in fullscreen, the regular header and hint button disappear, and the question stays visible through a compact strip instead", async ({
  page,
}) => {
  await openLevel(page);
  await expect(page.locator(".practice-header")).toBeVisible();
  const questionText = await page.locator(".problem-box").innerText();

  await page.getByRole("button", { name: "הגדילו את המחברת למסך מלא" }).click();

  await expect(page.locator(".practice-header")).toHaveCount(0);
  await expect(page.locator(".hint-button")).toHaveCount(0);
  const strip = page.locator(".notebook-fullscreen-topbar");
  await expect(strip).toBeVisible();
  await expect(strip.locator(".problem-box")).toHaveText(questionText);
});

test("a confident reading that arrives while fullscreen is on exits it automatically — fullscreen is a writing mode, not a result screen", async ({
  page,
}) => {
  await openLevel(page);
  await page.getByRole("button", { name: "הגדילו את המחברת למסך מלא" }).click();
  await expect(page.locator(".notebook-fullscreen-topbar")).toBeVisible();

  await answerViaNotebook(page, 7);

  await expect(page.locator(".notebook-screen.fullscreen")).toHaveCount(0);
  await expect(page.locator(".practice-header")).toBeVisible();
  await expect(page.locator(".teacher-reading")).toBeVisible();
});

test("an uncertain reading that arrives while fullscreen is on does not exit it — the message shows beside the toolbar instead", async ({
  page,
}) => {
  await openLevel(page);
  await page.getByRole("button", { name: "הגדילו את המחברת למסך מלא" }).click();

  await answerUncertainly(page);

  const fullscreenBox = page.locator(".notebook-screen.fullscreen");
  await expect(fullscreenBox).toBeVisible();
  await expect(fullscreenBox.getByText("לא הצלחתי לקרוא את זה בבירור")).toBeVisible();
});

test("the exit button on the compact strip returns to the regular layout — a reversible toggle, not a one-way trip", async ({
  page,
}) => {
  await openLevel(page);
  await page.getByRole("button", { name: "הגדילו את המחברת למסך מלא" }).click();
  await expect(page.locator(".notebook-screen.fullscreen")).toBeVisible();

  await page.locator(".notebook-fullscreen-exit").click();

  await expect(page.locator(".notebook-screen.fullscreen")).toHaveCount(0);
  await expect(page.locator(".practice-header")).toBeVisible();
  await expect(page.getByRole("button", { name: "הגדילו את המחברת למסך מלא" })).toBeVisible();
});

// The "no Claude/Anthropic dependency in client code" check stays in
// notebook-server-relay.spec.ts, where it originated — no need for a second copy here.
