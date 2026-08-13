import { test, expect, type Page } from "@playwright/test";

/** Every grade now practises topic by topic, so levels always sit one screen deeper. */
async function openLevels(page: Page, studentIndex: number, topicIndex = 0) {
  await page.locator(".student-card").nth(studentIndex).click();
  await page.locator(".topic-card").nth(topicIndex).click();
}


/**
 * Acceptance criteria under test
 * (docs/features/students-and-syllabus/product-spec.md):
 *  1. The app opens on a picker with Mika (grade 1), Rotem (grade 6), Omer (grade 8),
 *     each showing name and grade.
 *  2. Picking a student shows that grade's topics; picking a topic shows three levels.
 *  3. Every grade has exactly three levels; the questions per level are the grade's
 *     own (ten for grade 1, five for grades 6 and 8 — see topics-all-grades).
 *  4. Every question belongs to a topic in its own grade's syllabus.
 *  5. Picking a level starts a practice run over its questions.
 *  6. Finishing a level shows the score summary.
 *  7. You can go back and switch student.
 *  8. The last choice is remembered across a reload.
 *
 * Screens and copy come from design.md.
 */

const EXPECTED = [
  { name: "מיקה", grade: "כיתה א׳" },
  { name: "רותם", grade: "כיתה ו׳" },
  { name: "עומר", grade: "כיתה ח׳" },
];

async function open(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
}

async function pickStudent(page: Page, index: number) {
  await page.locator(".student-card").nth(index).click();
}

test.beforeEach(async ({ page }) => {
  await open(page);
});

test("opens on the student picker with all three students and their grades", async ({
  page,
}) => {
  await expect(page.locator(".student-picker h1")).toHaveText("מי לומד היום?");
  const cards = page.locator(".student-card");
  await expect(cards).toHaveCount(3);

  for (const [i, student] of EXPECTED.entries()) {
    await expect(cards.nth(i).locator(".student-name")).toHaveText(student.name);
    await expect(cards.nth(i).locator(".student-grade")).toHaveText(student.grade);
  }
});

test("picking a student shows that grade's syllabus and three levels", async ({ page }) => {
  await pickStudent(page, 0);

  // Grade 1 practises topic by topic, so its first screen lists topics.
  await expect(page.locator(".greeting")).toContainText("מיקה");
  await expect(page.locator(".topic-card")).toHaveCount(5);
  await expect(page.locator(".topic-picker")).toContainText("חיבור עד 10");
});

test("every grade offers three levels, of the question count its own grade defines", async ({
  page,
}) => {
  // The count is a property of the grade, not a global constant: a Pythagoras question is
  // not the same size as "8 + 5", and ten of them in a row is a chore rather than
  // practice. See docs/features/topics-all-grades/product-spec.md.
  const QUESTIONS_PER_LEVEL = [10, 5, 5];

  for (let studentIndex = 0; studentIndex < EXPECTED.length; studentIndex++) {
    const expected = QUESTIONS_PER_LEVEL[studentIndex];
    await open(page);
    await openLevels(page, studentIndex);

    const levels = page.locator(".level-card");
    await expect(levels).toHaveCount(3);

    for (let levelIndex = 0; levelIndex < 3; levelIndex++) {
      await expect(levels.nth(levelIndex).locator(".level-count")).toHaveText(
        `${expected} שאלות`,
      );
      await levels.nth(levelIndex).click();
      await expect(page.locator(".progress")).toContainText(`מתוך ${expected}`);
      await page.getByRole("button", { name: "← חזרה" }).click();
    }
  }
});

test("every question in every level belongs to its own grade's syllabus", async ({
  page,
}) => {
  // Read the data the app itself ships, then check it against the syllabus each grade
  // home screen displays — a question tagged with a topic from another grade, or one
  // not listed at all, is a content error a reader of the docs would never catch.
  const data = await page.evaluate(async () => {
    // Served under the app's Vite base path (see vite.config.ts).
    const mod = await import("/learn-math/src/data/curriculum.ts");
    type Lv = { questions: { id: string; topic: string }[] };
    type G = {
      label: string;
      topics: string[];
      topicSets: { levels: Lv[] }[];
    };
    return (mod.grades as G[]).map((g) => ({
      label: g.label,
      topics: g.topics,
      levels: g.topicSets
        .flatMap((t) => t.levels)
        .map((l) => l.questions.map((q) => ({ id: q.id, topic: q.topic }))),
    }));
  });

  expect(data).toHaveLength(3);
  const offenders: string[] = [];
  for (const grade of data) {
    for (const questions of grade.levels) {
      for (const question of questions) {
        if (!grade.topics.includes(question.topic)) {
          offenders.push(`${question.id} ("${question.topic}" not in ${grade.label})`);
        }
      }
    }
  }
  expect(offenders).toEqual([]);
});

test("picking a level runs its ten questions and ends on a score summary", async ({
  page,
}) => {
  await openLevels(page, 0);
  await page.locator(".level-card").first().click();

  for (let i = 1; i <= 10; i++) {
    await expect(page.locator(".progress")).toContainText(`שאלה ${i} מתוך 10`);
    await page.locator(".answer-input").fill("0");
    await page.getByRole("button", { name: "בדיקה" }).click();
    await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
  }

  await expect(page.locator(".result .score")).toContainText("מתוך 10");
});

test("you can switch student from the grade screen", async ({ page }) => {
  await pickStudent(page, 2);
  await expect(page.locator(".greeting")).toContainText("עומר");

  await page.getByRole("button", { name: "← החלף תלמיד" }).click();
  await expect(page.locator(".student-picker h1")).toBeVisible();

  await pickStudent(page, 0);
  await expect(page.locator(".greeting")).toContainText("מיקה");
});

test("the chosen student is remembered across a reload", async ({ page }) => {
  await pickStudent(page, 1);
  await expect(page.locator(".greeting")).toContainText("רותם");

  await page.reload();

  // Straight back into Rotem's grade, no picker in between.
  await expect(page.locator(".greeting")).toContainText("רותם");
  await expect(page.locator(".student-picker")).toHaveCount(0);
});

test("switching student is also forgotten across a reload", async ({ page }) => {
  await pickStudent(page, 1);
  await page.getByRole("button", { name: "← החלף תלמיד" }).click();
  await page.reload();

  await expect(page.locator(".student-picker h1")).toBeVisible();
});

test("word problems read right-to-left and their algebra stays left-to-right", async ({
  page,
}) => {
  // Guards the two-level bidi trap: the sentence must be RTL, but an algebraic run
  // inside it must be isolated LTR or its brackets get mirrored.
  await pickStudent(page, 2);
  // Grade 8's algebra lives under its own topic now, so walk topics until a word problem
  // with an algebraic run turns up rather than assuming which one holds it.
  await page.locator(".topic-card").first().click();
  await page.locator(".level-card").nth(1).click();

  let found = false;
  for (let i = 0; i < 10; i++) {
    const box = page.locator(".problem-box");
    if ((await box.getAttribute("class"))?.includes("box-rtl")) {
      await expect(box).toHaveCSS("direction", "rtl");

      const maths = page.locator(".prompt-math");
      if ((await maths.count()) > 0) {
        await expect(maths.first()).toHaveCSS("direction", "ltr");
        await expect(maths.first()).toHaveCSS("unicode-bidi", "isolate");
        found = true;
        break;
      }
    }
    await page.locator(".answer-input").fill("0");
    await page.getByRole("button", { name: "בדיקה" }).click();
    await page.getByRole("button", { name: /^(הבא|סיום)$/ }).click();
  }
  expect(found, "expected at least one word problem containing an algebraic run").toBe(
    true,
  );
});

test("a bare expression is shown left-to-right with a trailing equals sign", async ({
  page,
}) => {
  // Topic 1 is "חיבור עד 10" — bare arithmetic. Topic 0 is number-sense word questions,
  // which are RTL by design and covered by the sibling test above.
  await openLevels(page, 0, 1);
  await page.locator(".level-card").first().click();

  const box = page.locator(".problem-box");
  await expect(box).toHaveClass(/box-ltr/);
  await expect(box).toHaveCSS("direction", "ltr");
  await expect(page.locator(".problem-text")).toContainText("=");
});
