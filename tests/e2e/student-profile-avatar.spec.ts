import { test, expect, devices, type Page } from "@playwright/test";
import { createAndSelectStudent } from "./helpers/selectStudent";

/**
 * Acceptance criteria under test (docs/features/student-profile-avatar/product-spec.md).
 * Written from the spec, not from the implementation.
 */
const { defaultBrowserType: _unused, ...iPhone13 } = devices["iPhone 13"];
test.use(iPhone13);

async function noPageScroll(page: Page) {
  const { h, v } = await page.evaluate(() => ({
    h: document.documentElement.scrollHeight,
    v: window.innerHeight,
  }));
  expect(h).toBeLessThanOrEqual(v);
}

test("AC1/2: chip shows on the grade screen and the topic home, not in practice", async ({ page }) => {
  await page.goto("/learn-math/");
  await createAndSelectStudent(page, "1");
  await expect(page.getByRole("button", { name: "הפרופיל שלי" })).toBeVisible(); // grade picker
  await page.locator(".grade-card").first().click();
  await expect(page.getByRole("button", { name: "הפרופיל שלי" })).toBeVisible(); // topic home
  await page.locator(".topic-card:not([disabled])").first().click(); // lesson
  await expect(page.getByRole("button", { name: "הפרופיל שלי" })).toHaveCount(0); // lesson
  await page.getByRole("button", { name: "דלג לתרגול →" }).click();
  await expect(page.getByRole("button", { name: "הפרופיל שלי" })).toHaveCount(0);
});

test("AC1: a student saved before avatars existed still works and keeps a stable default", async ({ page }) => {
  await page.goto("/learn-math/");
  await page.evaluate(() => {
    localStorage.setItem(
      "learn-math:users",
      JSON.stringify([{ id: "legacy-1", name: "ישנה", gradeId: "6" }]),
    );
  });
  await page.reload();
  const first = await page.locator(".student-badge").first().innerText();
  expect(first.trim().length).toBeGreaterThan(0);
  await page.reload();
  expect(await page.locator(".student-badge").first().innerText()).toBe(first);
  await page.locator(".student-card", { hasText: "ישנה" }).click();
  await expect(page.getByRole("button", { name: "הפרופיל שלי" })).toBeVisible();
});

test("AC3: drawer opens from the chip on the right edge and closes by ✕, Escape and backdrop", async ({ page }) => {
  await page.goto("/learn-math/");
  await createAndSelectStudent(page, "6", "דנה");
  const chip = page.getByRole("button", { name: "הפרופיל שלי" });
  await chip.click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  const box = await drawer.boundingBox();
  const vw = page.viewportSize()!.width;
  expect(box!.x + box!.width).toBeGreaterThan(vw - 2); // flush with the right edge (RTL start)
  await expect(drawer).toContainText("דנה");
  await expect(drawer).toContainText("כיתה ו׳");

  await page.getByRole("button", { name: "סגירה" }).click();
  await expect(drawer).toHaveCount(0);
  await expect(chip).toBeFocused(); // focus returns

  await chip.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await chip.click();
  await page.mouse.click(10, 300); // dimmed area on the left
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("AC3: focus stays inside the open drawer", async ({ page }) => {
  await page.goto("/learn-math/");
  await createAndSelectStudent(page, "6");
  await page.getByRole("button", { name: "הפרופיל שלי" }).click();
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    const inside = await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]"));
    expect(inside).toBe(true);
  }
});

test("AC4/5: pick an avatar in the drawer — chip and student card update and it persists", async ({ page }) => {
  await page.goto("/learn-math/");
  await createAndSelectStudent(page, "6", "נועה");
  await page.getByRole("button", { name: "הפרופיל שלי" }).click();
  await page.getByRole("button", { name: "צב" }).click();
  await expect(page.getByRole("button", { name: "צב" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "סגירה" }).click();
  await expect(page.getByRole("button", { name: "הפרופיל שלי" })).toContainText("🐢");

  await page.reload();
  await expect(page.getByRole("button", { name: "הפרופיל שלי" })).toContainText("🐢");

  await page.getByRole("button", { name: "הפרופיל שלי" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "החלף תלמיד" }).click();
  await expect(page.locator(".student-card", { hasText: "נועה" })).toContainText("🐢");
});

test("AC4/8: drawer shows recent practice and links to the full progress screen", async ({ page }) => {
  await page.goto("/learn-math/");
  await createAndSelectStudent(page, "6", "היסטוריה");
  const id = await page.evaluate(() => localStorage.getItem("learn-math:student"));
  await page.evaluate((sid) => {
    localStorage.setItem(
      "learn-math:history",
      JSON.stringify(
        [1, 2, 3, 4].map((n) => ({
          at: new Date(2026, 0, n).toISOString(),
          studentId: sid,
          gradeLabel: "כיתה ו׳",
          topicTitle: `נושא-${n}`,
          levelTitle: "קל",
          correct: 7,
          total: 10,
        })),
      ),
    );
  }, id);
  await page.reload();
  await page.getByRole("button", { name: "הפרופיל שלי" }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer.locator(".profile-recent li")).toHaveCount(3);
  await expect(drawer).toContainText("נושא-4"); // newest first
  await expect(drawer).not.toContainText("נושא-1");
  await drawer.getByRole("button", { name: /לכל ההתקדמות/ }).click();
  await expect(page.getByRole("heading", { name: "ההתקדמות שלי" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("AC6: avatar can be chosen in the create dialog, and is optional", async ({ page }) => {
  await page.goto("/learn-math/");
  await page.locator(".student-card-add").click();
  await page.getByLabel("שם").fill("עם-תמונה");
  await page.getByRole("button", { name: "ינשוף" }).click();
  await page.getByRole("button", { name: "יצירה" }).click();
  await expect(page.locator(".student-card", { hasText: "עם-תמונה" })).toContainText("🦉");

  await page.locator(".student-card-add").click();
  await page.getByLabel("שם").fill("בלי-תמונה");
  await page.getByRole("button", { name: "יצירה" }).click();
  await expect(page.locator(".student-card", { hasText: "בלי-תמונה" })).toBeVisible();
});

test("AC7: nothing needs page scroll with the chip, and the open drawer fits 390x664", async ({ page }) => {
  await page.goto("/learn-math/");
  await createAndSelectStudent(page, "8");
  await noPageScroll(page); // grade picker
  await page.locator(".grade-card").nth(3).click();
  await expect(page.locator(".topic-card")).toHaveCount(7);
  await noPageScroll(page); // busiest topic home
  await page.getByRole("button", { name: "הפרופיל שלי" }).click();
  await noPageScroll(page);
  const box = await page.getByRole("dialog").boundingBox();
  expect(box!.height).toBeLessThanOrEqual(664);
  expect(box!.x).toBeGreaterThanOrEqual(0);
  // Every touch target large enough for a 7-year-old.
  for (const b of await page.getByRole("dialog").getByRole("button").all()) {
    const bb = await b.boundingBox();
    expect(bb!.height).toBeGreaterThanOrEqual(40);
    expect(bb!.width).toBeGreaterThanOrEqual(40);
  }
});
