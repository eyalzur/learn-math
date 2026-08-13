import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test
 * (docs/features/read-aloud/product-spec.md):
 *  1. The explanation block shows a read-aloud button.
 *  2. Pressing it reads every step and the analogy, in order.
 *  3. Arithmetic is spoken as Hebrew words, not symbols.
 *  4. It speaks Hebrew.
 *  5. Pressing again stops it.
 *  6. Moving to the next question stops it.
 *  7. With no speech engine, no button is shown at all.
 *  8. With multiple Hebrew voices available, a quality-hinted voice is preferred over a
 *     generic one.
 *  9. With no quality-hinted voice among the Hebrew ones, a Hebrew voice is still chosen
 *     (never silently falls back to no voice at all).
 *  10. Speech rate and pitch are set explicitly, not left on the browser's flat defaults.
 *
 * speechSynthesis is stubbed so the tests assert what the app asks to be said, which is
 * the part that can actually be wrong. Whether a given machine owns a Hebrew voice is
 * not something a test can or should pin down.
 */

type FakeVoice = { name: string; lang: string; voiceURI: string };
type Spoken = { text: string; lang: string; rate: number; pitch: number; voiceName: string | null };

/**
 * Replaces speechSynthesis with a recorder before any app code runs. `voices` lets a test
 * control what getVoices() returns, to exercise voice-preference logic without reading the
 * implementation - only the documented contract (docs/features/read-aloud/architecture.md):
 * getVoices() entries expose lang/name/voiceURI, and a name or voiceURI containing
 * "Enhanced"/"Premium"/"Natural"/"Google"/"Neural" marks a preferred voice.
 */
async function stubSpeech(page: Page, voices: FakeVoice[] = []) {
  await page.addInitScript((voiceList) => {
    const spoken: Spoken[] = [];
    let cancels = 0;
    // @ts-expect-error test hook
    window.__spoken = spoken;
    // @ts-expect-error test hook
    window.__cancels = () => cancels;

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
    // speechSynthesis is a getter-only accessor on window, so a plain assignment fails
    // silently and the real engine stays in place. defineProperty is what replaces it.
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: FakeUtterance,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => voiceList,
        addEventListener: () => {},
        cancel: () => {
          cancels++;
        },
        speak: (u: FakeUtterance) => {
          spoken.push({
            text: u.text,
            lang: u.lang,
            rate: u.rate,
            pitch: u.pitch,
            voiceName: u.voice?.name ?? null,
          });
        },
      },
    });
  }, voices);
}

/** Removes speechSynthesis entirely, as on a browser without the API. */
async function removeSpeech(page: Page) {
  await page.addInitScript(() => {
    // @ts-expect-error deleting a read-only global for the test
    delete window.speechSynthesis;
  });
}

async function failFirstQuestion(page: Page, topicIndex = 1) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").first().click();
  await page.locator(".topic-card").nth(topicIndex).click();
  await page.locator(".level-card").first().click();
  await page.locator(".answer-input").fill("999999");
  await page.getByRole("button", { name: "בדיקה" }).click();
}

const spokenText = (page: Page) =>
  page.evaluate(() => (window as unknown as { __spoken: Spoken[] }).__spoken);

test("the explanation offers a read-aloud button", async ({ page }) => {
  await stubSpeech(page);
  await failFirstQuestion(page);

  const button = page.getByRole("button", { name: "הקריאו לי את ההסבר" });
  await expect(button).toBeVisible();
});

test("pressing it speaks every step and the analogy, in Hebrew", async ({ page }) => {
  await stubSpeech(page);
  await failFirstQuestion(page);

  const steps = await page.locator(".explanation-step").allInnerTexts();
  const analogy = (await page.locator(".explanation-analogy").innerText())
    .replace("💡", "")
    .trim();

  await page.getByRole("button", { name: "הקריאו לי את ההסבר" }).click();

  const spoken = await spokenText(page);
  expect(spoken).toHaveLength(1);
  expect(spoken[0].lang).toBe("he-IL");

  // The analogy is read, and every step contributes its prose.
  expect(spoken[0].text).toContain(analogy);
  for (const step of steps) {
    const prose = step.split("\n")[0].trim();
    if (prose) expect(spoken[0].text).toContain(prose);
  }
});

test("arithmetic is spoken as Hebrew words rather than symbols", async ({ page }) => {
  await stubSpeech(page);
  await failFirstQuestion(page, 3);

  // Not every explanation contains an operator — counting back reads "3, 2, 1" — so walk
  // the level until one does rather than assuming which question sits where.
  let checked = false;
  for (let i = 0; i < 10; i++) {
    const shown = await page.locator(".explanation").innerText();
    if (/[−+×÷=]/.test(shown)) {
      await page.getByRole("button", { name: "הקריאו לי את ההסבר" }).click();
      const spoken = (await spokenText(page)).at(-1)!.text;

      // Left as symbols, a speech engine reads them in English or skips them entirely.
      for (const symbol of ["−", "+", "×", "÷", "="]) {
        expect(spoken, `"${symbol}" was left in the spoken text`).not.toContain(symbol);
      }
      expect(spoken).toMatch(/פחות|ועוד|כפול|חלקי|שווה/);
      checked = true;
      break;
    }
    await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
    await page.locator(".answer-input").fill("999999");
    await page.getByRole("button", { name: "בדיקה" }).click();
  }
  expect(checked, "no explanation in this level contained an expression").toBe(true);
});

test("pressing the button again stops the reading", async ({ page }) => {
  await stubSpeech(page);
  await failFirstQuestion(page);

  await page.getByRole("button", { name: "הקריאו לי את ההסבר" }).click();
  const stop = page.getByRole("button", { name: "עצרו את ההקראה" });
  await expect(stop).toBeVisible();

  await stop.click();
  await expect(page.getByRole("button", { name: "הקריאו לי את ההסבר" })).toBeVisible();
  expect(await page.evaluate(() => (window as never as { __cancels: () => number }).__cancels())).
    toBeGreaterThan(1);
});

test("moving to the next question stops a reading in progress", async ({ page }) => {
  await stubSpeech(page);
  await failFirstQuestion(page);

  await page.getByRole("button", { name: "הקריאו לי את ההסבר" }).click();
  const before = await page.evaluate(() =>
    (window as never as { __cancels: () => number }).__cancels(),
  );

  await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();

  const after = await page.evaluate(() =>
    (window as never as { __cancels: () => number }).__cancels(),
  );
  expect(after, "the previous explanation would keep playing over the new question").
    toBeGreaterThan(before);
});

test("a browser with no speech engine shows no button at all", async ({ page }) => {
  await removeSpeech(page);
  await failFirstQuestion(page);

  // The explanation itself must still be there — only the button goes away.
  await expect(page.locator(".explanation")).toBeVisible();
  await expect(page.locator(".speak-button")).toHaveCount(0);
});

test("prefers a quality-hinted Hebrew voice over a generic one", async ({ page }) => {
  await stubSpeech(page, [
    { name: "Hebrew", lang: "he-IL", voiceURI: "he-generic" },
    { name: "Hebrew (Enhanced)", lang: "he-IL", voiceURI: "he-enhanced" },
  ]);
  await failFirstQuestion(page);

  await page.getByRole("button", { name: "הקריאו לי את ההסבר" }).click();

  const spoken = await spokenText(page);
  expect(spoken[0].voiceName).toBe("Hebrew (Enhanced)");
});

test("still picks a Hebrew voice when none is quality-hinted", async ({ page }) => {
  await stubSpeech(page, [
    { name: "Hebrew One", lang: "he-IL", voiceURI: "he-one" },
    { name: "Hebrew Two", lang: "he-IL", voiceURI: "he-two" },
  ]);
  await failFirstQuestion(page);

  await page.getByRole("button", { name: "הקריאו לי את ההסבר" }).click();

  const spoken = await spokenText(page);
  // No quality hint anywhere - falls back to an available Hebrew voice, never to none.
  expect(spoken[0].voiceName).not.toBeNull();
});

test("sets an explicit speech rate and pitch instead of the browser defaults", async ({
  page,
}) => {
  await stubSpeech(page);
  await failFirstQuestion(page);

  await page.getByRole("button", { name: "הקריאו לי את ההסבר" }).click();

  const spoken = await spokenText(page);
  expect(spoken[0].rate, "rate was left on the browser's default of 1").not.toBe(1);
  expect(spoken[0].pitch, "pitch was left on the browser's default of 1").not.toBe(1);
});
