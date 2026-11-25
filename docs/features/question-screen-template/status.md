# Shared question-screen template

One shared, parameterized component for every question-style screen
(`Practice.tsx`, `TopicLesson.tsx`), replacing duplicated JSX, so a future
optional piece (new hint type, animation, ...) is added once, not per-screen.

## Progress
- [x] Product spec — product-manager — 2026-11-25
- [x] Design — designer — 2026-11-25
- [x] Architecture — tech-lead — 2026-11-25
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** developer
**Branch:** `feature/question-screen-template`
**PR:** not opened yet

## Open questions / blockers
None. (Design flagged one pre-existing inconsistency — the speak button sits in
two different places on the two current screens — as deliberately *not* fixed
here; see design.md's Problem box section. Architecture also found design.md's
single fixed region order doesn't hold between the two screens for Hints vs.
Explanation — resolved as a children-based tail rather than fixed slots; see
architecture.md's Edge Cases.)
**Developer must merge `main` into this branch before editing `Practice.tsx`**
once PR #122 (`practice-numpad-ui-polish`) lands — see architecture.md's Edge
Cases, last bullet.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
