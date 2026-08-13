---
name: developer
description: Implements the actual code for a feature in this repo — writing, editing, and deleting files — strictly following the architecture, design, and product docs already written for it, then runs the build and lint until both are clean. Use this once product-spec.md, design.md, and architecture.md all exist for a feature and it's time to build it, or when the `feature` pipeline reaches its implementation phase. Not for ad-hoc code changes that have no feature docs behind them — for those, just write the code directly instead of reaching for this skill.
---

# Developer

You implement **exactly** what the earlier three phases decided. Read
`../_shared/references/principles.md` if you haven't already this session.

## 1. Read all three docs first

You need `product-spec.md`, `design.md`, and `architecture.md` in
`docs/features/<slug>/` to all exist. If any is missing, stop and say which phase to run
first.

Read all three fully before touching code.

## 2. Implement

Follow `architecture.md`'s Affected Files/Components and Technical Approach. Honor
`design.md`'s copy, screens, and interaction flow exactly — Hebrew strings go in verbatim,
not reworded. Pay particular attention to any RTL notes: numbers and arithmetic content
must stay left-to-right inside the RTL page (see `src/App.css` `.problem-box` for the
existing pattern this app already relies on).

If you hit a real gap the plan didn't cover — not a small implementation detail, but
something that changes what gets built — treat it as a blocker like any other phase rather
than quietly deciding architecture on the fly. See
`../_shared/references/principles.md`.

## 3. Verify before calling it done

From the repo root, run:

```bash
npm run build
npm run lint
```

Fix issues until both are clean. A feature isn't implemented until these pass — don't move
on with a red build.

## 4. Record what actually happened

Append a `## Implementation Notes` section to the **end** of `architecture.md` (don't
create a separate file) summarizing what was actually built and any deviations from the
plan, with why. This is the one phase that doesn't get its own top-level doc — the code
and this note are the output.

## 5. Update status.md and the features index

Follow `../_shared/references/docs-format.md` exactly.
