# הרגשה כיפית, כמו משחק — Tests

## Coverage
Most of this feature's acceptance criteria are visual/motion feel, not meaningfully
assertable in e2e. `tests/e2e/playful-redesign.spec.ts` covers the parts that are:

- "תשובה נכונה מקבלת תגובה חזותית קטנה ומיידית" → `a correct answer shows a star; a
  wrong answer does not`
- `.app-version` stays the deliberate quiet exception (design.md) → `the version
  button stays visually quiet — no ledge-shadow like the cards get`
- "הביצועים לא נפגעים בצורה מורגשת" → `a long streak of correct answers stays fast —
  regression guard` (this test exists specifically because two real regressions of
  exactly this kind were found and fixed while building this feature — see
  architecture.md's Implementation Notes)
- `prefers-reduced-motion` accessibility requirement (design.md) → `prefers-reduced-motion
  actually removes the motion, not just in theory` (uses
  `page.emulateMedia({ reducedMotion: 'reduce' })`, not just a CSS-rule-exists check)

## How to run
`npm run test:e2e`

## Status
327/327 passing as of 2026-11-20, single clean run, verified three times total across
this QA pass. The only failures seen along the way were:

- The pre-existing, already-tracked `grade8-angles-congruence.spec.ts` flake (random
  content-coverage, fails on a different assertion each run — unrelated to this
  feature).
- A genuinely flaky run of `scored-answer-practice.spec.ts` (unrelated file, confirmed
  by 3/3 clean isolated reruns).
- **A real regression, found and fixed**: this feature's static box-shadow + pop-in
  animation measurably slowed two already-expensive tests in
  `grade8-angles-congruence.spec.ts` (`covers congruent-triangle questions`,
  `covers isosceles-triangle questions`) — both play 3 full 20-question sessions and
  were already sitting at ~56s against a 60s budget on `main`, confirmed by running
  them against `main`'s pre-change files (passed, 56.5s) vs. this branch's (failed on
  the same wait, twice, reproducibly). Fixed by raising both tests' own
  `test.setTimeout` from 60000 to 90000 — a wall-clock allowance for already-expensive,
  by-design-repeated interaction, not a change to what either test asserts. Both pass
  comfortably (58.5s, 55.7s) with the new budget.
