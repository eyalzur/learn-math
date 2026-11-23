import { test, expect, type Page } from "@playwright/test";
import { answerQuestion } from "./helpers/answerQuestion";
import { createAndSelectStudent } from "./helpers/selectStudent";

/**
 * Acceptance criteria under test
 * (docs/features/ball-manipulatives/product-spec.md and design.md).
 *
 * Scope this round: addition ("חיבור עד 10") and subtraction ("חיסור עד 10") only. Size
 * comparison ("מי גדול ממי") is explicitly deferred — see design.md's Out of Scope — and
 * is not covered here.
 *
 * Both topics are adaptive now (src/data/adaptiveAdd10.ts/adaptiveSub10.ts) rather than a
 * fixed question list, and every fresh student's first-ever visit starts at the easy
 * tier (docs/features/adaptive-lesson-start). That tier's operands are always
 * single-digit for both topics, so a brand-new student's very first question in either
 * topic reliably qualifies for the ball diagram — no need to hunt for a specific prompt.
 */

interface Topic {
  name: string;
  op: "add" | "sub";
}

const TOPICS: Topic[] = [
  { name: "חיבור עד 10", op: "add" },
  { name: "חיסור עד 10", op: "sub" },
];

async function open(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

async function enterTopic(page: Page, topic: Topic) {
  await createAndSelectStudent(page);
  await page.locator(".grade-card").first().click();
  await page.locator(".topic-card", { hasText: topic.name }).click();
}

function parseOperands(prompt: string, op: "add" | "sub"): [number, number] {
  // The prompt itself carries a trailing "=" (e.g. "2 + 1 ="), same as every other bare
  // expression in this app — see mika-adaptive-difficulty.spec.ts's own `operands()`.
  const re = op === "add" ? /^(\d+)\s*\+\s*(\d+)\s*=?$/ : /^(\d+)\s*[−-]\s*(\d+)\s*=?$/;
  const m = prompt.trim().match(re);
  if (!m) throw new Error(`unexpected "${op}" prompt: "${prompt}"`);
  return [Number(m[1]), Number(m[2])];
}

async function currentOperands(page: Page, op: "add" | "sub"): Promise<[number, number]> {
  const prompt = await page.locator(".problem-text").innerText();
  return parseOperands(prompt, op);
}

const result = (op: "add" | "sub", a: number, b: number) => (op === "add" ? a + b : a - b);

const figure = (page: Page) => page.locator(".ball-diagram-figure");

for (const topic of TOPICS) {
  test(`${topic.name}: no ball diagram before answering, or after a correct answer`, async ({
    page,
  }) => {
    await open(page);
    await enterTopic(page, topic);
    await expect(page.locator(".problem-text")).toBeVisible();
    await expect(figure(page)).toHaveCount(0);

    const [a, b] = await currentOperands(page, topic.op);
    await answerQuestion(page, result(topic.op, a, b));
    await expect(page.locator(".feedback.correct")).toBeVisible();
    await expect(figure(page)).toHaveCount(0);
  });

  test(`${topic.name}: a wrong answer draws a ball-pile whose counts match the operands exactly`, async ({
    page,
  }) => {
    await open(page);
    await enterTopic(page, topic);
    const [a, b] = await currentOperands(page, topic.op);
    await answerQuestion(page, 999999);

    await expect(figure(page)).toBeVisible();
    // Addition: every ball from both operands ends up in the pile. Subtraction: the
    // pile is the minuend — what was there to begin with, remaining plus removed.
    const total = topic.op === "add" ? a + b : a;
    // The settled/final count either way is the arithmetic result: the sum (addition,
    // all filled) or what's left after taking the subtrahend out (subtraction).
    const filled = result(topic.op, a, b);
    await expect(figure(page).locator(".bd-ball")).toHaveCount(total);
    await expect(figure(page).locator(".bd-ball.filled")).toHaveCount(filled);
  });

  test(`${topic.name}: the picture stays left-to-right inside the right-to-left page`, async ({
    page,
  }) => {
    await open(page);
    await enterTopic(page, topic);
    await answerQuestion(page, 999999);

    const direction = await figure(page)
      .locator(".ball-diagram")
      .first()
      .evaluate((el) => getComputedStyle(el).direction);
    expect(direction).toBe("ltr");
  });

  test(`${topic.name}: the picture's caption is exactly what a screen reader is told`, async ({
    page,
  }) => {
    await open(page);
    await enterTopic(page, topic);
    await answerQuestion(page, 999999);

    const flat = (s: string | null) => (s ?? "").replace(/\s+/g, " ").trim();
    const caption = await figure(page).locator("figcaption").innerText();
    const ariaLabel = await figure(page).locator('[role="img"]').first().getAttribute("aria-label");
    expect(flat(ariaLabel)).toBe(flat(caption));
  });

  test(`${topic.name}: the caption states the real operands and the real result, not placeholders`, async ({
    page,
  }) => {
    await open(page);
    await enterTopic(page, topic);
    const [a, b] = await currentOperands(page, topic.op);
    await answerQuestion(page, 999999);

    const caption = await figure(page).locator("figcaption").innerText();
    expect(caption).toContain(String(a));
    expect(caption).toContain(String(b));
    expect(caption).toContain(String(result(topic.op, a, b)));
  });

  test(`${topic.name}: prefers-reduced-motion shows a static לפני/אחרי pair instead of animating`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    await enterTopic(page, topic);
    const [a, b] = await currentOperands(page, topic.op);
    await answerQuestion(page, 999999);

    const frames = figure(page).locator(".ball-diagram-frame");
    await expect(frames).toHaveCount(2);
    await expect(frames.nth(0).locator(".ball-diagram-frame-label")).toHaveText("לפני");
    await expect(frames.nth(1).locator(".ball-diagram-frame-label")).toHaveText("אחרי");

    const total = topic.op === "add" ? a + b : a;
    // "לפני": addition hasn't merged yet, so only the first operand (a) is filled.
    // Subtraction hasn't split yet either — still one full pile, which is also exactly
    // `a` balls, all filled. Both read as the same number for a different reason.
    await expect(frames.nth(0).locator(".bd-ball")).toHaveCount(total);
    await expect(frames.nth(0).locator(".bd-ball.filled")).toHaveCount(a);

    // "אחרי": the settled result either way, independently countable in both frames —
    // the same numbers the animated path ends on.
    await expect(frames.nth(1).locator(".bd-ball")).toHaveCount(total);
    await expect(frames.nth(1).locator(".bd-ball.filled")).toHaveCount(result(topic.op, a, b));
  });

  test(`${topic.name}: no ball diagram on a topic this feature doesn't cover`, async ({ page }) => {
    // Leak check the other direction — a topic with no ball-diagram support at all
    // (place value) should never show one, no matter how it's answered.
    await open(page);
    await createAndSelectStudent(page);
    await page.locator(".grade-card").first().click();
    await page.locator(".topic-card", { hasText: "עשרות ויחידות" }).click();
    await page.locator(".style-card", { hasText: "כמה עשרות" }).first().click();
    await answerQuestion(page, 999999);
    await expect(page.locator(".explanation")).toBeVisible();
    await expect(figure(page)).toHaveCount(0);
  });
}
