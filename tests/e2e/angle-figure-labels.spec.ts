import { test, expect } from "@playwright/test";

/**
 * Content rule (fix/triangle-vertex-labels): a question that names vertices or lines in its
 * prompt (`ABC`, `∡A`, `EDC`, `a`, `b`, `c`...) must have a figure that draws those letters
 * — otherwise the student cannot map the text onto the picture (reported on the
 * exterior-angle question: text said "∡A = 34°, ∡B = 63°", picture showed no A or B).
 *
 * The check reads every question of the topic: the written ones in curriculum.ts and a few
 * hundred generated ones per difficulty tier. `drawnLabels` is the same list `AngleShape.tsx`
 * draws from (it throws on any mismatch), so a new prompt template that names letters the
 * figure lacks fails here.
 */
test("every angle/triangle question's figure draws every letter its prompt names", async ({ page }) => {
  await page.goto("/learn-math/");
  const result = await page.evaluate(async () => {
    const curriculum = await import("/learn-math/src/data/curriculum.ts");
    const adaptive = await import("/learn-math/src/data/adaptiveAngles.ts");
    const shapes = await import("/learn-math/src/data/angleShape.ts");
    type Q = { id: string; topic: string; prompt: string; answer: number };
    const TOPIC = "זוויות וחפיפת משולשים";
    const questions: Q[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const g of curriculum.grades as any[]) {
      for (const ts of g.topicSets ?? []) {
        for (const lv of ts.levels ?? []) {
          for (const q of lv.questions as Q[]) if (q.topic === TOPIC) questions.push(q);
        }
      }
    }
    for (let tier = 1; tier <= adaptive.ANGLES_MAX_DIFFICULTY; tier++) {
      for (let i = 0; i < 300; i++) questions.push(adaptive.generateAnglesQuestion(tier));
    }
    const bad: string[] = [];
    const patterns = new Set<string>();
    for (const q of questions) {
      // Letters named inside backtick expressions: `ABC`, `∡BAD`, `ABC ≅ EDC`, `a`.
      const named = new Set<string>();
      for (const span of q.prompt.match(/`[^`]*`/g) ?? []) {
        for (const ch of span.replace(/[^A-Za-z]/g, "")) named.add(ch);
      }
      if (named.size === 0) continue;
      const shape = shapes.angleShape(q);
      if (!shape) {
        bad.push(`${q.id}: prompt names ${[...named].join("")} but has no figure: ${q.prompt}`);
        continue;
      }
      const drawn = shapes.drawnLabels(shape) as string[];
      patterns.add(`${shape.kind}/${shape.variant ?? shape.relation ?? shape.valueKind ?? shape.exterior}`);
      const missing = [...named].filter((c) => !drawn.includes(c));
      if (missing.length) bad.push(`${q.id}: figure lacks ${missing.join(",")}: ${q.prompt}`);
    }
    return { bad, count: questions.length, patterns: [...patterns] };
  });
  expect(result.bad).toEqual([]);
  expect(result.count).toBeGreaterThan(1000);
  // Sanity: the rule actually saw the lettered patterns, not an empty set.
  expect(result.patterns.length).toBeGreaterThanOrEqual(8);
});
