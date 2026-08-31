import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test (docs/features/notebook-teacher-understanding/product-spec.md).
 *
 * Two criteria are not covered here, and can't be by an e2e test against a mocked server:
 *  - "התיאור נאמן למה שבאמת נכתב בדף... לא פותר מחדש" — this is a promise about what
 *    Claude actually does when reading a real page. A mocked /read-page proves the client
 *    displays exactly what the server said (see the tests below), never that the server's
 *    own reading was faithful — same boundary notebook-server-relay.spec.ts already draws
 *    for the image itself.
 *  - "אין מפתח או סוד Anthropic בקוד הלקוח" — covered in notebook-server-relay.spec.ts
 *    ("no client-side code talks to Anthropic/Claude directly"), which is where that
 *    boundary check already lived before this feature added a reason to test it.
 *
 * Same mocking approach as notebook-server-relay.spec.ts: playwright.config.ts points
 * VITE_NOTEBOOK_SERVER_URL at a fixed, unresolvable host, so every request here is
 * intercepted with page.route — no real network call, and certainly no real (paid) call to
 * Claude, ever happens in this suite.
 */

const MOCK_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

async function openLevel(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").first().click();
  await page.locator(".grade-card").first().click();
  await page.locator(".topic-card").first().click();
  await page.locator(".style-card").first().click();
}

function notebookButton(page: Page) {
  return page.getByRole("button", { name: "📝 מחברת" });
}

function sendButton(page: Page) {
  return page.getByRole("button", { name: /^שלח למורה$|^המורה קוראת\.\.\.$/ });
}

async function drawOnCanvas(page: Page) {
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

type Reading = { certain: true; question: string; answer: string } | { certain: false };

function mockReading(page: Page, reading: Reading) {
  return page.route("**/read-page", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ imageDataUrl: MOCK_IMAGE, reading }),
    }),
  );
}

function mockCommunicationFailure(page: Page) {
  return page.route("**/read-page", (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "boom" }) }),
  );
}

/** Same recorder-based stub read-aloud-questions.spec.ts already uses for this exact purpose. */
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

/** Deleting the global, not setting it to undefined — support is decided by whether the
 *  name exists on window at all, same as read-aloud.spec.ts's identical helper. */
async function stubNoSpeech(page: Page) {
  await page.addInitScript(() => {
    // @ts-expect-error deleting a read-only global for the test
    delete window.speechSynthesis;
  });
}

test("a clear reading shows what was written and the answer as two distinguished, unjudged lines", async ({ page }) => {
  await openLevel(page);
  await notebookButton(page).click();
  await drawOnCanvas(page);
  await mockReading(page, { certain: true, question: "7 + 5=", answer: "12" });
  await sendButton(page).click();

  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("זה הדף שהמורה מסתכל עליו")).toBeVisible();
  await expect(dialog.getByText("מה המורה הבינה")).toBeVisible();

  // Two separate lines, not one merged sentence — the exact requirement in design.md.
  const questionLine = dialog.getByText("מה שכתבת:");
  const answerLine = dialog.getByText("התשובה שרשמת:");
  await expect(questionLine).toBeVisible();
  await expect(answerLine).toBeVisible();
  await expect(questionLine).not.toContainText("12");
  await expect(dialog.getByText("7 + 5=")).toBeVisible();
  await expect(dialog.getByText("12", { exact: true })).toBeVisible();

  // No verdict of any kind — the whole point is reporting what was read, not judging it.
  const dialogText = (await dialog.innerText()).replace(/\s+/g, " ");
  for (const word of ["נכון", "טעות", "טעית", "צדקת", "שגוי"]) {
    expect(dialogText, `dialog should not contain "${word}"`).not.toContain(word);
  }
});

test("an uncertain reading says so plainly instead of guessing, and offers no read-aloud button", async ({ page }) => {
  await openLevel(page);
  await notebookButton(page).click();
  await drawOnCanvas(page);
  await mockReading(page, { certain: false });
  await sendButton(page).click();

  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("לא הצלחתי לקרוא את זה בבירור. אפשר לכתוב שוב, קצת יותר גדול או ברור?")).toBeVisible();

  // The certain-reading labels must not appear — this is a real "I don't know", not a guess
  // dressed up in the same layout.
  await expect(dialog.getByText("מה שכתבת:")).toHaveCount(0);
  await expect(dialog.getByText("התשובה שרשמת:")).toHaveCount(0);
  await expect(dialog.locator(".speak-button")).toHaveCount(0);
});

test("reading it aloud speaks what the teacher understood, and toggles like every other speak button in the app", async ({
  page,
}) => {
  await stubSpeech(page);
  await openLevel(page);
  await notebookButton(page).click();
  await drawOnCanvas(page);
  await mockReading(page, { certain: true, question: "7 + 5=", answer: "12" });
  await sendButton(page).click();

  const dialog = page.getByRole("alertdialog");
  const speakButton = dialog.locator(".speak-button");
  await expect(speakButton).toHaveAttribute("aria-label", "הקריאו לי את מה שהמורה הבינה");

  await speakButton.click();
  await expect(speakButton).toHaveAttribute("aria-label", "עצרו את ההקראה");
  await expect(speakButton).toHaveText("⏹");

  // Two parts (question, then answer) chained with a real pause between them (data/speech.ts)
  // — poll rather than read once, so the assertion doesn't race that pause.
  const spokenText = () =>
    page.evaluate(() =>
      (window as unknown as { __spoken: { text: string }[] }).__spoken.map((s) => s.text).join(" "),
    );
  await expect.poll(spokenText).toContain("12");
  const said = await spokenText();
  expect(said).toContain("7");
  expect(said).toContain("5");

  await speakButton.click();
  await expect(speakButton).toHaveAttribute("aria-label", "הקריאו לי את מה שהמורה הבינה");
  await expect(speakButton).toHaveText("🔊");
});

test("with no speech engine, there is no read-aloud button at all", async ({ page }) => {
  await stubNoSpeech(page);
  await openLevel(page);
  await notebookButton(page).click();
  await drawOnCanvas(page);
  await mockReading(page, { certain: true, question: "7 + 5=", answer: "12" });
  await sendButton(page).click();

  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".speak-button")).toHaveCount(0);
});

test("a failed call to the teacher shows the same generic error as any other communication failure, and the rest of the notebook keeps working", async ({
  page,
}) => {
  await openLevel(page);
  await notebookButton(page).click();
  await drawOnCanvas(page);
  await mockCommunicationFailure(page);
  await sendButton(page).click();

  // No distinct "the teacher couldn't read it" message — design.md is explicit that a
  // failed call and an uncertain reading are not the same thing to the student, and the
  // dialog (which is where an uncertain reading lives) never opens at all here.
  await expect(page.getByText("לא הצלחנו לשלוח את הדף. נסו שוב.")).toBeVisible();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  await expect(page.getByRole("button", { name: "עט" })).toBeEnabled();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(sendButton(page)).toBeEnabled();
});

test("sending only happens on an explicit click — opening the notebook or drawing on it never triggers it on its own", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/read-page", (route) => {
    requests++;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ imageDataUrl: MOCK_IMAGE, reading: { certain: false } }),
    });
  });

  await openLevel(page);
  await notebookButton(page).click();
  await drawOnCanvas(page);
  await page.waitForTimeout(200); // give any accidental auto-trigger a chance to fire
  expect(requests).toBe(0);

  await sendButton(page).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  expect(requests).toBe(1);
});
