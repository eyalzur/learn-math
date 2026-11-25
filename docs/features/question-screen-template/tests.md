# Shared question-screen template — Tests

## Why no new spec file
This feature's own acceptance criteria (product-spec.md) are, deliberately, that
nothing observable changes: "every existing `tests/e2e/*.spec.ts` test that
exercises the practice screen continues to pass unmodified" and the same for the
lesson screen. A new `question-screen-template.spec.ts` asserting the two
screens still look/behave the same would just be re-testing what the existing
suite already asserts, against the same running app, through the same
selectors — redundant coverage, not new protection. QA's job here is
verification that the existing suite still holds, not inventing fresh
assertions for a refactor that isn't supposed to change what a test could
observe in the first place.

## Coverage — acceptance criteria → existing proof
- **Template renders only present fields** → structural, proven by every
  passing test below actually seeing the right DOM (a field wrongly omitted or
  wrongly forced would break one of these, not go unnoticed).
- **`Practice.tsx` behaves identically** → `tests/e2e/scored-answer-practice.spec.ts`,
  `tests/e2e/question-hints.spec.ts`, `tests/e2e/read-aloud-questions.spec.ts`,
  `tests/e2e/read-aloud.spec.ts`, `tests/e2e/students-and-syllabus.spec.ts`,
  `tests/e2e/mistake-explanation.spec.ts`, `tests/e2e/teaching-explanations.spec.ts`,
  `tests/e2e/candy-redesign.spec.ts`, `tests/e2e/stitch-visual-refresh.spec.ts`,
  `tests/e2e/grade8-angles-congruence.spec.ts`, `tests/e2e/grade2-syllabus.spec.ts`,
  and every other spec that drives a practice session to a right/wrong answer.
- **`TopicLesson.tsx` behaves identically** → `tests/e2e/topic-lesson.spec.ts`
  (page navigation, hint display, "→ לתרגול"/"דלג לתרגול →", the clock/angle
  diagram slots, the adaptive multi-page case).
- **A `Practice`-only field (answer area) renders with no forced placeholder on
  `TopicLesson`** → `tests/e2e/topic-lesson.spec.ts`'s own assertion that the
  lesson screen "has no answer field and no check button" already proves this
  negatively; it would fail if the template ever rendered an empty answer-area
  slot there.
- **Template extends with one more optional field (the `animation` slot) by
  touching only the template** → this is a type-level/structural claim about
  the component's shape, not a runtime behavior — nothing renders from it on
  either screen today, so there is no observable DOM state for an e2e test to
  assert. Verified instead by `tech-lead`'s/`developer`'s own doc trail
  (architecture.md, Implementation Notes) rather than a test that would have
  nothing real to check.
- **No regression on any other screen sharing these CSS classes** →
  `grep -rln "problem-box\|hints\|hint-button\|answer-row\|question-speech\|practice-header"
  src/components/*.tsx` (re-run during this phase, same result as
  architecture.md recorded) confirms `Practice.tsx` and `TopicLesson.tsx` are
  still the only two consumers — there is no third screen that could regress.

## How to run
`npm run test:e2e` (or `npx playwright test --workers=1` for a single clean
local run per CLAUDE.md's own rule on parallel-worker flakes).

## Status
**Pass, as of 2026-11-25.** Full suite, single clean run, `--workers=1`:
**399 passed, 2 skipped, 0 failed** — identical pass count to this suite's
state before this feature's code changes (confirmed against the merged
`practice-numpad-ui-polish` baseline). No test was modified, added, or skipped
to make this pass.
