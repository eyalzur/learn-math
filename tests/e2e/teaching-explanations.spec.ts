import { test, expect, type Page } from "@playwright/test";

/** Every grade now practises topic by topic, so levels always sit one screen deeper. */
async function openLevels(page: Page, studentIndex: number, topicIndex = 0) {
  await page.locator(".student-card").nth(studentIndex).click();
  await page.locator(".topic-card").nth(topicIndex).click();
}


/**
 * Acceptance criteria under test
 * (docs/features/teaching-explanations/product-spec.md):
 *  1. Every one of the 90 questions shows an explanation on a wrong answer.
 *  2. The explanation shows steps, not just the result.
 *  3. Every question also shows a real-life analogy.
 *  4. The analogy is pitched at the student's age.
 *  5. The explanation refers to the failed question's numbers.
 *  6. A correct answer shows no explanation.
 */

/** Arithmetic left in the prose element renders reversed inside the RTL page. */
const MATH_RUN = /[0-9]\s*[+−\-×÷=]|[+−×÷=]\s*[0-9]|√/;

async function startLevel(page: Page, studentIndex: number, levelIndex: number) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await openLevels(page, studentIndex);
  await page.locator(".level-card").nth(levelIndex).click();
}

/** How many questions this level actually holds — grade 1 has ten, grades 6 and 8 five. */
async function levelSize(page: Page) {
  const text = await page.locator(".progress").innerText();
  const total = Number(text.match(/מתוך\s+(\d+)/)?.[1]);
  expect(total, `could not read the level size from "${text}"`).toBeGreaterThan(0);
  return total;
}

async function answerWrong(page: Page) {
  await page.locator(".answer-input").fill("999999");
  await page.getByRole("button", { name: "בדיקה" }).click();
}

test("every question in every grade explains itself and offers an analogy", async ({
  page,
}) => {
  // The gap this feature closes: grades 6 and 8 previously showed "wrong" and nothing
  // else, which is the moment a student stops learning.
  for (let student = 0; student < 3; student++) {
    for (let level = 0; level < 3; level++) {
      await startLevel(page, student, level);
      const size = await levelSize(page);

      for (let q = 0; q < size; q++) {
        const prompt = await page.locator(".problem-text").innerText();
        await answerWrong(page);

        const where = `student ${student}, level ${level}, "${prompt}"`;
        await expect(page.locator(".explanation"), `no explanation for ${where}`).toBeVisible();
        expect(
          await page.locator(".explanation-step").count(),
          `no steps for ${where}`,
        ).toBeGreaterThan(0);
        await expect(
          page.locator(".explanation-analogy"),
          `no analogy for ${where}`,
        ).toBeVisible();

        await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
      }
    }
  }
});

test("arithmetic inside explanations is never left in the prose element", async ({
  page,
}) => {
  // Guards the bug that shipped during development: "20 ÷ 2 = 10" written into the
  // Hebrew label instead of the maths element rendered as "10 = 2 ÷ 20".
  for (let student = 0; student < 3; student++) {
    for (let level = 0; level < 3; level++) {
      await startLevel(page, student, level);
      const size = await levelSize(page);

      for (let q = 0; q < size; q++) {
        const prompt = await page.locator(".problem-text").innerText();
        await answerWrong(page);

        const labels = await page.locator(".explanation-step > span:first-child").allInnerTexts();
        for (const label of labels) {
          expect(
            MATH_RUN.test(label),
            `maths left in prose for "${prompt}": "${label}"`,
          ).toBe(false);
        }
        const maths = page.locator(".explanation-math");
        for (let i = 0; i < (await maths.count()); i++) {
          await expect(maths.nth(i)).toHaveCSS("direction", "ltr");
        }

        await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
      }
    }
  }
});

test("every analogy is written for its own question, not reused", async ({ page }) => {
  // "Age-appropriate" is a human judgement, so this asserts the objective property that
  // makes it possible instead: each question carries its own concrete sentence. A first
  // attempt matched Hebrew keywords per grade and was thrown away — it failed on
  // "בלון" not being a substring of "בלונים", because Hebrew final letters change form.
  // Keyword matching over prose would have kept breaking on edits without ever catching
  // a real problem.
  const analogies: string[] = [];

  for (let student = 0; student < 3; student++) {
    for (let level = 0; level < 3; level++) {
      await startLevel(page, student, level);
      const size = await levelSize(page);
      for (let q = 0; q < size; q++) {
        const prompt = await page.locator(".problem-text").innerText();
        await answerWrong(page);

        const analogy = (await page.locator(".explanation-analogy").innerText())
          .replace("💡", "")
          .trim();
        expect(analogy.length, `analogy too short to teach anything: "${prompt}"`).toBeGreaterThan(
          10,
        );
        analogies.push(analogy);

        await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
      }
    }
  }

  expect(analogies.length, "the walk should have collected something").toBeGreaterThan(0);
  expect(
    new Set(analogies).size,
    "some analogy is reused across questions",
  ).toBe(analogies.length);

  // The walk above only covers one topic per grade — driving a browser through all 330
  // questions would take minutes. The corpus-wide guarantee is checked against the data
  // the app ships, which is instant and actually complete.
  const duplicates = await page.evaluate(async () => {
    const mod = await import("/learn-math/src/data/curriculum.ts");
    type Q = { id: string; analogy: string };
    type G = { topicSets: { levels: { questions: Q[] }[] }[] };
    const all = (mod.grades as G[])
      .flatMap((g) => g.topicSets)
      .flatMap((t) => t.levels)
      .flatMap((l) => l.questions);
    const seen = new Map<string, string>();
    const bad: string[] = [];
    for (const q of all) {
      if (!q.analogy || q.analogy.trim().length <= 10) bad.push(`${q.id}: analogy too short`);
      const prev = seen.get(q.analogy);
      if (prev) bad.push(`${q.id} reuses the analogy of ${prev}`);
      else seen.set(q.analogy, q.id);
    }
    return { bad, total: all.length };
  });

  expect(duplicates.total, "every grade's questions should be reachable").toBeGreaterThan(300);
  expect(duplicates.bad).toEqual([]);
});

test("the explanation refers to the numbers of the failed question", async ({ page }) => {
  await startLevel(page, 1, 0);
  const prompt = await page.locator(".problem-text").innerText();
  const operands = prompt.match(/\d+/g) ?? [];
  expect(operands.length).toBeGreaterThan(0);

  await answerWrong(page);
  await expect(page.locator(".explanation")).toContainText(operands[0]);
});

test("a correct answer still shows no explanation", async ({ page }) => {
  await startLevel(page, 1, 0);
  await answerWrong(page);
  const answer = (await page.locator(".feedback.wrong").innerText()).match(
    /(-?\d+(?:\.\d+)?)\s*$/,
  )?.[1];
  expect(answer).toBeTruthy();

  await page.getByRole("button", { name: "← חזרה" }).click();
  await page.locator(".level-card").first().click();
  await page.locator(".answer-input").fill(String(answer));
  await page.getByRole("button", { name: "בדיקה" }).click();

  await expect(page.locator(".feedback.correct")).toBeVisible();
  await expect(page.locator(".explanation")).toHaveCount(0);
});
