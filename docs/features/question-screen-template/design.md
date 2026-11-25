# Shared question-screen template — Design

## Overview
One shared layout — a fixed vertical sequence of named, independently-optional
regions — used by both the practice screen and the lesson screen. Each screen
keeps deciding its own state and behavior (what's correct, which hint is shown,
whether to advance); the template only decides *where on screen* a given piece
goes once a screen hands it something to show. This is a pure consolidation of
what `Practice.tsx` and `TopicLesson.tsx` already each lay out today — no new
visual element for either screen.

## Screens / States

Both screens are built from the same ordered region list. A screen that has
nothing for a region simply doesn't supply it, and the template renders nothing
there — exactly as both files already do today with their own ad-hoc
`{condition && <...>}` checks.

1. **Header row** — one back-link (always present, both screens), optionally a
   second link-style button beside it (`TopicLesson`'s "דלג לתרגול →", which
   `Practice` has no equivalent of), and a right-aligned label (`Practice`'s
   "שאלה X מתוך Y" counter vs. `TopicLesson`'s grade label — both are just "a
   short line of secondary text", the template doesn't care which).
2. **Title** — the topic/lesson/style name, optionally with a small trailing
   badge (`TopicLesson`'s "דוגמה X מתוך Y" page marker; `Practice` has none).
3. **Standalone speak button** (optional, appears *above* the problem box, not
   inside it) — this is `TopicLesson`'s current placement only.
4. **Problem box** — the question text (word-problem or bare expression,
   exactly today's LTR/RTL handling, unchanged) with an optional **inline**
   speak button inside the box itself — this is `Practice`'s current placement
   only.

   **Known pre-existing inconsistency, deliberately not fixed here:** the two
   screens put their speak button in two different places (inside vs. above
   the box) with no visible reason found for the difference — it looks like
   drift, not a deliberate design choice. Unifying it would be a real, if tiny,
   visible change, which the product spec explicitly rules out of this phase
   ("every existing screen renders and behaves exactly as it does today"). The
   template must therefore support *both* placements as named variants (region
   3 vs. the inline option in region 4), not silently collapse them. Flagging
   this for a future, deliberate design pass is in scope for this doc; fixing
   it is not.
5. **Diagram slot(s)** — clock / angle-proof diagrams, identical in both
   screens already (same `bundle.clock` / `bundle.angle` source). One slot,
   optional, same as today.
6. **Worked-example animation slot** *(new, proof-of-extensibility only — see
   product-spec's acceptance criteria)* — a named, optional region between the
   diagram and the hints, for a future per-question animation. Nothing renders
   here today on either screen; this phase only has to prove the template has
   a place for it, not ship a real animation. No copy, no asset, no behavior —
   purely a documented empty slot.
7. **Answer area** *(`Practice`-only; `TopicLesson` has no equivalent and
   supplies nothing here)* — the answer input, check/next button, and number
   pad, exactly as `Practice` has them today. This region's entire contents
   stay `Practice`'s own responsibility; the template just reserves the slot.
8. **Feedback / diagnosis / follow-up** *(`Practice`-only)* — the
   correct/wrong message, star-burst, the diagnosed-mistake conversation and
   its own follow-up question. Same note as above — `Practice`'s own logic,
   the template just reserves the slot.
9. **Hints** — a list of hint strings. The two screens already use this two
   different ways and **both ways must keep working, unchanged**:
   - `TopicLesson`: every hint shown at once, no button, no toggle.
   - `Practice`: hints revealed progressively by tapping "רמז 💡" / "עוד רמז
     💡", capped at the question's hint count, and the whole region (list +
     button) disappears once feedback is showing.
   The template takes "which hints are currently visible" and "the
   reveal-more control, if any" as two separate optional inputs — it does not
   itself own the reveal-count state (that stays each screen's own, as today).
10. **Explanation** *(optional, both screens — already shared via
    `QuestionExplanation`)* — shown whenever a screen hands it an explanation
    bundle; `TopicLesson` always does, `Practice` only once a wrong answer is
    revealed. The *when* is each screen's own decision, same as region 7/8.
11. **Page actions** *(`TopicLesson`-only)* — "← הקודם" / "הבא →" / "→ לתרגול".
    `Practice` has no equivalent (its "next" lives inside the answer area).
    **Also inside this region today:** `TopicLesson`'s own "למה זה נכון?" proof
    paragraph (`bundle.angle?.proof`) — kept exactly where it is now, directly
    above the action buttons, not folded into the Explanation region.

No region changes order, and no region that exists today disappears or moves
to a different position in the sequence for either screen.

## Copy
No new or changed Hebrew strings. Every string either screen shows today stays
exactly as written in `Practice.tsx` / `TopicLesson.tsx` / `src/data/*.ts` —
this phase moves where strings are laid out, never their wording.

## Interaction Flow
Unchanged for both screens — every tap, reveal, and transition a student can
trigger today still does exactly what it does today (checked concretely by the
Acceptance Criteria Check below, and ultimately by every existing e2e test
passing unmodified). This phase is about *where* on screen a piece of state
renders, never *when* it appears or what tapping it does.

## Accessibility / RTL notes
No change to any LTR/RTL handling. The two load-bearing rules already in
`src/App.css` — the problem box's `box-ltr`/`box-rtl` direction switch, and
`unicode-bidi: isolate` on an inline math run inside a Hebrew sentence — are
carried into the template's problem-box region exactly as they exist today,
not re-derived. Same for the number pad's `direction: ltr` (fixed during the
separate, already-merged `practice-numpad-ui-polish` work) — the template's
answer-area region must keep that rule, not regress it by re-ordering markup.

## Acceptance Criteria Check
- A single component renders only present fields, nothing for absent ones:
  **yes** — every region above is independently optional by construction (a
  screen that doesn't supply a region's input supplies nothing, same as
  today's `{x && <...>}` checks, just centralized).
- `Practice.tsx` rebuilt on the template with no observable change, existing
  practice-screen e2e tests pass unmodified: **yes, by design** — every region
  `Practice` uses today (1, 2 title only/no badge, 4-inline, 5, 7, 8, 9-reveal
  mode, 10-conditional) is specified above with its exact current content and
  placement; nothing is added, removed, or reordered.
- `TopicLesson.tsx` rebuilt on the template with no observable change, existing
  lesson-screen e2e tests pass unmodified: **yes, by design** — same
  reasoning, covering regions 1 (two links), 2-with-badge, 3-standalone, 4, 5,
  9-always-shown mode, 10-always, 11.
- Template supports a `Practice`-only field without forcing `TopicLesson` to
  render an empty placeholder: **yes** — regions 7 and 8 are explicitly
  `Practice`-only in this doc; `TopicLesson` simply never supplies them, same
  as region 3/11 being `TopicLesson`-only and `Practice` never supplying those.
- Template demonstrably extends with one more optional field without touching
  every screen: **yes** — region 6 (animation slot) is specified exactly for
  this proof; it costs touching the template once and zero screens, since
  neither screen supplies it yet.
- No regression on screens sharing CSS classes without sharing a component:
  **flagged, not silently assumed** — region 4's known speak-button placement
  difference (inside vs. above the box) is called out explicitly above as a
  pre-existing inconsistency the template must preserve as two variants rather
  than paper over; `tech-lead`/`developer` should grep for every other consumer
  of `.problem-box`, `.hints`, `.hint-button`, `.answer-row` before assuming
  those classes are template-exclusive.

## Open Questions
None.
