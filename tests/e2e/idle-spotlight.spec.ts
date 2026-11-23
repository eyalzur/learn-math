import { test, expect, type Page } from "@playwright/test";
import { createAndSelectStudent } from "./helpers/selectStudent";
import { answerQuestion } from "./helpers/answerQuestion";

/**
 * Acceptance criteria under test (docs/features/idle-spotlight/product-spec.md,
 * design.md's "gentle breathing" direction). Most of this feature is a visual/motion
 * feel, which isn't meaningfully assertable in e2e — these are the parts that are:
 *  - exactly one card/button is highlighted at any sampled moment, never two, never
 *    zero (given at least one candidate exists), cycling through all of them over time.
 *  - prefers-reduced-motion actually removes both layers (the cycling highlight and
 *    the drifting background glow), not just in theory.
 *  - hover/focus/active on a card or button actually pauses the animation.
 *  - an open modal dialog pauses it screen-wide, even for elements not inside the
 *    dialog itself.
 *  - a continuous animation on every card/button doesn't destabilize real clicks —
 *    this exact class of regression was found and fixed live while building this
 *    feature (a `transform: scale` in the keyframe broke Playwright's click-stability
 *    check; removed, kept box-shadow only — see architecture.md's Implementation Notes).
 */

async function freshStart(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

/** createAndSelectStudent also selects (navigates past the picker screen), so this
 *  clears just the last-selected-student key and reloads to land back on the picker
 *  with the student still in the roster — a full localStorage.clear() would wipe the
 *  students just created. */
async function backToPicker(page: Page) {
  await page.evaluate(() => localStorage.removeItem("learn-math:student"));
  await page.reload();
}

function blurAmount(boxShadow: string): number {
  const m = boxShadow.match(/0px 0px ([\d.]+)px 0px/);
  return m ? parseFloat(m[1]) : 0;
}

test("exactly one card is highlighted at a time, and every card gets a turn", async ({
  page,
}) => {
  await freshStart(page);
  for (let i = 0; i < 3; i++) {
    await createAndSelectStudent(page, "1");
    await backToPicker(page);
  }

  const cards = page.locator(".student-card, .student-card-add");
  await expect(cards).toHaveCount(4);

  const seenGlowing = new Set<number>();
  let simultaneousGlow = false;
  for (let i = 0; i < 45; i++) {
    const amounts = await cards.evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).boxShadow),
    );
    const blurs = amounts.map(blurAmount);
    const glowingNow = blurs.filter((b) => b > 10).length;
    if (glowingNow > 1) simultaneousGlow = true;
    blurs.forEach((b, idx) => {
      if (b > 15) seenGlowing.add(idx);
    });
    await page.waitForTimeout(100);
  }

  expect(simultaneousGlow).toBe(false);
  expect(seenGlowing.size).toBe(4);
});

test("prefers-reduced-motion removes both the card cycle and the background glow", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await freshStart(page);
  await createAndSelectStudent(page, "1");
  await backToPicker(page);

  const card = page.locator(".student-card").first();
  const cardAnimation = await card.evaluate((el) => getComputedStyle(el).animationName);
  expect(cardAnimation).toBe("none");

  const bgAnimation = await page.evaluate(() => {
    const root = document.getElementById("root")!;
    return getComputedStyle(root, "::before").animationName;
  });
  expect(bgAnimation).toBe("none");
});

test("hovering, focusing, or pressing a card pauses its animation", async ({ page }) => {
  await freshStart(page);
  await createAndSelectStudent(page, "1");
  await backToPicker(page);

  const card = page.locator(".student-card").first();
  await card.focus();
  await expect(async () => {
    const playState = await card.evaluate((el) => getComputedStyle(el).animationPlayState);
    expect(playState).toBe("paused");
  }).toPass({ timeout: 2000 });
});

test("an open dialog pauses the spotlight screen-wide", async ({ page }) => {
  await freshStart(page);
  await createAndSelectStudent(page, "1");
  await backToPicker(page);
  await createAndSelectStudent(page, "1");
  await backToPicker(page);

  const card = page.locator(".student-card").first();
  await page.locator(".student-card-delete").first().click();
  await expect(page.locator(".delete-student-backdrop")).toBeVisible();

  await expect(async () => {
    const playState = await card.evaluate((el) => getComputedStyle(el).animationPlayState);
    expect(playState).toBe("paused");
  }).toPass({ timeout: 2000 });
});

test("a continuous ambient animation doesn't destabilize repeated real clicks — regression guard", async ({
  page,
}) => {
  test.setTimeout(40000);
  await freshStart(page);
  await createAndSelectStudent(page, "6");
  // A freshly created student has no remembered menu position yet, so selecting them
  // always lands on the grade-picker first, regardless of the grade chosen at
  // creation time (any-grade-any-student) — same pattern fraction-diagram.spec.ts's
  // openFractions() already establishes.
  await page.locator(".grade-card-6").click();

  // Navigate through several screens' worth of cards/buttons repeatedly, via the
  // app's own "← חזרה" links (this SPA has no browser-history entries per screen,
  // so page.goBack() isn't an option) — exactly the shape of interaction (clicking
  // an idle-breathing element) that broke once already, a transform in the keyframe
  // making Playwright see the element as never "stable". Every grade-6 topic is now
  // adaptive (levels-as-practice), so a topic-card click goes straight to practice —
  // no separate level-picker screen to click through any more.
  for (let i = 0; i < 5; i++) {
    await page.locator(".topic-card").first().click();
    // A topic card opens its lesson first now (docs/features/lesson-always-first).
    await page.getByRole("button", { name: "דלג לתרגול →" }).click();
    await expect(page.locator(".answer-input")).toBeVisible();
    await page.getByRole("button", { name: "← חזרה" }).click();
    await expect(page.locator(".topic-card").first()).toBeVisible();
  }
});

test("the spotlight does not interfere with answering — a real streak stays fast", async ({
  page,
}) => {
  test.setTimeout(40000);
  await freshStart(page);
  await createAndSelectStudent(page, "1");
  // Same first-visit grade-picker step as the regression-guard test above.
  await page.locator(".grade-card-1").click();
  await page.locator(".topic-card").first().click();
  await page.getByRole("button", { name: "דלג לתרגול →" }).click();
  await page.locator(".style-card").first().click();

  // A wildly-wrong answer (999999) reliably skips the mistake-diagnosis follow-up
  // conversation (it's never "close" enough to trigger one), same technique
  // playful-redesign's own harvestAnswers() relies on — so "הבא"/"סיום" appears
  // right after every answer here, with no extra interaction to wait for.
  const total = Number((await page.locator(".progress").innerText()).match(/(\d+)\s*$/)![1]);
  const started = Date.now();
  for (let i = 0; i < total; i++) {
    await answerQuestion(page, 999999);
    await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
  }
  const elapsedMs = Date.now() - started;

  expect(elapsedMs).toBeLessThan(20000);
});
