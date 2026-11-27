---
name: ui-ux-polish
description: Runs a multi-round UX/UI improvement loop on the whole app or game. The main session ping-pongs (up to 3 rounds) with the ux-ui-reviewer subagent - reviewer critiques every screen, main session implements the fixes, reviewer re-checks. Use when the user wants the app to look and feel amazing, or asks for a full design review/polish.
---

# UI/UX Polish - Ping-Pong Loop

You are the **orchestrator** (main session). The `ux-ui-reviewer` subagent is the **critic**. You implement; it judges. Run up to **3 rounds**.

## Step 0 - Preparation
1. If `DESIGN.md` does not exist or the app has no coherent theme, run the `app-design-system` skill first.
2. If the app has no consistent motion/feedback system (buttons with no press state, no success/failure feedback, no rewards where the app type calls for them, no `INTERACTIONS.md`), run the `motion-feedback-rewards` skill before round 1.
3. Build a **screen inventory**: every route/screen/modal/sheet/component group, with file paths, plus key states (empty, loading, error). Save it as `.ux-polish/inventory.md`.
4. Capture **screenshots** of every screen (and key states, light + dark) into `.ux-polish/round-0/` using whatever is available: Playwright, simulator/emulator, Chrome tooling, or Storybook. If you cannot capture, tell the reviewer to inspect the code and describe what each screen renders.
5. Make sure the app builds and tests pass BEFORE you start (baseline). Commit or stash so changes are easy to review/revert.

## Step 1 - The loop (max 3 rounds)

For round N = 1, 2, 3:

**A. Ask the reviewer.** Spawn (round 1) or resume/message (rounds 2-3) the `ux-ui-reviewer` subagent via the Agent tool. Give it:
- the inventory, screenshot folder, `DESIGN.md`, `INTERACTIONS.md`
- the round number
- for rounds 2-3: a changelog of exactly what you changed (files + summary) and anything you deliberately skipped, with the reason
If you cannot resume the same agent, start a fresh one and include the previous round's findings + your changelog so it has full context.

**B. Triage.** Read its findings. Implement ALL P0 and P1 items. Implement P2 items when effort is S/M and they fit `DESIGN.md`. Push back on a finding only with a concrete reason (technical constraint, conflicts with brand, would harm another screen) - record it in the changelog. Never change business logic or break functionality to satisfy a visual note.

**C. Implement.** Work theme-first (tokens, shared components, feedback layer) so one change fixes many screens; then screen-specific fixes. Reuse existing components. Keep diffs focused.

**D. Verify.** Build, run tests/lint, re-capture screenshots into `.ux-polish/round-N/`, and look at them yourself. Fix regressions before going back to the reviewer.

**E. Stop conditions.** Stop early if the reviewer returns `VERDICT: DONE`. Otherwise continue until round 3 is finished.

## Step 2 - Final report
Write `.ux-polish/REPORT.md` and show me a summary:
- Score progression across rounds
- Biggest improvements (before/after screenshot paths)
- Everything implemented, grouped by theme
- Findings intentionally skipped, with reasons
- A short checklist of things I must verify by hand on a real device (animation smoothness, haptics, sound, performance)
- Remaining recommendations for a future pass (assets, copy decisions, brand input, bigger refactors)

## Rules
- Never skip a screen. Every screen in the inventory must be reviewed in every round.
- The reviewer is read-only; you are the only one who edits code.
- Do not go beyond 3 rounds. Diminishing returns beat endless tweaking.
- Prefer tokens and shared components over one-off styles.
- If something requires a decision from me (brand color, logo, copy, sounds), list it in the report instead of guessing wildly.
