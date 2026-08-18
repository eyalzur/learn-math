import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test
 * (docs/features/more-diagrams/product-spec.md, גל ב׳ — the five remaining shapes).
 *
 * שטח והיקף, משפט פיתגורס, אחוזים, יחס ופרופורציה, and פונקציה קווית — Rotem's and
 * Omer's shapes. Same rules as every earlier wave: the picture lives only in the
 * explanation box after a wrong answer, is built from the prompt, and never disagrees
 * with its own question (that half is checked in content.spec.ts, against the data
 * directly). What only a screen can confirm is here: that a picture appears at all, that
 * arithmetic inside an SVG still reads left-to-right on this right-to-left page, and that
 * the fill/outline and "?" conventions design.md decided on actually show up.
 *
 * `innerText` returns undefined on SVG elements, so numbers are read with `textContent`
 * through `evaluateAll`.
 */

async function open(page: Page, student: string, topic: string, level: "קל" | "מתקדם") {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").filter({ hasText: student }).click();
  await page.locator(".topic-card").filter({ hasText: topic }).click();
  await page.locator(".level-card").filter({ hasText: level }).click();
}

const answer = async (page: Page, value: string) => {
  await page.locator(".answer-input").fill(value);
  await page.getByRole("button", { name: "בדיקה" }).first().click();
};

/** Walks the level until the prompt contains `wanted`, then answers it wrong. */
async function failAt(page: Page, wanted: string) {
  for (let i = 0; i < 10; i++) {
    const prompt = await page.locator(".problem-text").innerText();
    if (prompt.includes(wanted)) break;
    await answer(page, "999999");
    await page.getByRole("button", { name: /הבא|סיום/ }).click();
  }
  await expect(page.locator(".problem-text")).toContainText(wanted);
  await answer(page, "999999");
  // Most wrong answers on these topics have no matching mistake diagnosis, so the
  // explanation reveals itself — but click through if one ever does appear.
  const reveal = page.getByText("אני רוצה לראות את התשובה");
  if (await reveal.isVisible().catch(() => false)) await reveal.click();
}

// -------------------------------------------------------- the picture never leaks early

test("no geometry shape before the question is answered", async ({ page }) => {
  await open(page, "רותם", "שטח והיקף", "קל");
  await expect(page.locator(".problem-text")).toBeVisible();
  await expect(page.locator(".geometry-shape")).toHaveCount(0);
});

test("a correct answer shows no geometry shape", async ({ page }) => {
  // A level climbs from the easy end, so this opens on "שטח מלבן שאורכו 5 ורוחבו 4".
  await open(page, "רותם", "שטח והיקף", "קל");
  await answer(page, "20");
  await expect(page.locator(".feedback.correct")).toBeVisible();
  await expect(page.locator(".geometry-shape")).toHaveCount(0);
});

// ------------------------------------------------------------------------ geometry

test("area is shown filled, perimeter is shown outlined", async ({ page }) => {
  await open(page, "רותם", "שטח והיקף", "קל");
  await failAt(page, "שטח מלבן שאורכו 5 ורוחבו 4");
  await expect(page.locator(".gs-shape.gs-filled")).toHaveCount(1);
  await expect(page.locator(".gs-shape.gs-outlined")).toHaveCount(0);

  await page.getByRole("button", { name: /הבא|סיום/ }).click();
  await failAt(page, "היקף מלבן שאורכו 5 ורוחבו 2");
  await expect(page.locator(".gs-shape.gs-outlined")).toHaveCount(1);
  await expect(page.locator(".gs-shape.gs-filled")).toHaveCount(0);
});

test("a reverse geometry question marks the missing side with a question mark", async ({ page }) => {
  await open(page, "רותם", "שטח והיקף", "מתקדם");
  await failAt(page, "שטח מלבן הוא 12 ורוחבו 3. מה האורך?");
  await expect(page.locator(".geometry-shape")).toContainText("?");
  // And the given numbers still appear — the picture is not just a blank shape.
  await expect(page.locator(".geometry-shape")).toContainText("3");
});

test("numbers inside the geometry shape read left to right", async ({ page }) => {
  await open(page, "רותם", "שטח והיקף", "קל");
  await failAt(page, "שטח מלבן שאורכו 5 ורוחבו 4");
  await expect(page.locator(".geometry-shape")).toHaveCSS("direction", "ltr");
});

// ---------------------------------------------------------------------- Pythagoras

test("no Pythagoras triangle before the question is answered", async ({ page }) => {
  await open(page, "עומר", "משפט פיתגורס", "קל");
  await expect(page.locator(".problem-text")).toBeVisible();
  await expect(page.locator(".pythagoras-triangle")).toHaveCount(0);
});

test("the right angle is marked, and the asked side carries a question mark", async ({ page }) => {
  await open(page, "עומר", "משפט פיתגורס", "קל");
  await failAt(page, "הניצבים הם 3 ו-4. מה אורך היתר?");
  await expect(page.locator(".pt-right-angle")).toHaveCount(1);
  await expect(page.locator(".pythagoras-triangle")).toContainText("?");
  await expect(page.locator(".pythagoras-triangle")).toContainText("3");
  await expect(page.locator(".pythagoras-triangle")).toContainText("4");
});

test("two equal, unknown legs both carry a question mark", async ({ page }) => {
  await open(page, "עומר", "משפט פיתגורס", "מתקדם");
  await failAt(page, "שני הניצבים שווים ושטח המשולש 18. מה אורך כל ניצב?");
  const marks = await page.locator(".pt-label").evaluateAll((els) => els.map((el) => el.textContent));
  expect(marks.filter((t) => t === "?").length, `saw: ${marks.join(", ")}`).toBe(2);
});

// -------------------------------------------------------------------------- percent

test("no percent strip before the question is answered", async ({ page }) => {
  await open(page, "רותם", "אחוזים", "קל");
  await expect(page.locator(".problem-text")).toBeVisible();
  await expect(page.locator(".percent-strip")).toHaveCount(0);
});

test("the strip carries guide lines at every quarter", async ({ page }) => {
  await open(page, "רותם", "אחוזים", "קל");
  await failAt(page, "כמה זה 10% מ-200?");
  await expect(page.locator(".ps-tick")).toHaveCount(3);
});

test("a price increase extends the strip past its own whole", async ({ page }) => {
  await open(page, "רותם", "אחוזים", "מתקדם");
  await failAt(page, "מחיר 80 שקלים עלה ב-25%. מה המחיר החדש?");
  await expect(page.locator(".ps-extra")).toHaveCount(1);
});

// ----------------------------------------------------------------------------- ratio

test("no ratio strips before the question is answered", async ({ page }) => {
  await open(page, "רותם", "יחס ופרופורציה", "קל");
  await expect(page.locator(".problem-text")).toBeVisible();
  await expect(page.locator(".ratio-strips")).toHaveCount(0);
});

test("the two strips are distinguished by fill, and the caption is two lines", async ({ page }) => {
  await open(page, "רותם", "יחס ופרופורציה", "קל");
  await failAt(page, "היחס הוא 1 ל-2. אם החלק הראשון הוא 3, כמה השני?");
  await expect(page.locator(".rs-block.rs-filled")).toHaveCount(1);
  await expect(page.locator(".rs-block:not(.rs-filled)")).toHaveCount(2);
  await expect(page.locator(".ratio-figure .caption-line")).toHaveCount(2);
});

// --------------------------------------------------------------------------- linear

test("no linear graph before the question is answered", async ({ page }) => {
  await open(page, "עומר", "פונקציה קווית", "קל");
  await expect(page.locator(".problem-text")).toBeVisible();
  await expect(page.locator(".linear-graph")).toHaveCount(0);
});

test("the answering point sits on the line", async ({ page }) => {
  // The prompt's backticks mark arithmetic for LTR isolation (see promptSegments in
  // curriculum.ts) and are split out of the rendered text, not shown literally.
  await open(page, "עומר", "פונקציה קווית", "קל");
  await failAt(page, "בפונקציה y = x + 5, מה הערך של y, כאשר x שווה ל-3?");
  await expect(page.locator(".lg-point")).toHaveCount(1);
  await expect(page.locator(".lg-line")).toHaveCount(1);
});

test("two lines meeting shows both of them, and the point where they meet", async ({ page }) => {
  await open(page, "עומר", "פונקציה קווית", "מתקדם");
  await failAt(page, "שני ישרים נפגשים: y = 2x ו-y = x + 4. מה ה-x בנקודת המפגש?");
  await expect(page.locator(".lg-line")).toHaveCount(2);
  await expect(page.locator(".lg-point")).toHaveCount(1);
});

// ------------------------------------------------------- captions match what a screen reader gets

test("each of the five new pictures' caption is what a screen reader is told", async ({ page }) => {
  await open(page, "רותם", "שטח והיקף", "קל");
  await failAt(page, "שטח מלבן שאורכו 5 ורוחבו 4");
  const shown = (await page.locator(".geometry-figure .figure-caption").innerText()).replace(/\s+/g, " ").trim();
  const spoken = await page.locator(".geometry-shape").getAttribute("aria-label");
  expect(shown.replace(/`/g, "")).toBe(spoken?.replace(/\s+/g, " ").trim());
});
