import { test, expect, type Page } from "@playwright/test";
import { grades } from "../../src/data/curriculum";
import { diagnose } from "../../src/data/diagnose";
import { generateDecimalsQuestion } from "../../src/data/adaptiveDecimals";

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
  // Mika now has two grades available; the reported case lives in grade 1 (א׳).
  await page.locator(".grade-card").first().click();
  await page.locator(".topic-card").nth(0).click();
  // Grade 1 enters this topic by style now. Every test below is about "איזה מספר בא
  // אחרי 12?" — a two-digit answer is what makes a misread digit or an overshoot mean
  // anything — so walk to it rather than take whatever comes first.
  await page.locator(".style-card").filter({ hasText: "מה בא אחרי" }).first().click();
  await walkTo(page, "בא אחרי 12");
}

/** Answers wrong until the wanted question is on screen, and leaves it unanswered. */
async function walkTo(page: Page, wanted: string) {
  for (let i = 0; i < 10; i++) {
    if ((await page.locator(".problem-text").innerText()).includes(wanted)) return;
    await page.locator(".answer-input").fill("999999");
    await page.getByRole("button", { name: "בדיקה" }).first().click();
    await page.getByRole("button", { name: /הבא|סיום/ }).click();
  }
  throw new Error(`never reached "${wanted}"`);
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

  // Which question this is depends on where the lesson opened, so read the counter
  // rather than name a number — what matters is that it advanced by exactly one.
  const before = Number((await page.locator(".progress").innerText()).match(/\d+/)![0]);
  await page.getByRole("button", { name: "הבא" }).click();
  await expect(page.locator(".progress")).toContainText(`שאלה ${before + 1}`);
  // Nothing carried over from the abandoned conversation.
  await expect(page.locator(".followup")).toHaveCount(0);
  await expect(page.locator(".diagnosis")).toHaveCount(0);
});

// ------------------------------------------------------------------- the score is untouched

test("the conversation does not change the score", async ({ page }) => {
  // The lesson holds eight questions; getting here already failed four of them, and this
  // one is failed, discussed and corrected.
  await answer(page, "3");
  await answerFollowUp(page, "12");
  await page.getByRole("button", { name: "הבא" }).click();
  for (let i = 0; i < 3; i++) {
    await answer(page, "999999");
    await page.getByRole("button", { name: /הבא|סיום/ }).click();
  }

  // A corrected answer is still a wrong answer in the tally — the spec is explicit that
  // the conversation is for understanding, not for points.
  await expect(page.locator(".score")).toContainText("0 מתוך 8");
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

// No follow-up conversation for off-by-one any more (see
// docs/features/offbyone-diagnosis-method): a question built from the wrong answer
// ("כמה זה `89 − 1`?") was reported as unrelated and unteaching. The screen now goes
// straight from the headline to the standard "how to solve" explanation, which already
// opens with the general rule and then the original question's own numbers.

test("answering one too many is not treated as answering one too few, and explains immediately", async ({
  page,
}) => {
  // "איזה מספר בא אחרי 12?" — the answer is 13, and 14 overshoots it.
  await answer(page, "14");

  const said = await page.locator(".diagnosis").innerText();
  expect(said, "an answer that overshot is called short").not.toContain("חסר");
  expect(said, "an answer that overshot says so").toContain("יותר מדי");

  // No conversation box at all — straight to the reveal.
  await expect(page.locator(".followup")).toHaveCount(0);
  await expect(page.locator(".feedback.wrong")).toContainText("13");
  await expect(page.locator(".explanation")).toBeVisible();
});

test("answering one too few still reads as one too few, and explains immediately", async ({
  page,
}) => {
  await answer(page, "12");

  await expect(page.locator(".diagnosis")).toContainText("חסר");
  await expect(page.locator(".followup")).toHaveCount(0);
  await expect(page.locator(".feedback.wrong")).toContainText("13");
  await expect(page.locator(".explanation")).toBeVisible();
});

test("the explanation after an off-by-one mistake comes from the original question, not the wrong answer", async ({
  page,
}) => {
  // The reported bug exactly: a follow-up built from the wrong answer as if it were a
  // fresh, unrelated fact. What must hold instead: the question's own numbers (12, and
  // the correct answer 13) are right there in what gets shown, and the rule that explains
  // them is stated first — the same "general rule, then this question's numbers" shape
  // every other explanation in the app already has.
  await answer(page, "14");

  const explanation = await page.locator(".explanation").innerText();
  expect(explanation).toContain("12");
  expect(explanation).toContain("13");
  expect(explanation).toContain("אחרי כל מספר בא המספר שגדול ממנו באחד");
});

// -------------------------------------------------- the digits are right, the point is not

/**
 * Reported from the live app: "0.4 + 0.2" answered `6`. The screen said only "לא נכון,
 * התשובה היא 0.6" — but the child had already done the arithmetic. She added four tenths
 * and two tenths, got six, and lost the point on the way to the box.
 */

/** Rotem's "שברים עשרוניים" is now adaptive (no level picker — see
 *  docs/features/levels-as-practice), so this test walks a fresh, generated question
 *  instead of assuming a fixed written one. */
async function enterDecimals(page: Page) {
  await page.goto("/learn-math/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn-math/");
  await page.locator(".student-card").nth(1).click();
  await page.locator(".topic-card").nth(1).click();
}

// The "both operands under 1" shape ("0.4 + 0.2") is roughly one generated question in
// forty — rare enough that walking a live session to find one would be slow and flaky.
// The diagnosis-content assertions that need it moved to "without the browser" below,
// next to this file's other direct-function checks; the DOM/UI wiring they'd otherwise
// exercise (`.followup`, `.followup-question`, `.followup-input`, `.followup-reply`) is
// already covered generically by the "מה בא אחרי" tests above, on Mika's route.

test("a decimal near-miss is never called almost — counting has nothing to do with it", async ({
  page,
}) => {
  // Reported from the live app: "7.5 − 2.5" answered `6` (one too many) was met with
  // "כמעט! זה אחד יותר מדי" and asked "כמה זה 6 − 1?". Nobody counts back two and a half
  // on their fingers; the distance of one is a coincidence, not a slip. Any decimal
  // question missed by exactly one, addition or subtraction, has to avoid the same trap.
  await enterDecimals(page);
  // The opening tier is always an addition (see adaptiveDecimals.ts) — "A + B =" every
  // time — so its two operands can be read straight off the prompt.
  const prompt = (await page.locator(".problem-text").innerText()).trim();
  const m = prompt.match(/^(\d+\.\d) \+ (\d+\.\d)\s*=?$/);
  expect(m, "the opening tier of שברים עשרוניים is always an addition").not.toBeNull();
  const correct = Number((Number(m![1]) + Number(m![2])).toFixed(1));

  await answer(page, String(Number((correct + 1).toFixed(1))));
  const said = (await page.locator(".diagnosis").count())
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

  // ------------------------------------------------ the digits are right, the point is not
  //
  // Reported from the live app: "0.4 + 0.2" answered `6` — but the child had already done
  // the arithmetic (four tenths and two tenths is six) and lost the point on the way to
  // the box. That question used to sit at a fixed level index; now that "שברים עשרוניים"
  // is adaptive (docs/features/levels-as-practice), the "both operands under one" shape is
  // roughly one generated question in forty — sampling it directly, deterministically, is
  // far more reliable than walking a live session hoping to land on one.

  function seededRng(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
      state |= 0;
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Samples the generator's opening tier (always an addition) until both operands are
   *  under one and their tenths don't carry — "0.4 + 0.2" is one instance of this shape.
   *  A carry (e.g. "0.4 + 0.6" = 1.0) breaks the digit-matching identity this diagnosis
   *  relies on: "4"+"6" concatenates to "10", but the correct answer's own digits are
   *  just "1" — so it has to be excluded, not just "under one". */
  function findSubOneAddition(): { aTenths: number; bTenths: number } {
    const rng = seededRng(2026);
    for (let i = 0; i < 2000; i++) {
      const q = generateDecimalsQuestion(1, rng);
      const m = q.prompt.match(/^0\.(\d) \+ 0\.(\d)$/);
      if (m && Number(m[1]) + Number(m[2]) < 10) return { aTenths: Number(m[1]), bTenths: Number(m[2]) };
    }
    throw new Error("never sampled a sub-one, non-carrying decimal addition in 2000 tries");
  }

  test("a dropped decimal point is named, not treated as a wrong sum", () => {
    const { aTenths, bTenths } = findSubOneAddition();
    const a = Number(`0.${aTenths}`);
    const b = Number(`0.${bTenths}`);
    const question = {
      id: "test",
      topic: "שברים עשרוניים",
      prompt: `${a} + ${b}`,
      answer: Number((a + b).toFixed(1)),
      hints: ["", ""] as const,
      analogy: "",
    };
    // The mistake this diagnoses: adding the digits and forgetting the point.
    const given = aTenths + bTenths;
    const diagnosis = diagnose(question, given);

    expect(diagnosis?.id).toBe("decimalPoint");
    // The sentence has to credit the digits she got right — that is the whole point of
    // naming this mistake rather than announcing the answer.
    expect(diagnosis?.headline, "the diagnosis does not say the digits were right").toContain(
      "הספרות נכונות",
    );
    // And it has to argue from size: both numbers are under one, so a whole number cannot
    // come out of adding them.
    expect(
      diagnosis?.headline,
      "the diagnosis does not argue from the size of the numbers",
    ).toContain("קטנים מ");
  });

  test("the follow-up builds the size-check habit instead of quizzing a known fact", () => {
    const { aTenths, bTenths } = findSubOneAddition();
    const a = Number(`0.${aTenths}`);
    const b = Number(`0.${bTenths}`);
    const question = {
      id: "test",
      topic: "שברים עשרוניים",
      prompt: `${a} + ${b}`,
      answer: Number((a + b).toFixed(1)),
      hints: ["", ""] as const,
      analogy: "",
    };
    const diagnosis = diagnose(question, aTenths + bTenths);
    const followUp = diagnosis?.followUp;
    expect(followUp, "no follow-up was built").toBeTruthy();

    // Two rejected shapes, both for the same reason. "Which is bigger, 0.6 or 6?" tests
    // something she already knows. "Without computing, how many wholes?" demands the very
    // estimation skill she was missing — a child who just erred cannot answer it.
    expect(followUp!.question, "the follow-up is still a comparison").not.toContain("גדול יותר");
    expect(followUp!.question, "the follow-up still asks her to estimate").not.toContain(
      "בלי לחשב",
    );
    // What she *can* do: turn shekels into agora. That is the place-value insight itself.
    expect(followUp!.question, "the follow-up does not use money").toContain("אגורות");

    const wholeAgorot = Math.round(a * 100);
    expect(followUp!.answer).toBe(wholeAgorot);
    expect(followUp!.onRight, "the reply does not land on the real answer").toContain(
      String(question.answer),
    );
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
    // way to the answer has to be counting or a bare sum. Two ids now (see
    // docs/features/offbyone-diagnosis-method) — a sequence question and a bare sum are
    // taught by different methods, so they are two patterns, not one generic guess.
    const isOffByOne = (id?: string) => id === "offByOneSequence" || id === "offByOneSum";
    const speaks = all.filter(
      (q) => isOffByOne(diagnose(q, q.answer + 1)?.id) || isOffByOne(diagnose(q, q.answer - 1)?.id),
    );
    expect(speaks.length, "off-by-one went silent everywhere").toBeGreaterThan(0);
    for (const q of speaks) {
      expect(
        /בא אחרי|בא לפני/.test(q.prompt) || /^-?\d+(\.\d+)?\s*[+\-−]\s*-?\d+(\.\d+)?$/.test(q.prompt.trim()),
        `"${q.prompt}" is not a question you get to by counting`,
      ).toBe(true);
    }
  });

  test("off-by-one never carries a follow-up — the explanation is shown directly instead", async () => {
    // This used to check that the follow-up question walked toward the answer, never away
    // from it (overshooting used to be told to add one more). There is no follow-up left
    // to walk anywhere now — off-by-one reuses the standard explanation instead of asking
    // a question built from the wrong answer (see
    // docs/features/offbyone-diagnosis-method/product-spec.md). What still needs to hold,
    // for both new patterns, is that neither one ever sets `followUp` at all.
    const all = grades.flatMap((g) =>
      g.topicSets.flatMap((t) => t.levels.flatMap((l) => l.questions)),
    );

    let checked = 0;
    for (const q of all) {
      for (const given of [q.answer - 1, q.answer + 1]) {
        const found = diagnose(q, given);
        if (found?.id !== "offByOneSequence" && found?.id !== "offByOneSum") continue;
        checked++;
        expect(
          found.followUp,
          `"${q.prompt}" answered ${given} still carries a follow-up`,
        ).toBeUndefined();
      }
    }
    expect(checked, "off-by-one never fired, so this checked nothing").toBeGreaterThan(0);
  });

  test("an answer nothing describes is left alone", async () => {
    const q = grades[0].topicSets[0].levels[0].questions[0];
    expect(diagnose(q, 999999)).toBeNull();
    // And the correct answer is never a mistake to explain.
    expect(diagnose(q, q.answer)).toBeNull();
  });
});
