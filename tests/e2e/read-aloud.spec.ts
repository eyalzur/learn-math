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
    // A real engine finishes an utterance and fires `onend`; the app chains the next part
    // off that event. A stub that only records would leave the chain stuck on part one
    // forever, so the timer here is what makes it behave like an engine at all.
    let pendingEnd: ReturnType<typeof setTimeout> | undefined;
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => voiceList,
        addEventListener: () => {},
        cancel: () => {
          cancels++;
          clearTimeout(pendingEnd);
          pendingEnd = undefined;
        },
        speak: (u: FakeUtterance) => {
          spoken.push({
            text: u.text,
            lang: u.lang,
            rate: u.rate,
            pitch: u.pitch,
            voiceName: u.voice?.name ?? null,
          });
          pendingEnd = setTimeout(() => u.onend?.(), 10);
        },
      },
    });
  }, voices);
}

/** Waits until the app has dispatched at least `n` parts. */
async function waitForParts(page: Page, n: number) {
  await page.waitForFunction(
    (count) => (window as unknown as { __spoken: Spoken[] }).__spoken.length >= count,
    n,
    { timeout: 8000 },
  );
}

/**
 * Waits until nothing new has been spoken for longer than the longest pause.
 *
 * The poll interval has to exceed the gap before the analogy, or "settled" just means
 * "mid-pause" and every assertion after it reads a half-finished reading.
 */
async function waitUntilSettled(page: Page) {
  let previous = -1;
  for (let i = 0; i < 20; i++) {
    const count = (await spokenText(page)).length;
    if (count === previous) return;
    previous = count;
    await page.waitForTimeout(1200);
  }
}

/** Walks the level until an explanation with at least two steps shows up, so the reading
 *  is guaranteed to have a pause in the middle rather than being one part end to end. */
async function failUntilMultiStep(page: Page) {
  for (let i = 0; i < 10; i++) {
    if ((await page.locator(".explanation-step").count()) >= 2) return true;
    await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
    // The last question leads to the result screen, not another question — stop rather
    // than hanging on an input that is no longer there.
    if ((await page.locator(".answer-input").count()) === 0) return false;
    await page.locator(".answer-input").fill("999999");
    await page.getByRole("button", { name: "בדיקה" }).click();
  }
  return false;
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
  await waitUntilSettled(page);

  const spoken = await spokenText(page);
  const everything = spoken.map((s) => s.text).join(" ");

  for (const s of spoken) expect(s.lang).toBe("he-IL");

  // The analogy is read, and every step contributes its prose. Which unit carries which
  // sentence is the implementation's business; that all of it is said is the promise.
  expect(everything).toContain(analogy);
  for (const step of steps) {
    const prose = step.split("\n")[0].trim();
    if (prose) expect(everything).toContain(prose);
  }
});

test("the explanation is spoken as separate units, not one run-on block", async ({
  page,
}) => {
  await stubSpeech(page);
  await failFirstQuestion(page);

  const stepCount = await page.locator(".explanation-step").count();

  await page.getByRole("button", { name: "הקריאו לי את ההסבר" }).click();
  await waitUntilSettled(page);

  const spoken = await spokenText(page);
  // One unit per step plus one for the analogy, at minimum — sentence ends inside a step
  // may split it further, which is also correct.
  expect(spoken.length).toBeGreaterThanOrEqual(stepCount + 1);
});

test("no part is swallowed and none is said twice", async ({ page }) => {
  await stubSpeech(page);
  await failFirstQuestion(page);

  await page.getByRole("button", { name: "הקריאו לי את ההסבר" }).click();
  await waitUntilSettled(page);

  const parts = (await spokenText(page)).map((s) => s.text.trim());

  for (const part of parts) expect(part.length).toBeGreaterThan(0);
  expect(new Set(parts).size, `a part was spoken twice: ${JSON.stringify(parts)}`).toBe(
    parts.length,
  );

  // A unit made of nothing but digits would mean a number was cut in half — the failure
  // mode a naive split on "." produces on a decimal like 2.5.
  for (const part of parts) {
    expect(part, "a bare number was left as its own unit").not.toMatch(/^\d+$/);
  }
});

test("the reading is slower than before, without dragging", async ({ page }) => {
  await stubSpeech(page);
  await failFirstQuestion(page);

  await page.getByRole("button", { name: "הקריאו לי את ההסבר" }).click();
  await waitUntilSettled(page);

  for (const { rate } of await spokenText(page)) {
    expect(rate, "should be slower than the 0.92 shipped before").toBeLessThan(0.92);
    expect(rate, "below 0.7 an engine drags and a child gives up").toBeGreaterThanOrEqual(
      0.7,
    );
  }
});

test("the button stays on stop through the pauses, and only resets at the end", async ({
  page,
}) => {
  await stubSpeech(page);
  // "מספרים עד 20" is where two-step explanations live; a single-part reading has no
  // mid-sequence pause to test.
  await failFirstQuestion(page, 0);

  const found = await failUntilMultiStep(page);
  expect(found, "no explanation in this level had two steps to pause between").toBe(true);

  await page.getByRole("button", { name: "הקריאו לי את ההסבר" }).click();

  // After the first unit finishes we are inside a pause, with parts still to come. If the
  // icon flipped back to play here, it would tell a child the explanation was over and
  // invite her to cut it off herself.
  await waitForParts(page, 1);
  await expect(page.getByRole("button", { name: "עצרו את ההקראה" })).toBeVisible();

  await waitUntilSettled(page);
  await expect(page.getByRole("button", { name: "הקריאו לי את ההסבר" })).toBeVisible();
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
      // The explanation now opens with the method sentence — prose with no arithmetic —
      // so sampling any single part proves nothing. The promise is about the whole
      // reading: no symbol survives anywhere, and the operator words appear somewhere.
      await waitUntilSettled(page);
      const spoken = (await spokenText(page)).map((s) => s.text).join(" ");

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

test("pressing the button again stops the whole explanation, not just the current part", async ({
  page,
}) => {
  await stubSpeech(page);
  await failFirstQuestion(page);

  await page.getByRole("button", { name: "הקריאו לי את ההסבר" }).click();
  const stop = page.getByRole("button", { name: "עצרו את ההקראה" });
  await expect(stop).toBeVisible();

  await waitForParts(page, 1);
  await stop.click();
  await expect(page.getByRole("button", { name: "הקריאו לי את ההסבר" })).toBeVisible();

  // The parts still queued must never arrive. A pending timer that survived the stop
  // would speak the rest of the explanation after the child asked for silence.
  const atStop = (await spokenText(page)).length;
  await page.waitForTimeout(2000);
  expect((await spokenText(page)).length, "a queued part was spoken after stopping").toBe(
    atStop,
  );
});

test("moving to the next question cancels every part still pending", async ({ page }) => {
  await stubSpeech(page);
  await failFirstQuestion(page);

  await page.getByRole("button", { name: "הקריאו לי את ההסבר" }).click();
  await waitForParts(page, 1);

  await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();

  const atSwitch = (await spokenText(page)).length;
  await page.waitForTimeout(2000);
  expect(
    (await spokenText(page)).length,
    "a step of the previous explanation played over the new question",
  ).toBe(atSwitch);
});

test("leaving the practice cancels every part still pending", async ({ page }) => {
  await stubSpeech(page);
  await failFirstQuestion(page);

  await page.getByRole("button", { name: "הקריאו לי את ההסבר" }).click();
  await waitForParts(page, 1);

  await page.getByRole("button", { name: "← חזרה" }).click();

  const atExit = (await spokenText(page)).length;
  await page.waitForTimeout(2000);
  expect(
    (await spokenText(page)).length,
    "the explanation kept playing after leaving the practice",
  ).toBe(atExit);
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
