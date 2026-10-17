import { test, expect, type Page } from "@playwright/test";
import { answerUncertainly, answerViaNotebook, drawOnCanvas, mockTeacherReadingSequence } from "./helpers/notebookAnswer";

/**
 * Acceptance criteria under test (docs/features/notebook-teacher-marks/product-spec.md
 * and design.md).
 *
 * Topic 3 ("חיבור וחיסור עד 20"), not 0 — a bare-equation, written-level (not adaptive)
 * topic, so the question is LTR and its page opens anchored top-left (see
 * docs/features/notebook-question-on-page/) and the question list is fixed, which this
 * file's operand-parsing relies on. Same choice several sibling spec files in this suite
 * already made for the same reasons.
 */

async function openEquationTopic(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").first().click();
  await page.locator(".grade-card").first().click();
  await page.locator(".topic-card").nth(3).click();
  const byStyle = page.locator(".style-card");
  const byLevel = page.locator(".level-card");
  if (await byStyle.count()) await byStyle.first().click();
  else if (await byLevel.count()) await byLevel.first().click();
}

/** `"12 + 5 ="` → `17`. Every question in this topic is a bare "+"/"−" expression. */
async function currentCorrectAnswer(page: Page): Promise<number> {
  const prompt = (await page.locator(".notebook-question-header .problem-text").innerText()).trim();
  const m = prompt.match(/(\d+)\s*([+−])\s*(\d+)/);
  if (!m) throw new Error(`not a bare expression: "${prompt}"`);
  const [, a, op, b] = m;
  return op === "+" ? Number(a) + Number(b) : Number(a) - Number(b);
}

function teacherMark(page: Page) {
  return page.locator(".notebook-question-header .notebook-teacher-mark");
}

function nextButton(page: Page) {
  return page.getByRole("button", { name: /^(הבא|סיום)$/ });
}

test("a page that hasn't been sent to the teacher shows no on-page note", async ({ page }) => {
  await openEquationTopic(page);
  await expect(teacherMark(page)).toHaveCount(0);
});

test("sending to the teacher adds a short colored note on the page itself", async ({ page }) => {
  await openEquationTopic(page);
  const correct = await currentCorrectAnswer(page);
  await answerViaNotebook(page, correct);
  await expect(teacherMark(page)).toBeVisible();
});

test("a correct answer with no errorPointer shows a green note", async ({ page }) => {
  await openEquationTopic(page);
  const correct = await currentCorrectAnswer(page);
  await answerViaNotebook(page, correct);
  const mark = teacherMark(page);
  await expect(mark).toHaveClass(/notebook-teacher-mark-green/);
  await expect(mark).toContainText("יפה מאוד");
});

test("a wrong answer with no errorPointer shows a red, general note", async ({ page }) => {
  await openEquationTopic(page);
  await answerViaNotebook(page, -999999); // never the real answer
  const mark = teacherMark(page);
  await expect(mark).toHaveClass(/notebook-teacher-mark-red/);
  await expect(mark).toContainText("בדוק");
});

test("a correct answer with an errorPointer shows an amber note quoting it, not green", async ({ page }) => {
  await openEquationTopic(page);
  const correct = await currentCorrectAnswer(page);
  await mockTeacherReadingSequence(page, [
    { certain: true, processReflection: "ראיתי את התשובה.", errorPointer: "ראיתי שחישבת `7 + 5` וקיבלת `12`.", finalAnswer: correct },
  ]);
  await drawOnCanvas(page);
  await page.getByRole("button", { name: "שלח למורה" }).click();
  await page.locator(".teacher-reading").waitFor({ state: "visible" });
  const mark = teacherMark(page);
  await expect(mark).toHaveClass(/notebook-teacher-mark-amber/);
  await expect(mark).not.toHaveClass(/notebook-teacher-mark-green/);
  await expect(mark).toContainText("7");
  await expect(mark).toContainText("12");
});

test("a wrong answer with an errorPointer shows a red note quoting it", async ({ page }) => {
  await openEquationTopic(page);
  await mockTeacherReadingSequence(page, [
    { certain: true, processReflection: "ראיתי את התשובה.", errorPointer: "ראיתי שחישבת `23 - 8` וקיבלת `17`.", finalAnswer: -1 },
  ]);
  await drawOnCanvas(page);
  await page.getByRole("button", { name: "שלח למורה" }).click();
  await page.locator(".teacher-reading").waitFor({ state: "visible" });
  const mark = teacherMark(page);
  await expect(mark).toHaveClass(/notebook-teacher-mark-red/);
  await expect(mark).toContainText("23");
  await expect(mark).toContainText("17");
});

test("an uncertain reading shows no colored note on the page, only the existing panel message", async ({
  page,
}) => {
  await openEquationTopic(page);
  await answerUncertainly(page);
  await expect(teacherMark(page)).toHaveCount(0);
  await expect(page.getByText("לא הצלחתי לקרוא את זה בבירור")).toBeVisible();
});

test("the existing 'מה המורה הבינה' panel keeps working exactly as before, alongside the new note", async ({
  page,
}) => {
  await openEquationTopic(page);
  const correct = await currentCorrectAnswer(page);
  await answerViaNotebook(page, correct);
  await expect(page.locator(".teacher-reading h3")).toHaveText("מה המורה הבינה");
  await expect(page.locator(".teacher-reading-line").first()).toBeVisible();
  await expect(teacherMark(page)).toBeVisible();
});

test("a correction replaces the on-page note instead of adding a second one", async ({ page }) => {
  await openEquationTopic(page);
  await mockTeacherReadingSequence(page, [
    { certain: true, processReflection: "ראיתי את התשובה.", finalAnswer: -1 },
    { certain: true, processReflection: "ראיתי את התשובה עכשיו.", finalAnswer: await currentCorrectAnswer(page) },
  ]);
  await drawOnCanvas(page);
  await page.getByRole("button", { name: "שלח למורה" }).click();
  await page.locator(".teacher-reading").waitFor({ state: "visible" });
  await expect(teacherMark(page)).toHaveCount(1);
  await expect(teacherMark(page)).toHaveClass(/notebook-teacher-mark-red/);

  await page.getByRole("button", { name: "המורה טעתה? ספרו לה מה קרה" }).click();
  await page.getByRole("textbox", { name: "מה באמת כתבתם?" }).fill("כתבתי תשובה אחרת");
  await page.getByRole("button", { name: /^שליחה למורה$|^המורה קוראת\.\.\.$/ }).click();
  await page.locator(".teacher-reading h3", { hasText: "מה המורה הבינה עכשיו" }).waitFor({ state: "visible" });

  await expect(teacherMark(page)).toHaveCount(1);
  await expect(teacherMark(page)).toHaveClass(/notebook-teacher-mark-green/);
});

test("the note belongs to the page it was given on, not whichever question is currently live", async ({
  page,
}) => {
  await openEquationTopic(page);
  await answerViaNotebook(page, -999999); // page 1: wrong, red
  await expect(teacherMark(page)).toHaveClass(/notebook-teacher-mark-red/);

  await nextButton(page).click();
  await page.locator(".notebook-question-header").waitFor({ state: "visible" });
  const secondCorrect = await currentCorrectAnswer(page);
  await answerViaNotebook(page, secondCorrect); // page 2: correct, green
  await expect(teacherMark(page)).toHaveClass(/notebook-teacher-mark-green/);

  await page.getByRole("button", { name: "דף קודם" }).click();
  await expect(teacherMark(page)).toHaveClass(/notebook-teacher-mark-red/);

  await page.getByRole("button", { name: "דף הבא" }).click();
  await expect(teacherMark(page)).toHaveClass(/notebook-teacher-mark-green/);
});

test("the note cannot be erased — it is not the student's own ink", async ({ page }) => {
  await openEquationTopic(page);
  const correct = await currentCorrectAnswer(page);
  await answerViaNotebook(page, correct);
  const mark = teacherMark(page);
  const originalText = (await mark.innerText()).trim();
  const box = await mark.boundingBox();
  if (!box) throw new Error("mark has no bounding box");

  await page.getByRole("button", { name: "מחק" }).click();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 20, cy + 5, { steps: 5 });
  await page.mouse.up();

  await expect(mark).toBeVisible();
  expect((await mark.innerText()).trim()).toBe(originalText);
});

test("arithmetic quoted inside the note stays left-to-right, isolated from the surrounding Hebrew", async ({
  page,
}) => {
  await openEquationTopic(page);
  await mockTeacherReadingSequence(page, [
    { certain: true, processReflection: "ראיתי את התשובה.", errorPointer: "ראיתי שחישבת `23 - 8` וקיבלת `17`.", finalAnswer: -1 },
  ]);
  await drawOnCanvas(page);
  await page.getByRole("button", { name: "שלח למורה" }).click();
  await page.locator(".teacher-reading").waitFor({ state: "visible" });

  const mark = teacherMark(page);
  await expect(mark).toHaveCSS("direction", "rtl");
  const mathRun = mark.locator(".prompt-math").first();
  await expect(mathRun).toBeVisible();
  expect(await mathRun.evaluate((el) => getComputedStyle(el).direction)).toBe("ltr");
  expect(await mathRun.evaluate((el) => getComputedStyle(el).unicodeBidi)).toBe("isolate");
});

/**
 * Acceptance criteria added 2026-10-17 ("עדכון סבב ב׳" in product-spec.md/design.md):
 * a handwriting-style font for the note, and a rough red circle+line pointing from an
 * approximate error location toward the note, when the teacher's reading supplies one.
 */

test("the note is rendered in the handwriting-style font, not the app's regular sans", async ({
  page,
}) => {
  await openEquationTopic(page);
  const correct = await currentCorrectAnswer(page);
  await answerViaNotebook(page, correct);
  const fontFamily = await teacherMark(page).evaluate((el) => getComputedStyle(el).fontFamily);
  expect(fontFamily).toContain("Playpen Sans Hebrew");
});

test("an errorPointer with a location shows a red circle and line pointing toward the note", async ({
  page,
}) => {
  await openEquationTopic(page);
  await mockTeacherReadingSequence(page, [
    {
      certain: true,
      processReflection: "ראיתי את התשובה.",
      errorPointer: "ראיתי שחישבת `23 - 8` וקיבלת `17`.",
      errorLocation: { x: 0.3, y: 0.4 },
      finalAnswer: -1,
    },
  ]);
  await drawOnCanvas(page);
  await page.getByRole("button", { name: "שלח למורה" }).click();
  await page.locator(".teacher-reading").waitFor({ state: "visible" });

  const pointer = page.locator(".notebook-teacher-pointer");
  await expect(pointer.locator("circle")).toHaveCount(1);
  await expect(pointer.locator("line")).toHaveCount(1);
  const circle = pointer.locator("circle");
  expect(await circle.getAttribute("cx")).toBe(String(0.3 * 1200));
  expect(await circle.getAttribute("cy")).toBe(String(0.4 * 1600));
});

test("an errorPointer with no location shows no circle or line", async ({ page }) => {
  await openEquationTopic(page);
  await mockTeacherReadingSequence(page, [
    { certain: true, processReflection: "ראיתי את התשובה.", errorPointer: "ראיתי שחישבת `23 - 8` וקיבלת `17`.", finalAnswer: -1 },
  ]);
  await drawOnCanvas(page);
  await page.getByRole("button", { name: "שלח למורה" }).click();
  await page.locator(".teacher-reading").waitFor({ state: "visible" });

  await expect(page.locator(".notebook-teacher-pointer")).toHaveCount(0);
});

test("a plain green or red note (no errorPointer) shows no circle or line", async ({ page }) => {
  await openEquationTopic(page);
  const correct = await currentCorrectAnswer(page);
  await answerViaNotebook(page, correct);
  await expect(page.locator(".notebook-teacher-pointer")).toHaveCount(0);
});
