---
name: feature
description: Runs a new feature or change request for the learn-math app through the full pipeline — product spec, UX/UI design, technical architecture, implementation, and end-to-end tests — leaving a documented trail in docs/features/<slug>/ that a non-technical human can read to see the plan, current status, and anything still open. Use this whenever the user asks to add a feature, change existing behavior, or describes something they want the app to do (e.g. "I want a timer on the practice screen", "add fraction exercises", "let kids pick easy/medium/hard difficulty"). Always reach for this skill before writing code for a feature request — don't jump straight to implementation — so the request gets a product decision and a design before anyone touches code.
---

# Feature pipeline orchestrator

You are sequencing five role skills — `product-manager`, `designer`, `tech-lead`,
`developer`, `qa` — to turn a feature request into a documented, implemented, tested
change. Read `../_shared/references/principles.md` now if you haven't already this
session; it covers rules every phase (including you) follows.

## 1. Find or create the feature folder

Derive a short kebab-case slug from the request (e.g. "add a countdown timer to the
practice screen" → `practice-timer`). Check `docs/features/` for an existing folder that's
clearly the same feature (revise it) before creating a new one.

`mkdir -p docs/features/<slug>/` if new.

## 2. Run the phases in order

For each phase below, invoke the corresponding skill via the Skill tool, passing it: the
feature slug, the folder path `docs/features/<slug>/`, and the original request/context in
your own words (the phase skill will also re-read prior docs from disk itself — don't rely
only on what you pass it).

1. `product-manager`
2. `designer`
3. `tech-lead`
4. `developer`
5. `qa`

After each phase returns, **re-read `docs/features/<slug>/status.md` from disk** (not just
the phase's chat response) to see what actually happened:

- If **Current phase** advanced to the next phase in the sequence, continue.
- If **Current phase** stayed on the phase you just ran (i.e. it's blocked), **stop the
  pipeline here.** Don't invoke the next phase. Read the Open questions / blockers section
  and summarize it to the user in plain language — what's blocking, and what decision or
  input would unblock it. This is expected, normal behavior when a real ambiguity exists;
  it's not a failure.

## 3. Finish

Once `qa` completes and status.md shows all five phases checked and QA passing, tell the
user, in plain language, in one short paragraph:
- What was built (one or two sentences, plain language — not a changelog).
- Where the docs live (`docs/features/<slug>/`).
- How to see it running (`npm run dev`) and how to run the tests QA wrote
  (`npm run test:e2e`).

If QA finishes but tests are failing (a real bug, not a bad test — see the `qa` skill),
say so instead of claiming success, and note that the `developer` phase needs another pass.

## Notes

- Don't do the work of any phase yourself — always dispatch to the matching skill, even for
  something that feels small. The value of this pipeline is the paper trail; skipping a
  phase breaks it silently for the next feature someone reads.
- Always run the full five-phase sequence, even for a revision to an existing feature or a
  change that feels small. Each phase skill already knows how to make a light-touch update
  when little has actually changed (e.g. `product-manager` can leave most of an existing
  spec untouched and just amend the relevant section) — that's cheaper than you trying to
  guess which phases matter, and it keeps every feature's docs equally trustworthy.
