import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test (docs/features/candy-redesign/product-spec.md).
 */

function root(page: Page) {
  return page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return {
      bg: s.getPropertyValue("--bg").trim(),
      text: s.getPropertyValue("--text").trim(),
      textH: s.getPropertyValue("--text-h").trim(),
      accent: s.getPropertyValue("--accent").trim(),
      heading: s.getPropertyValue("--heading").trim(),
    };
  });
}

function relativeLuminance(hex: string) {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(hexA: string, hexB: string) {
  const [l1, l2] = [relativeLuminance(hexA), relativeLuminance(hexB)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

async function open(page: Page, scheme: "light" | "dark" = "light") {
  await page.emulateMedia({ colorScheme: scheme });
  await page.goto("/learn-math/");
}

/** Student → grade → topic → practice, clicking through a style screen if the topic
 *  happens to be style-based (not every topic drops straight into practice). */
async function enterPractice(page: Page) {
  await page.locator(".student-card").first().click();
  await page.locator(".grade-card").first().click();
  await page.locator(".topic-card, .level-card").first().click();
  const styleCard = page.locator(".style-card").first();
  if (await styleCard.count()) await styleCard.click();
}

test.describe("candy-redesign — fixed pink background, regardless of OS preference", () => {
  for (const scheme of ["light", "dark"] as const) {
    test(`student picker shows the candy background under OS ${scheme} mode`, async ({ page }) => {
      await open(page, scheme);
      const { bg } = await root(page);
      expect(bg.toLowerCase()).toBe("#fff1f7");
    });
  }
});

test("grade/topic screen shows the same background", async ({ page }) => {
  await open(page);
  await page.locator(".student-card").first().click();
  const { bg } = await root(page);
  expect(bg.toLowerCase()).toBe("#fff1f7");
});

test("practice/notebook screen shows the same background", async ({ page }) => {
  await open(page);
  await enterPractice(page);
  const { bg } = await root(page);
  expect(bg.toLowerCase()).toBe("#fff1f7");
});

test("headings use the rounded font", async ({ page }) => {
  await open(page);
  const { heading } = await root(page);
  expect(heading).toContain("Varela Round");
  const h1Font = await page.locator("h1").first().evaluate((el) => getComputedStyle(el).fontFamily);
  expect(h1Font).toContain("Varela Round");
});

test("main cards show clearly rounded corners", async ({ page }) => {
  await open(page);
  const radius = await page.locator(".student-card").first().evaluate((el) => getComputedStyle(el).borderRadius);
  expect(parseInt(radius)).toBeGreaterThanOrEqual(16);
});

test("the notebook's writing area is framed by a dotted accent-colored border", async ({ page }) => {
  await open(page);
  await enterPractice(page);
  const stage = page.locator(".notebook-stage");
  await expect(stage).toBeVisible();
  const style = await stage.evaluate((el) => {
    const s = getComputedStyle(el);
    return { style: s.borderStyle, width: s.borderWidth, color: s.borderColor };
  });
  expect(style.style).toBe("dotted");
  expect(parseInt(style.width)).toBeGreaterThan(0);
  expect(style.color).toBe("rgb(255, 111, 174)");
});

test("text contrast against the background meets WCAG AA (>= 4.5:1)", async ({ page }) => {
  await open(page);
  const { bg, text, textH } = await root(page);
  expect(contrastRatio(text, bg)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(textH, bg)).toBeGreaterThanOrEqual(4.5);
});

test("arithmetic expressions still render left-to-right", async ({ page }) => {
  await open(page);
  await enterPractice(page);
  const ltrHeader = page.locator(".notebook-question-header.qh-ltr");
  await expect(ltrHeader.or(page.locator(".notebook-question-header.qh-rtl"))).toBeVisible();
  if (await ltrHeader.count()) {
    const direction = await ltrHeader.evaluate((el) => getComputedStyle(el).direction);
    expect(direction).toBe("ltr");
  }
});

test("no theme picker, setting, or localStorage key for the design exists", async ({ page }) => {
  await open(page);
  await expect(page.getByRole("button", { name: /ערכת צבעים/ })).toHaveCount(0);
  const hasThemeKey = await page.evaluate(() =>
    Object.keys(localStorage).some((k) => k.toLowerCase().includes("theme")),
  );
  expect(hasThemeKey).toBe(false);
});
