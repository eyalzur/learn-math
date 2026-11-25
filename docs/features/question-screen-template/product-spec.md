# Shared question-screen template

## Summary
Replace the two hand-written, near-duplicate "question screen" layouts in
`Practice.tsx` and `TopicLesson.tsx` with one shared, parameterized template
component, so every question-style screen in the app renders from the same place.

## Problem / Motivation
`Practice.tsx` and `TopicLesson.tsx` each independently lay out the same shape —
a back-link/counter header, a topic/style title, the question itself (with an
optional diagram and an optional read-aloud button), and (on `Practice.tsx`) an
answer area, hints and an explanation. Today, any change to that shared shape (a
spacing fix, a new optional piece like an animation or a new hint style) has to be
found and repeated in both files, correctly, or the two screens silently drift
apart — exactly what already happened once (CLAUDE.md's RTL-numerals bug was
fixed on the practice screen's keypad without anyone needing to touch
`TopicLesson.tsx`, only because that screen has no keypad at all — but a future
piece that *is* shared could easily be fixed in one place and missed in the
other). The user has said directly that without this, every future addition to a
question screen means redoing the same work twice and the two screens keep
threatening to diverge.

## User Stories
- As the developer (Claude, working in future sessions), I want one template that
  already knows how to render every existing optional piece of a question screen
  (diagram, read-aloud, answer area, hints, explanation), so that adding one more
  optional piece in the future means extending the template once instead of
  hunting down every screen that needs it.
- As the product owner, I want today's screens to look and behave identically
  after this change, so that this refactor carries zero risk to the children
  using the app right now.

## Acceptance Criteria
- A single component (name and file decided by `designer`/`tech-lead`) accepts a
  structured set of fields describing one question screen's content and renders
  only the fields that are present — a screen that doesn't supply hints renders
  no hint UI at all, exactly as today.
- `Practice.tsx`'s practice screen (full flow: header, title, problem box with
  diagram/read-aloud, answer input + check button + number pad, hints, feedback,
  diagnosis/follow-up, explanation) is rebuilt on top of this template with no
  observable change: every existing `tests/e2e/*.spec.ts` test that exercises the
  practice screen continues to pass unmodified.
- `TopicLesson.tsx`'s lesson screen (header, title, problem box with
  diagram/read-aloud, hints, page navigation) is rebuilt on top of the same
  template with no observable change: every existing `tests/e2e/topic-lesson.spec.ts`
  (and any other spec touching that screen) continues to pass unmodified.
- The template demonstrably supports a field that only one of the two current
  screens uses (e.g. `Practice.tsx`'s answer area / number pad, which
  `TopicLesson.tsx` has no equivalent of) without forcing the other screen to
  render an empty placeholder for it.
- Adding a plausible new optional field (for documentation/proof purposes,
  `tech-lead`/`developer` can pick one — e.g. a future "worked-example animation"
  slot) is possible by touching the template and nothing else; this doesn't have
  to ship a real animation, just prove the template's shape actually extends this
  way (e.g. as a documented example or a type-level slot, per `tech-lead`'s
  judgment of what's provable without inventing unrequested UI).
- No visual or behavioral regression on any other screen that happens to share
  CSS classes with the template's output (e.g. `.problem-box`, `.hints`) — this is
  explicitly checked, not assumed, since both current screens already share class
  names without sharing a component.

## Out of Scope
- No new visible feature for children (no new animation, no new hint type shipped
  for real) — this phase only proves the template *can* take one.
- No change to the generic question-screen-template's parent-level navigation
  (student → grade → topic → level/style) — only the question-screen content
  itself.
- No change to any question/lesson data (`src/data/*.ts`), scoring logic, speech
  logic, or diagnosis logic — those stay exactly as they are; the template only
  changes how existing values are laid out on screen.
- The separate, already-tracked "fit everything on one screen without scrolling"
  initiative and the separate "ask before turning off auto-read-aloud" feature
  are explicitly not part of this work.

## Open Questions
None — this is an internal refactor with a clear, testable acceptance bar
(existing automated tests passing unmodified is the actual proof), so there is no
product ambiguity left for `designer`/`tech-lead` to resolve against the user.
