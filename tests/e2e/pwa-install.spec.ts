import { test, expect } from "@playwright/test";

/**
 * Acceptance criteria under test (docs/features/pwa-install/product-spec.md), with the
 * exact values from docs/features/pwa-install/design.md:
 *
 *  1. The page links a web app manifest, and it actually resolves with the right fields
 *     (name, short_name, start_url, scope, display, theme_color, background_color).
 *  2. The manifest's icons cover the required sizes/purposes, and every icon file it
 *     references actually resolves (not a 404) — a manifest pointing at a missing icon
 *     passes JSON validation but fails installability in practice.
 *  3. iOS-specific tags are present with the right values: apple-touch-icon link,
 *     apple-mobile-web-app-capable, apple-mobile-web-app-status-bar-style,
 *     apple-mobile-web-app-title (design.md: iOS doesn't read the manifest's
 *     short_name for the home-screen label, so this meta tag is load-bearing).
 *  4. theme-color meta tag matches the manifest's theme_color.
 *  5. The existing app keeps working completely normally in an ordinary browser tab —
 *     no regression from adding these tags (explicit acceptance criterion).
 *
 * What this suite deliberately does NOT attempt: actually triggering or verifying the
 * OS/browser "install to home screen" flow itself — that's native browser/OS chrome no
 * Playwright page can drive, not something product-spec.md asked to be testable.
 */

test("the page links a resolvable manifest with the right top-level fields", async ({ page, baseURL }) => {
  await page.goto("/learn-math/");

  const manifestHref = await page
    .locator('link[rel="manifest"]')
    .getAttribute("href");
  expect(manifestHref).toBeTruthy();

  const manifestUrl = new URL(manifestHref!, baseURL).toString();
  const response = await page.request.get(manifestUrl);
  expect(response.status()).toBe(200);

  const manifest = await response.json();
  expect(manifest.name).toBe("לומדים חשבון");
  expect(manifest.short_name).toBe("חשבון");
  expect(manifest.start_url).toBe("/learn-math/");
  expect(manifest.scope).toBe("/learn-math/");
  expect(manifest.display).toBe("standalone");
  expect(manifest.theme_color).toBe("#aa3bff");
  expect(manifest.background_color).toBe("#ffffff");
});

test("the manifest's icons cover the required sizes/purposes and every icon file actually resolves", async ({
  page,
  baseURL,
}) => {
  await page.goto("/learn-math/");
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
  const manifestUrl = new URL(manifestHref!, baseURL).toString();
  const manifest = await (await page.request.get(manifestUrl)).json();

  const bySizeAndPurpose = (sizes: string, purpose: string) =>
    manifest.icons.find((icon: { sizes: string; purpose: string }) => icon.sizes === sizes && icon.purpose === purpose);

  expect(bySizeAndPurpose("192x192", "any"), "192x192 any-purpose icon listed").toBeTruthy();
  expect(bySizeAndPurpose("512x512", "any"), "512x512 any-purpose icon listed").toBeTruthy();
  expect(bySizeAndPurpose("192x192", "maskable"), "192x192 maskable icon listed").toBeTruthy();
  expect(bySizeAndPurpose("512x512", "maskable"), "512x512 maskable icon listed").toBeTruthy();

  for (const icon of manifest.icons) {
    const iconUrl = new URL(icon.src, baseURL).toString();
    const res = await page.request.get(iconUrl);
    expect(res.status(), `${icon.src} resolves`).toBe(200);
    expect(res.headers()["content-type"], `${icon.src} is served as an image`).toContain("image");
  }
});

test("iOS install tags are present with the right values", async ({ page, baseURL }) => {
  await page.goto("/learn-math/");

  const appleTouchHref = await page.locator('link[rel="apple-touch-icon"]').getAttribute("href");
  expect(appleTouchHref).toBeTruthy();
  const appleTouchUrl = new URL(appleTouchHref!, baseURL).toString();
  const res = await page.request.get(appleTouchUrl);
  expect(res.status(), "apple-touch-icon resolves").toBe(200);

  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute("content", "yes");
  await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute(
    "content",
    "default",
  );
  // design.md: iOS doesn't read the manifest's short_name for the home-screen label —
  // without this meta tag it falls back to the full <title>, which gets cut off.
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute("content", "חשבון");
});

test("theme-color meta tag matches the manifest's theme_color", async ({ page, baseURL }) => {
  await page.goto("/learn-math/");
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
  const manifestUrl = new URL(manifestHref!, baseURL).toString();
  const manifest = await (await page.request.get(manifestUrl)).json();

  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", manifest.theme_color);
});

test("the app keeps working completely normally in an ordinary browser tab", async ({ page }) => {
  await page.goto("/learn-math/");
  // A full, unrelated flow through the app — picking a student, a grade, and a topic —
  // proves the new <head> tags didn't break anything that was already working. A topic
  // can land on a level picker, a style picker, or straight into practice (an adaptive
  // topic) — any of the three is a working app, same as every other spec in this suite
  // already assumes.
  await page.locator(".student-card").first().click();
  await page.locator(".grade-card").first().click();
  await page.locator(".topic-card").first().click();
  const landed =
    (await page.locator(".level-card").count()) ||
    (await page.locator(".style-card").count()) ||
    (await page.locator(".problem-text").count());
  expect(landed, "picking a topic opened on nothing").toBeGreaterThan(0);
});
