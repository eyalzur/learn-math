import { test, expect, type Page } from "@playwright/test";
import { answerQuestion } from "./helpers/answerQuestion";
import { createAndSelectStudent } from "./helpers/selectStudent";

/**
 * Acceptance criteria under test
 * (docs/features/ask-before-disabling-autoread/product-spec.md and design.md).
 *
 * Speech setup copied from read-aloud-questions.spec.ts: the real engine is replaced
 * before any app code runs, since `speechSynthesis` is a getter-only accessor.
 */

type Spoken = { text: string };

async function stubSpeech(page: Page, utteranceMs = 3000) {
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

async function fresh(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
}

async function openStudent(page: Page): Promise<string> {
  await page.goto("/learn-math/");
  const name = await createAndSelectStudent(page);
  await page.locator(".grade-card").first().click();
  return name;
}

/** Mika → the topic that carries hints → its first level. First question is `12 + 5`. */
async function startHintedLevel(page: Page) {
  await page.locator(".topic-card").nth(3).click();
  await page.getByRole("button", { name: "דלג לתרגול →" }).click();
  await page.locator(".style-card").first().click();
}

const READ_ALOUD_SWITCH_NAME = "להקריא את השאלות בקול";

async function toggleReadAloud(page: Page) {
  await page.getByRole("button", { name: "הגדרות" }).click();
  await page.getByRole("switch", { name: READ_ALOUD_SWITCH_NAME }).click();
  await page.getByRole("button", { name: "סגירה" }).click();
}

const playButton = (page: Page) => page.getByRole("button", { name: "הקריאו לי את השאלה" });
const stopButton = (page: Page) => page.getByRole("button", { name: "עצרו את ההקראה" });
/** The ask's exact copy — design.md, quoted verbatim, not derived from the component. */
const askTitle = (page: Page) => page.getByText("לכבות הקראה אוטומטית?");
const yesButton = (page: Page) => page.getByRole("button", { name: "כן, כבו" });
const noButton = (page: Page) => page.getByRole("button", { name: "לא, המשיכו" });

const SUPPRESS_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

/** From deep inside Practice, back out to the grade picker (where "← החלף תלמיד" lives)
 *  and switch students — Practice's own "← חזרה" only returns to the style/level picker
 *  inside the current topic, one screen short of home, so three clicks are needed, not
 *  one (unlike the home-screen-only helpers above, copied from read-aloud-questions.spec.ts,
 *  where a single "← חזרה" is already enough). */
async function switchStudentFromPractice(page: Page) {
  await page.getByRole("button", { name: "← חזרה" }).click(); // practice -> style/level picker
  await page.getByRole("button", { name: "← חזרה" }).click(); // -> home (topic picker)
  await page.getByRole("button", { name: "← חזרה" }).click(); // -> grade picker
  await page.getByRole("button", { name: "← החלף תלמיד" }).click();
}

test("asks whether to turn off auto-read-aloud after a question reading is stopped before it finishes", async ({
  page,
}) => {
  await stubSpeech(page);
  await fresh(page);
  await openStudent(page);
  await toggleReadAloud(page);
  await startHintedLevel(page);

  // The new question is auto-reading itself — stop it before it finishes.
  await expect(stopButton(page)).toBeVisible();
  await expect(askTitle(page)).toHaveCount(0);
  await stopButton(page).click();

  await expect(askTitle(page)).toBeVisible();
  await expect(yesButton(page)).toBeVisible();
  await expect(noButton(page)).toBeVisible();
  await expect(page.getByText("לא לשאול אותי יותר")).toBeVisible();
});

test("does not ask when auto-read-aloud is off, even after manually stopping a reading", async ({ page }) => {
  await stubSpeech(page);
  await fresh(page);
  await openStudent(page);
  await startHintedLevel(page); // auto-read-aloud stays off (default)

  await playButton(page).click();
  await expect(stopButton(page)).toBeVisible();
  await stopButton(page).click();

  await expect(askTitle(page)).toHaveCount(0);
});

test("also asks after a hint reading is stopped before it finishes", async ({ page }) => {
  await stubSpeech(page);
  await fresh(page);
  await openStudent(page);
  await toggleReadAloud(page);
  await startHintedLevel(page);

  // Opening a hint while the question is still auto-reading pre-empts it with the hint's
  // own reading — not a manual stop, so no ask yet.
  await page.getByRole("button", { name: /רמז/ }).click();
  await expect(askTitle(page)).toHaveCount(0);

  await expect(stopButton(page)).toBeVisible();
  await stopButton(page).click();
  await expect(askTitle(page)).toBeVisible();
});

test("answering \"לא, המשיכו\" leaves auto-read-aloud on", async ({ page }) => {
  await stubSpeech(page);
  await fresh(page);
  await openStudent(page);
  await toggleReadAloud(page);
  await startHintedLevel(page);

  await stopButton(page).click();
  await noButton(page).click();
  await expect(askTitle(page)).toHaveCount(0);

  // No change in behavior (product-spec.md AC #6): the next question still reads itself
  // automatically, exactly as it did before the ask. (The settings dialog's own switch
  // only opens from the home screen, not from deep inside Practice, so this checks the
  // live behavior directly instead of the stored setting.)
  await answerQuestion(page, 999); // guaranteed wrong, so "הבא" appears deterministically
  await page.getByRole("button", { name: "הבא" }).click();
  await expect(stopButton(page)).toBeVisible();
});

test("answering \"כן, כבו\" turns auto-read-aloud off for this student", async ({ page }) => {
  await stubSpeech(page);
  await fresh(page);
  await openStudent(page);
  await toggleReadAloud(page);
  await startHintedLevel(page);

  await stopButton(page).click();
  await yesButton(page).click();
  await expect(askTitle(page)).toHaveCount(0);

  // The running session itself stops reading automatically from this point on, with no
  // reload needed (product-spec.md AC #5, "מרגע זה האפליקציה לא מקריאה"). Advance to a
  // fresh question and confirm it stays silent (play button, not a stop button already
  // talking) — same live-behavior check as the sibling "לא, המשיכו" test, for the same
  // reason (no settings dialog reachable from deep inside Practice).
  await answerQuestion(page, 999); // guaranteed wrong, so "הבא" appears deterministically
  await page.getByRole("button", { name: "הבא" }).click();
  await page.waitForTimeout(800); // long enough that an auto-read would have started
  await expect(playButton(page)).toBeVisible();
  await expect(stopButton(page)).toHaveCount(0);
});

test("after answering once, stopping again right away does not ask a second time", async ({ page }) => {
  await stubSpeech(page);
  await fresh(page);
  await openStudent(page);
  await toggleReadAloud(page);
  await startHintedLevel(page);

  await stopButton(page).click();
  await noButton(page).click(); // keeps auto-read-aloud on, starts the ~2-day suppression

  // Listen again and stop again — same question, same reading mechanism.
  await playButton(page).click();
  await expect(stopButton(page)).toBeVisible();
  await stopButton(page).click();

  await expect(askTitle(page)).toHaveCount(0);
});

test("asks again once the ~2-day suppression window has passed", async ({ page }) => {
  await stubSpeech(page);
  await fresh(page);
  await openStudent(page);
  await toggleReadAloud(page);
  await startHintedLevel(page);

  await stopButton(page).click();
  await noButton(page).click();

  // Fast-forward well past the suppression window, no further navigation needed — same
  // technique already used in adaptive-difficulty.spec.ts/adaptive-lesson-start.spec.ts to
  // skip a real wait instead of actually waiting it out.
  await page.clock.install();
  await page.clock.fastForward(SUPPRESS_WINDOW_MS + 60 * 60 * 1000);

  await playButton(page).click();
  await expect(stopButton(page)).toBeVisible();
  await stopButton(page).click();

  await expect(askTitle(page)).toBeVisible();
});

test("the ask's suppression belongs to the student, not the device", async ({ page }) => {
  await stubSpeech(page);
  await fresh(page);

  const studentA = await openStudent(page);
  await toggleReadAloud(page);
  await startHintedLevel(page);
  await stopButton(page).click();
  await noButton(page).click(); // studentA is now suppressed for ~2 days

  // A different child on the same device: back to grade picker, switch student.
  await switchStudentFromPractice(page);
  await createAndSelectStudent(page);
  await page.locator(".grade-card").first().click();
  await toggleReadAloud(page);
  await startHintedLevel(page);
  await stopButton(page).click();

  // studentB was never asked before — not suppressed.
  await expect(askTitle(page)).toBeVisible();
  await noButton(page).click();

  // Back to studentA: still suppressed, from before the switch.
  await switchStudentFromPractice(page);
  await page.locator(".student-card", { hasText: studentA }).click();
  await page.locator(".grade-card").first().click();
  await startHintedLevel(page);
  // Auto-read-aloud is still on for studentA, so the question is already reading itself —
  // no need to press play first.
  await expect(stopButton(page)).toBeVisible();
  await stopButton(page).click();
  await expect(askTitle(page)).toHaveCount(0);
});

test("does not block answering the question while the ask is showing, and ignoring it does not suppress the next ask", async ({
  page,
}) => {
  await stubSpeech(page);
  await fresh(page);
  await openStudent(page);
  await toggleReadAloud(page);
  await startHintedLevel(page);

  await stopButton(page).click();
  await expect(askTitle(page)).toBeVisible();

  // Answer the actual question without touching the ask at all. A wrong answer
  // (guaranteed-wrong sentinel, same convention as answerQuestion.ts's own docs) keeps the
  // "הבא" button around deterministically, instead of racing the correct-answer
  // auto-advance timer.
  await answerQuestion(page, 999);

  // Continuing through the number pad/check made the ask go away on its own, and the
  // underlying question flow worked normally (not blocked by anything on top of it).
  await expect(askTitle(page)).toHaveCount(0);
  await expect(page.locator(".answer-input")).toBeDisabled();

  // Because the ask was never answered, the next interruption asks again right away —
  // no suppression window was started by ignoring it.
  await page.getByRole("button", { name: "הבא" }).click();
  await expect(stopButton(page)).toBeVisible();
  await stopButton(page).click();
  await expect(askTitle(page)).toBeVisible();
});
