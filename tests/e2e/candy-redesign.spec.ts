import { test, expect, type Page } from "@playwright/test";

/**
 * Acceptance criteria under test (docs/features/candy-redesign/product-spec.md):
 *  1. Main screens (student picker, grade/topic, practice/notebook) show the new dark
 *     purple background, regardless of the OS's light/dark preference.
 *  2. Headings use the new rounded font.
 *  3. Main cards/buttons show clearly rounded corners.
 *  4. The notebook's writing area is framed by a dotted accent-colored border.
 *  5. Text contrast against the new background meets WCAG AA (>= 4.5:1).
 *  6. Arithmetic expressions still render left-to-right.
 *  7. No change in content/logic — covered by the rest of the e2e suite staying green,
 *     not re-tested here (per design.md).
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

async function open(page: Page) {
  // forced-colors/prefers-color-scheme emulation isn't needed: the feature removed the
  // media query entirely, so the same values must show up under light OR dark emulation.
  await page.goto("/learn-math/");
}

test.describe("candy-redesign — dark purple background, regardless of OS preference", () => {
  for (const scheme of ["light", "dark"] as const) {
    test(`student picker shows the dark purple background under OS ${scheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await open(page);
      const { bg } = await root(page);
      expect(bg.toLowerCase()).toBe("#2a1b40");
    });
  }
});

test("grade/topic screen shows the same dark purple background", async ({ page }) => {
  await open(page);
  await page.locator(".student-card").first().click();
  const { bg } = await root(page);
  expect(bg.toLowerCase()).toBe("#2a1b40");
});

test("practice/notebook screen shows the same dark purple background", async ({ page }) => {
  await open(page);
  await page.locator(".student-card").first().click();
  await page.locator(".topic-card, .level-card").first().click();
  const { bg } = await root(page);
  expect(bg.toLowerCase()).toBe("#2a1b40");
});

test("headings use the new rounded font", async ({ page }) => {
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
  await page.locator(".student-card").first().click();
  await page.locator(".topic-card, .level-card").first().click();
  const stage = page.locator(".notebook-stage");
  await expect(stage).toBeVisible();
  const style = await stage.evaluate((el) => {
    const s = getComputedStyle(el);
    return { style: s.borderStyle, width: s.borderWidth, color: s.borderColor };
  });
  expect(style.style).toBe("dotted");
  expect(parseInt(style.width)).toBeGreaterThan(0);
  // The accent color (#ff6fae) rendered as rgb.
  expect(style.color).toBe("rgb(255, 111, 174)");
});

test("text contrast against the new background meets WCAG AA (>= 4.5:1)", async ({ page }) => {
  await open(page);
  const { bg, text, textH, accent } = await root(page);
  expect(contrastRatio(text, bg)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(textH, bg)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(accent, bg)).toBeGreaterThanOrEqual(4.5);
});

test("arithmetic expressions still render left-to-right", async ({ page }) => {
  await open(page);
  await page.locator(".student-card").first().click();
  await page.locator(".topic-card, .level-card").first().click();
  const ltrHeader = page.locator(".notebook-question-header.qh-ltr");
  if (await ltrHeader.count()) {
    const direction = await ltrHeader.evaluate((el) => getComputedStyle(el).direction);
    expect(direction).toBe("ltr");
  }
});
