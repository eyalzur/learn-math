import { test, expect, type Page } from "@playwright/test";
import { answerViaNotebook } from "./helpers/notebookAnswer";

/** Same stub `read-aloud-questions.spec.ts`/`read-aloud.spec.ts` already use — a real
 *  `speechSynthesis` isn't reliably usable in headless Chromium, so a fake engine records
 *  what it was asked to speak instead of needing real audio. `speechSynthesis` is a
 *  getter-only accessor on `window`, so a plain assignment fails silently; this has to run
 *  via `addInitScript` before any app code does. */
type Spoken = { text: string };

async function stubSpeech(page: Page, utteranceMs = 10) {
  await page.addInitScript((ms: number) => {
    const spoken: Spoken[] = [];
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
          pendingEnd = setTimeout(() => u.onend?.(), ms);
        },
      },
    });
  }, utteranceMs);
}

/**
 * Acceptance criteria under test (docs/features/notebook-question-on-page/product-spec.md).
 *
 * The question now renders inside `.notebook-stack` (as `.notebook-question-header`, a
 * sibling of the drawing `<canvas>`), replacing the separate floating box that used to sit
 * above the notebook — not duplicating it. See design.md for the exact screens/states this
 * maps to.
 */

async function openEquationsTopic(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card", { hasText: "עומר" }).click();
  await page.locator(".grade-card", { hasText: "כיתה ח" }).click();
  await page.locator(".topic-card", { hasText: "משוואות" }).first().click();
  await page.locator(".notebook-question-header").waitFor({ state: "visible" });
}

async function openAnglesTopic(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card", { hasText: "עומר" }).click();
  await page.locator(".grade-card", { hasText: "כיתה ח" }).click();
  await page.locator(".topic-card", { hasText: "זוויות וחפיפת משולשים" }).first().click();
  await page.locator(".notebook-question-header").waitFor({ state: "visible" });
}

test("the question is written on the notebook page itself, and the old separate box is gone", async ({
  page,
}) => {
  await openEquationsTopic(page);

  // The written question lives inside .notebook-stack — the same transformed coordinate
  // space the grid and the student's own ink live in — not floating above it.
  const header = page.locator(".notebook-stack .notebook-question-header");
  await expect(header).toBeVisible();
  const headerText = (await header.innerText()).trim();
  expect(headerText.length).toBeGreaterThan(0);

  // The old floating box is gone entirely from this screen — the page is the only source.
  await expect(page.locator(".practice .problem-box")).toHaveCount(0);
});

test("fullscreen shows the same written question — no separate duplicate copy", async ({ page }) => {
  await openEquationsTopic(page);

  const headerBefore = (await page.locator(".notebook-question-header").innerText()).trim();

  await page.getByRole("button", { name: "הגדילו את המחברת למסך מלא" }).click();
  await page.locator(".notebook-fullscreen-topbar").waitFor({ state: "visible" });

  // Exactly one header exists, showing the same question — fullscreen never had its own copy.
  await expect(page.locator(".notebook-question-header")).toHaveCount(1);
  const headerAfter = (await page.locator(".notebook-question-header").innerText()).trim();
  expect(headerAfter).toBe(headerBefore);
  await expect(page.locator(".problem-box")).toHaveCount(0);
});

test("zooming moves the written question with the page, not fixed to the screen", async ({ page }) => {
  await openEquationsTopic(page);

  const header = page.locator(".notebook-question-header");
  const before = await header.boundingBox();
  if (!before) throw new Error("header has no bounding box");

  const zoomIn = page.getByRole("button", { name: "הגדל" });
  for (let i = 0; i < 5; i++) await zoomIn.click();

  const after = await header.boundingBox();
  if (!after) throw new Error("header has no bounding box after zoom");

  // A fixed-to-screen overlay wouldn't change size at all; something riding the page's own
  // transform scales up noticeably with it.
  expect(after.width).toBeGreaterThan(before.width * 1.3);
});

test("the eraser cannot erase the written question", async ({ page }) => {
  await openEquationsTopic(page);

  const header = page.locator(".notebook-question-header");
  const originalText = (await header.innerText()).trim();
  const box = await header.boundingBox();
  if (!box) throw new Error("header has no bounding box");

  await page.getByRole("button", { name: "מחק" }).click();
  // Drag the eraser directly across the header's own on-screen area.
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 40, cy + 10, { steps: 5 });
  await page.mouse.up();

  await expect(header).toBeVisible();
  expect((await header.innerText()).trim()).toBe(originalText);
});

test("each new page shows its own question, and navigating back still shows what was there", async ({
  page,
}) => {
  await openEquationsTopic(page);

  // Scoped to .problem-text (the question itself), not the whole header — the header can
  // also hold a teacher's note once a page has been sent (docs/features/notebook-teacher-marks/),
  // which the question's own identity shouldn't be sensitive to.
  const firstQuestionText = (await page.locator(".problem-text").innerText()).trim();

  await answerViaNotebook(page, 0);
  await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
  await page.locator(".notebook-question-header").waitFor({ state: "visible" });

  const secondQuestionText = (await page.locator(".problem-text").innerText()).trim();
  expect(secondQuestionText).not.toBe(firstQuestionText);

  await page.getByRole("button", { name: "דף קודם" }).click();
  await expect(page.locator(".problem-text")).toHaveText(firstQuestionText);
});

test("a Hebrew word problem's arithmetic stays left-to-right, and the question is visible at the page's default view", async ({
  page,
}) => {
  await openAnglesTopic(page);

  const header = page.locator(".notebook-question-header");
  await expect(header).toHaveClass(/qh-rtl/);

  // The number inside the Hebrew sentence (e.g. "41°") keeps its own isolated LTR context —
  // the same mechanism the rest of the app already relies on for mixed Hebrew/arithmetic text.
  const mathRun = header.locator(".prompt-math").first();
  await expect(mathRun).toBeVisible();
  const bidi = await mathRun.evaluate((el) => getComputedStyle(el).unicodeBidi);
  const direction = await mathRun.evaluate((el) => getComputedStyle(el).direction);
  expect(bidi).toBe("isolate");
  expect(direction).toBe("ltr");

  // Regression check for a real bug caught during development: a word problem's written
  // question must actually be visible within the notebook's viewport at the page's default
  // opening view, not just present somewhere in the (possibly off-screen) page space.
  const headerBox = await header.boundingBox();
  const stageBox = await page.locator(".notebook-stage").boundingBox();
  if (!headerBox || !stageBox) throw new Error("missing bounding box");
  const visibleLeft = Math.max(headerBox.x, stageBox.x);
  const visibleRight = Math.min(headerBox.x + headerBox.width, stageBox.x + stageBox.width);
  const visibleWidth = Math.max(0, visibleRight - visibleLeft);
  // Most of the header's width should be inside the visible stage, not clipped off past its
  // edge (the bug fixed during development clipped away the sentence's own starting point).
  expect(visibleWidth).toBeGreaterThan(headerBox.width * 0.9);
});

test("the question's read-aloud button lives in one shared place and still works", async ({ page }) => {
  await stubSpeech(page);
  await openEquationsTopic(page);

  const speakButton = page.locator(".notebook-topbar-start .speak-button");
  await expect(speakButton).toHaveAttribute("aria-label", "הקריאו לי את השאלה");
  await speakButton.click();
  // The stub's fake utterance finishes in ~10ms, so polling the spoken-text record (the
  // same pattern read-aloud-questions.spec.ts already uses) is what actually proves
  // speech happened — checking the aria-label's transient "stop" state here would race
  // against the stub completing before the assertion even runs.
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __spoken: Spoken[] }).__spoken.length))
    .toBeGreaterThan(0);

  // Same single button in fullscreen too — not a second copy.
  await page.getByRole("button", { name: "הגדילו את המחברת למסך מלא" }).click();
  await expect(page.locator(".speak-button")).toHaveCount(1);
});

test("applies to other students/topics using the notebook, not just one", async ({ page }) => {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card", { hasText: "רותם" }).click();
  await page.locator(".grade-card", { hasText: "כיתה ו" }).click();
  await page.locator(".topic-card").first().click();

  const header = page.locator(".notebook-stack .notebook-question-header");
  await expect(header).toBeVisible();
  expect((await header.innerText()).trim().length).toBeGreaterThan(0);
  await expect(page.locator(".practice .problem-box")).toHaveCount(0);
});

test("the lesson screen outside practice is unaffected — explicitly out of scope", async ({ page }) => {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card", { hasText: "עומר" }).click();
  await page.locator(".grade-card", { hasText: "כיתה ח" }).click();

  // The lesson screen (📖, "שיעור: ...") has no notebook/writing surface at all — just
  // example questions — and still uses the old printed box exactly as before.
  await page.getByRole("button", { name: "שיעור: משוואות" }).click();
  await expect(page.locator(".problem-box")).toHaveCount(1);
  await expect(page.locator(".notebook-question-header")).toHaveCount(0);
});
