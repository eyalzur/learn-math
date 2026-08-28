import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test
 * (docs/features/read-aloud-questions/product-spec.md).
 *
 * The speech engine is replaced with a recorder before any app code runs, the same way
 * `read-aloud.spec.ts` does it — `speechSynthesis` is a getter-only accessor on window, so
 * a plain assignment fails silently and the real engine stays in place.
 */

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
          // A real engine fires onend and the app chains the next part off it; without
          // this the chain would stop at part one for ever.
          pendingEnd = setTimeout(() => u.onend?.(), ms);
        },
      },
    });
  }, utteranceMs);
}

/**
 * A browser that has no speech engine at all.
 *
 * Deleting the global, not setting it to undefined: support is decided by whether the
 * name exists on window, so an `undefined` value still reads as supported.
 */
async function stubNoSpeech(page: Page) {
  await page.addInitScript(() => {
    // @ts-expect-error deleting a read-only global for the test
    delete window.speechSynthesis;
  });
}

const spokenText = (page: Page) =>
  page.evaluate(() => (window as unknown as { __spoken: Spoken[] }).__spoken.map((s) => s.text));

async function openStudent(page: Page, index: number) {
  await page.goto("/learn-math/");
  await page.locator(".student-card").nth(index).click();
  // Mika (the only student this file ever passes) now has two grades available; every
  // route here is grade 1 (א׳).
  if (index === 0) await page.locator(".grade-card").first().click();
}

async function fresh(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
}

/** Mika → the topic that carries hints → its first level. First question is `12 + 5`. */
async function startHintedLevel(page: Page) {
  await page.locator(".topic-card").nth(3).click();
  // "חיבור וחיסור עד 20" holds two styles, so it opens on the style screen now.
  await page.locator(".style-card").first().click();
}

const speakButton = (page: Page) =>
  page.getByRole("button", { name: "הקריאו לי את השאלה" });

// --------------------------------------------------------------- hearing the question

test("every question can be heard before answering, without a mistake first", async ({
  page,
}) => {
  await stubSpeech(page);
  await fresh(page);
  await openStudent(page, 0);
  await startHintedLevel(page);

  // Nothing has been answered and nothing has gone wrong yet.
  await expect(speakButton(page)).toBeVisible();
  await speakButton(page).click();
  await expect.poll(() => spokenText(page)).not.toHaveLength(0);
});

test("the arithmetic is spoken as Hebrew words, not skipped symbols", async ({ page }) => {
  await stubSpeech(page);
  await fresh(page);
  await openStudent(page, 0);
  await startHintedLevel(page);
  await expect(page.locator(".problem-text")).toContainText("12");

  await speakButton(page).click();
  await expect.poll(() => spokenText(page)).not.toHaveLength(0);
  const said = (await spokenText(page)).join(" ");

  expect(said, "the plus sign is read as a word").toContain("ועוד");
  expect(said, "raw symbols never reach the engine").not.toContain("+");
});

test("a hint is read too — help that cannot be read is not help", async ({ page }) => {
  await stubSpeech(page);
  await fresh(page);
  await openStudent(page, 0);
  await page.getByRole("switch").click();
  await startHintedLevel(page);

  await expect.poll(() => spokenText(page)).not.toHaveLength(0);
  const beforeHint = (await spokenText(page)).length;

  await page.getByRole("button", { name: /רמז/ }).click();
  await expect.poll(() => spokenText(page)).not.toHaveLength(beforeHint);

  // What was spoken last is the hint that just appeared, not the question again.
  const hintOnScreen = await page.locator(".hint").first().innerText();
  const lastSpoken = (await spokenText(page)).slice(beforeHint).join(" ");
  expect(lastSpoken.slice(0, 12)).toBe(hintOnScreen.slice(0, 12));
});

// ------------------------------------------------------------------- the setting

test("the setting is off until someone turns it on", async ({ page }) => {
  await stubSpeech(page);
  await fresh(page);
  await openStudent(page, 0);

  await expect(page.getByRole("switch")).toHaveAttribute("aria-checked", "false");
});

test("with the setting off, nothing is spoken until it is asked for", async ({ page }) => {
  await stubSpeech(page);
  await fresh(page);
  await openStudent(page, 0);
  await startHintedLevel(page);

  // Long enough that a delayed auto-read would have fired.
  await page.waitForTimeout(800);
  expect(await spokenText(page), "silence unless asked").toHaveLength(0);
});

test("with the setting on, a new question reads itself", async ({ page }) => {
  await stubSpeech(page);
  await fresh(page);
  await openStudent(page, 0);
  await page.getByRole("switch").click();
  await startHintedLevel(page);

  await expect.poll(() => spokenText(page)).not.toHaveLength(0);
});

test("the setting survives a reload", async ({ page }) => {
  await stubSpeech(page);
  await fresh(page);
  await openStudent(page, 0);
  await page.getByRole("switch").click();

  await page.reload();
  await expect(page.getByRole("switch")).toHaveAttribute("aria-checked", "true");
});

test("the setting belongs to the student, not the device", async ({ page }) => {
  await stubSpeech(page);
  await fresh(page);

  await openStudent(page, 0);
  await page.getByRole("switch").click();
  await expect(page.getByRole("switch")).toHaveAttribute("aria-checked", "true");

  // A different child on the same device is unaffected. Mika's topics screen leads to
  // the grade picker first ("← חזרה") — switching student happens from there.
  await page.getByRole("button", { name: "← חזרה" }).click();
  await page.getByRole("button", { name: "← החלף תלמיד" }).click();
  await page.locator(".student-card").nth(1).click();
  // Every student now picks a grade first (docs/features/any-grade-any-student).
  await page.locator(".grade-card").nth(2).click(); // grade ו׳
  await expect(page.getByRole("switch")).toHaveAttribute("aria-checked", "false");

  // And the first child's choice is still there — the read-aloud setting, that is; her
  // grade choice was explicitly forgotten by stepping back to reconsider it earlier in
  // this test (a plain reload would have kept it, going back to pick again does not).
  await page.getByRole("button", { name: "← חזרה" }).click();
  await page.getByRole("button", { name: "← החלף תלמיד" }).click();
  await page.locator(".student-card").nth(0).click();
  await page.locator(".grade-card").first().click();
  await expect(page.getByRole("switch")).toHaveAttribute("aria-checked", "true");
});

// --------------------------------------------------------------------- stopping

test("checking an answer silences a reading in progress", async ({ page }) => {
  await stubSpeech(page);
  await fresh(page);
  await openStudent(page, 0);
  await page.getByRole("switch").click();
  await startHintedLevel(page);
  await expect.poll(() => spokenText(page)).not.toHaveLength(0);

  await page.locator(".answer-input").fill("17");
  await page.getByRole("button", { name: "בדיקה" }).click();

  // The button is back to its idle state, which is the visible half of "stopped".
  await expect(speakButton(page)).toBeVisible();
});

test("the speak button turns into a stop, and pressing it again stops", async ({ page }) => {
  // A sentence that lasts, so the talking state is observable at all.
  await stubSpeech(page, 3000);
  await fresh(page);
  await openStudent(page, 0);
  await startHintedLevel(page);

  await speakButton(page).click();
  const stop = page.getByRole("button", { name: "עצרו את ההקראה" });
  await expect(stop).toBeVisible();

  await stop.click();
  await expect(speakButton(page)).toBeVisible();
});

// ------------------------------------------------------- no engine, no controls

test("a browser with no speech engine shows no setting and no button", async ({ page }) => {
  await stubNoSpeech(page);
  await fresh(page);
  await openStudent(page, 0);

  await expect(page.getByRole("switch")).toHaveCount(0);

  await startHintedLevel(page);
  await expect(page.locator(".speak-button")).toHaveCount(0);
  // And the rest of the screen is untouched.
  await expect(page.locator(".problem-text")).toBeVisible();
  await expect(page.locator(".answer-input")).toBeVisible();
});
