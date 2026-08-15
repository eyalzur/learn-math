import { test, expect, type Page } from "@playwright/test";
import { grades } from "../../src/data/curriculum";
import { diagnose } from "../../src/data/diagnose";

/**
 * Acceptance criteria under test
 * (docs/features/mistake-diagnosis/product-spec.md).
 *
 * The reported case is the spine of this file: "איזה מספר בא אחרי 12?" answered `3`.
 * That answer is `13` with its ten stripped off — evidence that the 12 was read as a 2,
 * not a random miss. Grade 1, first topic, **medium** level, first question.
 *
 * `999999` is the undiagnosed answer, the same one the older specs use. Both paths matter
 * and they are genuinely different screens.
 */

/** Grade 1 → first topic → medium level, where the reported question lives. */
async function startMedium(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").nth(0).click();
  await page.locator(".topic-card").nth(0).click();
  await page.locator(".level-card").nth(1).click();
}

const answer = async (page: Page, value: string) => {
  await page.locator(".answer-input").fill(value);
  await page.getByRole("button", { name: "בדיקה" }).first().click();
};

const answerFollowUp = async (page: Page, value: string) => {
  await page.locator(".followup-input").fill(value);
  await page.locator(".followup").getByRole("button", { name: "בדיקה" }).click();
};

test.beforeEach(async ({ page }) => {
  await startMedium(page);
});

// ---------------------------------------------------------------- the diagnosis is real

test("the mistake itself is named, not only the correct answer", async ({ page }) => {
  await expect(page.locator(".problem-text")).toContainText("12");
  await answer(page, "3");

  const said = await page.locator(".diagnosis").innerText();
  // Both numbers have to be in the sentence: naming only one says nothing about the
  // mistake. "12" alone would be satisfied by any mention of the question.
  expect(said, "the diagnosis names the number as read and as written").toContain("2");
  expect(said).toContain("12");
});

test("an answer matching no pattern gets today's screen, with no invented diagnosis", async ({
  page,
}) => {
  await answer(page, "999999");

  await expect(page.locator(".diagnosis")).toHaveCount(0);
  await expect(page.locator(".followup")).toHaveCount(0);
  // Everything that was there before this feature, unchanged and immediate.
  await expect(page.locator(".feedback.wrong")).toContainText("התשובה היא");
  await expect(page.locator(".explanation")).toBeVisible();
});

// ------------------------------------------------------------ it is a conversation

test("a question is asked that the student can answer, and it is not the original", async ({
  page,
}) => {
  const original = await page.locator(".problem-text").innerText();
  await answer(page, "3");

  const asked = await page.locator(".followup-question").innerText();
  expect(asked.length, "a question is asked").toBeGreaterThan(0);
  expect(asked, "the follow-up is not the question that was just failed").not.toBe(original);
  await expect(page.locator(".followup-input")).toBeVisible();
});

test("the app responds to what was actually answered", async ({ page }) => {
  await answer(page, "3");
  await answerFollowUp(page, "12");
  await expect(page.locator(".followup-reply")).toBeVisible();
  const onRight = await page.locator(".followup-reply").innerText();

  await startMedium(page);
  await answer(page, "3");
  await answerFollowUp(page, "7");
  const onWrong = await page.locator(".followup-reply").innerText();

  // Different answers, different replies — otherwise nothing was read.
  expect(onWrong).not.toBe(onRight);
});

test("a wrong answer in the conversation still says what the right one was", async ({ page }) => {
  await answer(page, "3");
  await answerFollowUp(page, "7");
  // Not a dead end: the reply carries the number, so the exchange teaches rather than
  // just marking a second failure.
  await expect(page.locator(".followup-reply")).toContainText("12");
});

// ------------------------------------------------- the answer is held back, then given

test("the worked explanation waits until the small question is dealt with", async ({ page }) => {
  await answer(page, "3");
  await expect(page.locator(".explanation")).toHaveCount(0);
  await expect(page.locator(".feedback")).toHaveCount(0);

  await answerFollowUp(page, "12");
  await expect(page.locator(".feedback.wrong")).toContainText("13");
  await expect(page.locator(".explanation")).toBeVisible();
});

test("asking to see the answer reveals it without answering anything", async ({ page }) => {
  await answer(page, "3");
  await page.getByRole("button", { name: "אני רוצה לראות את התשובה" }).click();

  await expect(page.locator(".feedback.wrong")).toContainText("13");
  await expect(page.locator(".explanation")).toBeVisible();
});

// ------------------------------------------------------------------- no way to get stuck

test("the next question is reachable mid-conversation, without answering", async ({ page }) => {
  await answer(page, "3");
  await expect(page.locator(".followup")).toBeVisible();

  await page.getByRole("button", { name: "הבא" }).click();
  await expect(page.locator(".progress")).toContainText("שאלה 2");
  // Nothing carried over from the abandoned conversation.
  await expect(page.locator(".followup")).toHaveCount(0);
  await expect(page.locator(".diagnosis")).toHaveCount(0);
});

// ------------------------------------------------------------------- the score is untouched

test("the conversation does not change the score", async ({ page }) => {
  // Ten questions, first one failed then discussed and corrected.
  await answer(page, "3");
  await answerFollowUp(page, "12");
  await page.getByRole("button", { name: "הבא" }).click();
  for (let i = 0; i < 9; i++) {
    await answer(page, "999999");
    await page.getByRole("button", { name: /הבא|סיום/ }).click();
  }

  // A corrected answer is still a wrong answer in the tally — the spec is explicit that
  // the conversation is for understanding, not for points.
  await expect(page.locator(".score")).toContainText("0 מתוך 10");
});

// ------------------------------------------------------------------------------ direction

test("numbers in the diagnosis sit in their own left-to-right run", async ({ page }) => {
  await answer(page, "3");

  const numbers = page.locator(".diagnosis .prompt-math");
  await expect(numbers.first()).toBeVisible();

  const style = await numbers.first().evaluate((el) => {
    const computed = getComputedStyle(el);
    return { direction: computed.direction, unicodeBidi: computed.unicodeBidi };
  });
  expect(style.direction).toBe("ltr");
  // Direction alone is not enough and this project learned that the hard way: without
  // isolation the surrounding Hebrew reorders the run, and "read 2 instead of 12" can
  // come out with the numbers swapped — which makes the sentence a lie.
  expect(["isolate", "isolate-override"]).toContain(style.unicodeBidi);
});

test("the small question's expression is isolated too", async ({ page }) => {
  await answer(page, "3");

  const expr = page.locator(".followup-question .prompt-math").first();
  await expect(expr).toBeVisible();
  const direction = await expr.evaluate((el) => getComputedStyle(el).direction);
  expect(direction).toBe("ltr");
});

// ----------------------------------------------------------------------- nothing regressed

test("a correct answer behaves exactly as before — no diagnosis, no conversation", async ({
  page,
}) => {
  await answer(page, "13");

  await expect(page.locator(".feedback.correct")).toBeVisible();
  await expect(page.locator(".diagnosis")).toHaveCount(0);
  await expect(page.locator(".followup")).toHaveCount(0);
  await expect(page.locator(".explanation")).toHaveCount(0);
});

// ------------------------------------------------------- off by one, and in which direction

/**
 * Reported from the live app: "כמה זה רבע מ-20?" answered `6` was met with "כמעט! פספסת
 * בדיוק באחד", then asked "כמה זה `6 + 1`?" — one step further from `5` — and finally told
 * "רק אחד היה חסר" about an answer that had one too many.
 */

test("answering one too many is not treated as answering one too few", async ({ page }) => {
  // "איזה מספר בא אחרי 12?" — the answer is 13, and 14 overshoots it.
  await answer(page, "14");

  const said = await page.locator(".diagnosis").innerText();
  expect(said, "an answer that overshot is called short").not.toContain("חסר");

  // The small question has to walk toward the answer, so `13` — the number wanted all
  // along — is the right answer to it. The shipped version asked for `15`.
  await answerFollowUp(page, "13");
  await expect(page.locator(".followup-reply")).toContainText("יפה");
});

test("answering one too few still reads as one too few", async ({ page }) => {
  await answer(page, "12");

  await expect(page.locator(".diagnosis")).toContainText("חסר");
  await answerFollowUp(page, "13");
  await expect(page.locator(".followup-reply")).toContainText("חסר");
});

// -------------------------------------------------- the digits are right, the point is not

/**
 * Reported from the live app: "0.4 + 0.2" answered `6`. The screen said only "לא נכון,
 * התשובה היא 0.6" — but the child had already done the arithmetic. She added four tenths
 * and two tenths, got six, and lost the point on the way to the box.
 */

test("a dropped decimal point is named, not treated as a wrong sum", async ({ page }) => {
  // Rotem → decimals → easy, walking to the reported question.
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").nth(1).click();
  await page.locator(".topic-card").nth(1).click();
  await page.locator(".level-card").nth(0).click();
  for (let i = 0; i < 12; i++) {
    const prompt = await page.locator(".problem-text").innerText();
    if (prompt.includes("0.4 + 0.2")) break;
    await answer(page, "999999");
    await page.getByRole("button", { name: /הבא|סיום/ }).click();
  }
  await expect(page.locator(".problem-text")).toContainText("0.4 + 0.2");

  await answer(page, "6");

  const said = await page.locator(".diagnosis").innerText();
  // The sentence has to credit the digits she got right — that is the whole point of
  // naming this mistake rather than announcing the answer.
  expect(said, "the diagnosis does not say the digits were right").toContain("הספרות נכונות");
  // And it has to argue from size: both numbers are under one, so six cannot come out.
  expect(said, "the diagnosis does not argue from the size of the numbers").toContain("קטנים מ");
  await expect(page.locator(".followup")).toBeVisible();
});

test("the follow-up builds the size-check habit instead of quizzing a known fact", async ({
  page,
}) => {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").nth(1).click();
  await page.locator(".topic-card").nth(1).click();
  await page.locator(".level-card").nth(0).click();
  for (let i = 0; i < 12; i++) {
    const prompt = await page.locator(".problem-text").innerText();
    if (prompt.includes("0.4 + 0.2")) break;
    await answer(page, "999999");
    await page.getByRole("button", { name: /הבא|סיום/ }).click();
  }
  await answer(page, "6");

  const asked = await page.locator(".followup-question").innerText();
  // Two rejected shapes, both for the same reason. "Which is bigger, 0.6 or 6?" tests
  // something she already knows. "Without computing, how many wholes?" demands the very
  // estimation skill she was missing — a child who just erred cannot answer it.
  expect(asked, "the follow-up is still a comparison").not.toContain("גדול יותר");
  expect(asked, "the follow-up still asks her to estimate").not.toContain("בלי לחשב");
  // What she *can* do: turn shekels into agora. That is the place-value insight itself.
  expect(asked, "the follow-up does not use money").toContain("אגורות");

  await answerFollowUp(page, "40");
  const reply = await page.locator(".followup-reply").innerText();
  expect(reply, "the reply does not land on the real answer").toContain("60");
  expect(reply).toContain("0.6");
});

test("a decimal near-miss is never called almost — counting has nothing to do with it", async ({
  page,
}) => {
  // Reported from the live app: "7.5 − 2.5" answered `6` was met with "כמעט! זה אחד
  // יותר מדי" and asked "כמה זה 6 − 1?". Nobody counts back two and a half on their
  // fingers; the distance of one is a coincidence, not a slip.
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").nth(1).click();
  await page.locator(".topic-card").nth(1).click();
  await page.locator(".level-card").nth(1).click();
  for (let i = 0; i < 12; i++) {
    const prompt = await page.locator(".problem-text").innerText();
    if (prompt.includes("7.5 − 2.5")) break;
    await answer(page, "999999");
    await page.getByRole("button", { name: /הבא|סיום/ }).click();
  }
  await expect(page.locator(".problem-text")).toContainText("7.5 − 2.5");

  await answer(page, "6");
  const said = await page.locator(".diagnosis").count()
    ? await page.locator(".diagnosis").innerText()
    : "";
  expect(said, "a decimal miss was called a counting slip").not.toContain("כמעט");
});

test.describe("without the browser", () => {
  test.use({ baseURL: undefined });

  test("every question where a point can be dropped says so", async () => {
    const all = grades.flatMap((g) =>
      g.topicSets.flatMap((t) => t.levels.flatMap((l) => l.questions)),
    );

    // Writing the answer's digits with no point is a mistake by construction wherever the
    // answer has a fractional part. Every one of those has to be recognised — silence
    // there is the bug that was reported.
    const droppable = all.filter((q) => !Number.isInteger(q.answer));
    expect(droppable.length, "no question has a fractional answer any more").toBeGreaterThan(0);

    const silent: string[] = [];
    for (const q of droppable) {
      const places = String(q.answer).split(".")[1].length;
      const asIfDropped = Math.round(q.answer * 10 ** places);
      if (diagnose(q, asIfDropped)?.id !== "decimalPoint") {
        silent.push(`${q.id} — "${q.prompt}" answered ${asIfDropped}`);
      }
    }
    expect(silent, `\n${silent.join("\n")}\n`).toEqual([]);
  });

  test("the point pattern stays out of questions that have no point to lose", async () => {
    const all = grades.flatMap((g) =>
      g.topicSets.flatMap((t) => t.levels.flatMap((l) => l.questions)),
    );

    // A whole-number question can never produce this mistake, so the pattern must never
    // claim it — the same discipline that took off-by-one off fraction questions.
    const wrong: string[] = [];
    for (const q of all) {
      if (q.prompt.includes(".") || !Number.isInteger(q.answer)) continue;
      for (const given of [q.answer * 10, q.answer / 10, q.answer + 1, -q.answer]) {
        if (diagnose(q, given)?.id === "decimalPoint") {
          wrong.push(`${q.id} — "${q.prompt}" answered ${given}`);
        }
      }
    }
    expect(wrong, `\n${wrong.join("\n")}\n`).toEqual([]);
  });
});

// -------------------------------------------------------------- beyond grade 1, in data

/**
 * "A pattern exists that applies to grade 6 or 8 content" cannot be walked through the
 * browser today: every topic for Rotem and Omer is still awaiting review, so the practice
 * screen refuses to open. Reading the data proves the criterion anyway — and that is the
 * honest reading of it, since it is a claim about the diagnosis rules, not the screen.
 */
test.describe("without the browser", () => {
  test.use({ baseURL: undefined });

  test("a mistake is diagnosed in grade 8 content, not only grade 1", async () => {
    const grade8 = grades.find((g) => g.id === "8")!;
    const questions = grade8.topicSets.flatMap((t) =>
      t.levels.flatMap((l) => l.questions),
    );

    // Flipping the sign of a correct answer is a mistake by construction, so a rule set
    // that covers grade 8 at all must have something to say about it.
    const diagnosed = questions.filter(
      (q) => q.answer !== 0 && diagnose(q, -q.answer) !== null,
    );
    expect(diagnosed.length, "no grade 8 question yields any diagnosis").toBeGreaterThan(0);
  });

  test("nearness alone is not a diagnosis, on any question in the app", async () => {
    const all = grades.flatMap((g) =>
      g.topicSets.flatMap((t) => t.levels.flatMap((l) => l.questions)),
    );

    // The reported question. Six is one away from five and means nothing of the sort.
    const reported = all.find((q) => q.id === "g6-fractions-e5")!;
    expect(reported.prompt).toContain("רבע");
    expect(diagnose(reported, reported.answer + 1)).toBeNull();
    expect(diagnose(reported, reported.answer - 1)).toBeNull();

    // And it is a rule, not a patch on one question: wherever off-by-one still speaks, the
    // way to the answer has to be counting or a bare sum.
    const speaks = all.filter(
      (q) => diagnose(q, q.answer + 1)?.id === "offByOne" || diagnose(q, q.answer - 1)?.id === "offByOne",
    );
    expect(speaks.length, "off-by-one went silent everywhere").toBeGreaterThan(0);
    for (const q of speaks) {
      expect(
        /בא אחרי|בא לפני/.test(q.prompt) || /^-?\d+(\.\d+)?\s*[+\-−]\s*-?\d+(\.\d+)?$/.test(q.prompt.trim()),
        `"${q.prompt}" is not a question you get to by counting`,
      ).toBe(true);
    }
  });

  test("the small question walks toward the answer, never away from it", async () => {
    const all = grades.flatMap((g) =>
      g.topicSets.flatMap((t) => t.levels.flatMap((l) => l.questions)),
    );

    // Whichever side the student landed on, the number the follow-up asks for is the one
    // the original question wanted. Overshooting used to be told to add one more.
    for (const q of all) {
      for (const given of [q.answer - 1, q.answer + 1]) {
        const found = diagnose(q, given);
        if (found?.id !== "offByOne") continue;
        expect(found.answer, `"${q.prompt}" answered ${given} leads to ${found.answer}`).toBe(
          q.answer,
        );
      }
    }
  });

  test("an answer nothing describes is left alone", async () => {
    const q = grades[0].topicSets[0].levels[0].questions[0];
    expect(diagnose(q, 999999)).toBeNull();
    // And the correct answer is never a mistake to explain.
    expect(diagnose(q, q.answer)).toBeNull();
  });
});
