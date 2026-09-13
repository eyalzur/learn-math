import { test, expect, type Page } from "@playwright/test";
import { answerUncertainly, drawOnCanvas } from "./helpers/notebookAnswer";

/**
 * Acceptance criteria under test (docs/features/teacher-misread-log/product-spec.md and
 * design.md).
 *
 * This feature is server-side-only by design (design.md: "אין מסך צפייה/מחיקה
 * באפליקציה... הזרימה שהתלמיד/ה חווה נשארת בדיוק כמו היום") — there is nothing on screen
 * that changes, and a mocked /read-page in this suite means there is no real Firestore to
 * check a write landed in. What IS observable, and what these tests check, is the wire
 * contract: what the client actually sends over the network in response to user action —
 * exactly the "המשוב... נשלח בחזרה למורה יחד עם אותו דף" and "רק סבב שכולל תיקון בפועל"
 * acceptance criteria, and that the visible correction flow itself has no regression.
 *
 * playwright.config.ts points VITE_NOTEBOOK_SERVER_URL at a fixed, unresolvable host, so
 * every /read-page request in this file is intercepted — no real network call, and no real
 * Firestore write, ever happens in this suite.
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

test("the first send (no correction yet) carries no correction or question-identifying fields", async ({ page }) => {
  await openLevel(page);

  let body: Record<string, unknown> = {};
  await page.route("**/read-page", (route) => {
    body = route.request().postDataJSON() as Record<string, unknown>;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ reading: { certain: false } }),
    });
  });
  await drawOnCanvas(page);
  await sendButton(page).click();
  await page.getByText("לא הצלחתי לקרוא את זה בבירור").waitFor({ state: "visible" });

  expect(body.studentCorrection).toBeUndefined();
  expect(body.previousReading).toBeUndefined();
  expect(body.questionMeta).toBeUndefined();
});

test("a correction round sends the previous reading and a question identifier alongside the correction text", async ({
  page,
}) => {
  await openLevel(page);
  await answerUncertainly(page);
  await page.getByRole("button", { name: "ספרו למורה מה כתבתם" }).click();

  let body: Record<string, unknown> = {};
  await page.unroute("**/read-page").catch(() => {});
  await page.route("**/read-page", (route) => {
    body = route.request().postDataJSON() as Record<string, unknown>;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ reading: { certain: true, processReflection: "הבנתי עכשיו.", finalAnswer: 4 } }),
    });
  });
  await page.getByRole("textbox", { name: "מה באמת כתבתם?" }).fill("כתבתי 4");
  await page.getByRole("button", { name: "שליחה למורה" }).click();
  await page.locator(".teacher-reading").waitFor({ state: "visible" });

  expect(body.studentCorrection).toBe("כתבתי 4");
  // The previous reading (what preceded this correction) — the earlier send in this test
  // was uncertain, so that's what should be echoed back for the server to log.
  expect(body.previousReading).toEqual({ certain: false });
  // Some question-identifying information travels with the correction — exact field names
  // aren't dictated by the spec, but a meaningful, non-empty identifier must be present.
  expect(body.questionMeta).toBeTruthy();
  const meta = body.questionMeta as Record<string, unknown>;
  const hasIdentifier = Object.values(meta).some((v) => typeof v === "string" && v.trim() !== "");
  expect(hasIdentifier).toBe(true);
});

test("the correction flow itself is unchanged: correcting an uncertain reading still shows the confident result that comes back", async ({
  page,
}) => {
  await openLevel(page);
  await answerUncertainly(page);
  await page.getByRole("button", { name: "ספרו למורה מה כתבתם" }).click();

  await page.route("**/read-page", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ reading: { certain: true, processReflection: "עכשיו ברור.", finalAnswer: 4 } }),
    }),
  );
  await page.getByRole("textbox", { name: "מה באמת כתבתם?" }).fill("כתבתי 4");
  await page.getByRole("button", { name: "שליחה למורה" }).click();

  await expect(page.locator(".teacher-reading")).toBeVisible();
  await expect(page.locator(".teacher-reading h3")).toHaveText("מה המורה הבינה עכשיו");
  await expect(page.getByRole("textbox", { name: "מה באמת כתבתם?" })).toHaveCount(0);
});
