# Shared question-screen template — Architecture

## Overview
A new component, `QuestionScreenTemplate`, owns the handful of regions that are
*actually* identical between `Practice.tsx` and `TopicLesson.tsx` today —
header, title, the problem box's LTR/RTL direction logic, and the diagram/
animation slots — as named, mostly-optional props. Everything after that
(answer area, feedback, hints, explanation, page actions) stays each screen's
own composed JSX, passed in as `children`, because — see Edge Cases — the two
screens genuinely order that tail content differently today, and design.md's
single fixed numbered sequence doesn't hold for all eleven of its own regions.

## Affected Files / Components
- **`src/components/QuestionScreenTemplate.tsx`** *(new)* — the shared
  component described below.
- **`src/components/Practice.tsx`** *(modified)* — header/title/problem-box
  JSX (today's lines ~256-294) replaced by a `<QuestionScreenTemplate>` call;
  all state, effects, and the answer-area/feedback/hints/explanation JSX move
  into its `children`, unchanged in content and unchanged in their existing
  relative order.
- **`src/components/TopicLesson.tsx`** *(modified)* — same kind of change:
  header/title/standalone-speak/problem-box JSX (today's lines ~83-136)
  replaced by the template call; hints/explanation/proof/actions move into
  `children`, unchanged in content and order.
- **No other file changes.** Confirmed by grep: `.problem-box`, `.hints`,
  `.hint-button`, `.answer-row`, `.question-speech`, `.practice-header`, and
  the `.practice` wrapper class are each used only by these two components —
  no other screen shares them, so centralizing their markup can't regress
  anything outside these two files.
- `src/App.css` — **unchanged.** Every class name the template renders
  (`practice`, `practice-header`, `link-button`, `progress`, `problem-box`,
  `box-ltr`/`box-rtl`, `problem-text`, `prompt-ltr`/`prompt-rtl`, `speak-button`,
  `hints`, `hint`, `hint-button`) already exists and is reused as-is — this is
  a pure JSX/structure consolidation, not a restyle.

## Data / State Changes
None. No new types in `src/data/*`, no new state shape, no new localStorage
key. `QuestionScreenTemplateProps` (below) is the only new type, and it's a
presentation-layer prop interface, not a data model.

```ts
interface QuestionScreenTemplateProps {
  // Region 1 — header (always present)
  onBack: () => void;
  /** TopicLesson's "דלג לתרגול →" link-button; Practice has none. */
  headerSecondaryAction?: ReactNode;
  headerRightLabel: string; // Practice's "שאלה X מתוך Y" / TopicLesson's grade label

  // Region 2 — title (always present; TopicLesson composes its own badge span
  // inside this node exactly as it does today, template doesn't know about badges)
  title: ReactNode;

  // Region 3 — standalone speak button, above the problem box (TopicLesson only)
  standaloneSpeak?: ReactNode;

  // Region 3.5 — QuantityDots illustration, above the problem box (Practice only).
  // Not enumerated in design.md's region list; added here in the one place it
  // already sits today (immediately before the problem box) — a placement with
  // no real alternative, not a product/design ambiguity (see Edge Cases).
  aboveProblem?: ReactNode;

  // Region 4 — problem box. The one region with real shared logic: which
  // direction class the box and its text take. Always present.
  problemText: ReactNode;
  isWordProblem: boolean;
  /** Practice's inline speak button, rendered inside the box next to the text. */
  inlineSpeak?: ReactNode;

  // Region 5 — diagrams (ClockFace/AngleShape), identical source + placement
  // on both screens today.
  diagrams?: ReactNode;

  // Region 6 — proof-of-extensibility slot. Unused by both screens today;
  // exists so a future per-question animation can be added to the template
  // once, per product-spec's acceptance criterion, without this phase
  // inventing a real animation.
  animation?: ReactNode;

  // Regions 7-11 — answer area, feedback/diagnosis, hints, explanation, page
  // actions/proof. Deliberately NOT individual named slots — see Edge Cases
  // for why a fixed order can't satisfy both screens, and Risks for why this
  // is the right call rather than a shortcut.
  children?: ReactNode;
}
```

## Technical Approach
`QuestionScreenTemplate` renders:

```
<div className="practice">
  <div className="practice-header">
    <button className="link-button" onClick={onBack}>← חזרה</button>
    {headerSecondaryAction}
    <span className="progress">{headerRightLabel}</span>
  </div>
  <h2>{title}</h2>
  {standaloneSpeak}
  {aboveProblem}
  <div className={`problem-box ${isWordProblem ? "box-rtl" : "box-ltr"}`}>
    <span className={`problem-text ${isWordProblem ? "prompt-rtl" : "prompt-ltr"}`}>
      {problemText}
    </span>
    {inlineSpeak}
  </div>
  {diagrams}
  {animation}
  {children}
</div>
```

Migration for each screen is mechanical: lift the existing JSX for each slot
(the markup for the back button, the title's `<h2>`, the speak button, the
problem box's span/direction classes) out of `Practice.tsx`/`TopicLesson.tsx`
and hand it to the matching prop instead of writing it inline — no new logic,
no renamed classes, no changed conditions (`speechSupported() && (...)` stays
exactly where it already decides whether a speak button exists at all, it just
now produces a prop value instead of inline JSX).

Everything that used to come after the problem box/diagrams in each file
(`Practice.tsx`'s answer-row, NumberPad, feedback-burst-anchor, diagnosis,
followup, explanation, hints; `TopicLesson.tsx`'s hints, explanation, proof,
actions) keeps its exact existing JSX, conditions, and relative order — it
simply becomes the `children` passed to `<QuestionScreenTemplate>` instead of
being a sibling further down the same `<div className="practice">`.

## Edge Cases
- **Hints vs. explanation order differs by screen — this is why regions 7-11
  are `children`, not fixed slots.** Design.md's region list numbers Hints as
  9 and Explanation as 10 and states no region reorders between screens. Reading
  the actual current code: `Practice.tsx` renders the wrong-answer Explanation
  *before* its Hints block (explanation at today's line ~421, hints at ~435);
  `TopicLesson.tsx` renders its (always-shown) Hints *before* its Explanation
  (hints at today's line ~139, `<QuestionExplanation>` at ~146). A template with
  fixed Hints/Explanation slots would force one screen's order to change —
  which the product spec's "no observable change" criterion rules out. Treating
  this as a judgment call rather than bouncing back to design (per
  `principles.md`: "judgment calls that don't change behavior are fine to just
  make") — the fix is mechanical, not a product decision: this tail content
  stays as freely-ordered `children`, so each screen keeps its own real,
  already-existing order exactly as-is.
- **QuantityDots (region 3.5) isn't in design.md's numbered list.** Same
  reasoning: there's only one place it sits today (immediately above the
  problem box, `Practice`-only), so this is a naming gap, not an open design
  question — added here as `aboveProblem`.
- **The known speak-button placement inconsistency** (design.md: inside the
  box for `Practice` vs. above it for `TopicLesson`) is preserved as two
  separate props (`inlineSpeak` vs. `standaloneSpeak`) exactly as design.md
  asked — neither screen's behavior changes, and a future deliberate pass can
  still unify them later without touching the template's shape.
- **Sequencing with `practice-numpad-ui-polish` (PR #122).** This feature
  branch was cut from `origin/main` before that PR merged, so `Practice.tsx`
  here is still the pre-UI-polish version (plain `<h2>`, hints after the
  keypad, no `problem-box-card`/`practice-title` classes). Once #122 merges,
  `developer` must merge `main` into this branch *before* editing
  `Practice.tsx`, so the template migration is built against the current
  (post-polish) JSX rather than reintroducing the version it already fixed.
  `TopicLesson.tsx` is untouched by #122, so this only affects `Practice.tsx`.

## Risks / Tradeoffs
- **Deliberately not extracting a shared "hints list" sub-component.** The two
  screens' hint-rendering JSX is three lines each (`.hints` wrapper +
  `.hint`/`segmented()` per string) but genuinely different in trigger logic
  (always-all vs. progressive-reveal-with-button) — three similar lines across
  two files is a better outcome here than a sub-component whose only job is to
  avoid repeating a three-line `.map()`. If a third screen ever needs hints,
  revisit this; today it would be premature abstraction.
- **`children` for regions 7-11 means this phase doesn't force a single
  universal shape onto the parts that currently differ.** This is intentional
  (see Edge Cases) but it does mean the template's "sharedness" is real for
  regions 1-6 and only structural (a slot to put JSX in) for everything after
  — worth knowing before assuming the whole screen is now data-driven. A truly
  uniform hints/explanation order across both screens is possible, but it's a
  product/design decision (which screen's order should the other adopt?), out
  of scope for a zero-behavior-change refactor.
- **No new tests from this phase's own work beyond confirming the existing
  suite still passes unmodified** — `qa`'s job here is verification, not new
  coverage, since product-spec's acceptance criteria *are* "existing tests
  keep passing."

## Open Questions
None.

## Implementation Notes

Built exactly as planned, with the `children`-based tail from the start (no
attempt at fixed hints/explanation slots that then had to be walked back).

- **`src/components/QuestionScreenTemplate.tsx`** *(new)* — matches the
  `QuestionScreenTemplateProps` shape above field-for-field. `title` is typed
  as the *whole* heading element (`<h2 className="practice-title">...</h2>` /
  `<h2>...</h2>`), not just its text content — `Practice.tsx`'s `<h2>` carries
  a `practice-title` class (from the already-merged `practice-numpad-ui-polish`
  work) that `TopicLesson.tsx`'s plain `<h2>` doesn't, so the template renders
  whatever element it's handed rather than wrapping a string in its own `<h2>`
  and losing that class.
- **`src/components/Practice.tsx`** — migrated against the post-merge (i.e.
  post-#122) JSX, per the sequencing note above: `main` was merged into this
  branch before this edit, so `problem-box-card`, `practice-title`, and the
  hints-above-feedback ordering from that PR are exactly what got lifted into
  template props, not the pre-merge version architecture.md was drafted
  against.
- **`src/components/TopicLesson.tsx`** — migrated as planned; its `children`
  keeps the exact existing order (hints → `QuestionExplanation` → proof →
  page actions).
- `npm run build && npm run lint` both clean. No deviations from the planned
  props shape.

