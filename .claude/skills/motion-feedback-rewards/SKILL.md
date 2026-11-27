---
name: motion-feedback-rewards
description: Makes an app or game feel alive, smooth and rewarding - button press feel, transitions, success celebrations, gentle failure feedback, haptics, sound, particles, controlled animation variation, progress and reward systems, and strict interaction consistency. Use when the UI feels dry, flat, static or "not smooth", for educational/habit/gamified apps, and for games.
---

# Motion, Feedback & Rewards

Your job: every interaction in this app should answer the user with a response that is fast, physical, emotionally right and CONSISTENT. Static = dead. Noisy = annoying. The goal is *tasteful delight with a purpose*.

## Process

1. **Detect context.** Read the code and `DESIGN.md` (if present). Identify:
   - Stack (React/Next, React Native, Flutter, SwiftUI, Unity, Phaser, plain canvas...) and the animation tools already available (Framer Motion, Reanimated, Lottie, Flutter animations, CSS, DOTween...). Prefer what is installed; add at most one small dependency if clearly needed.
   - App type: **utility**, **educational**, **habit/fitness**, **game**, **creative**. This sets the intensity (see "Intensity by app type").
   - The core loop: the one action users repeat, and the "win moment".

2. **Build ONE central feedback layer** (never scatter ad-hoc effects). Create a small module (e.g. `feedback.ts` / `FeedbackService`) exposing a semantic API:
   - `tap()` - light acknowledgement for any press
   - `select()` / `toggle()`
   - `success(level)` - small / medium / big
   - `fail(level)` - soft / hard (see failure rules)
   - `reward(type, amount)` - points, coins, XP, streak, badge
   - `milestone()` - rare big celebration
   - `warning()` / `error()`
   Each call fans out to: visual animation + haptic + sound, according to user settings. Include **settings**: sound on/off, haptics on/off, reduced motion (honor the OS setting by default). Preload sounds; never block the UI thread.

3. **Define motion tokens** (add to `DESIGN.md` and code): durations (instant 80ms, fast 150ms, base 250ms, slow 400ms, celebratory 600-1200ms), easings (ease-out for entrances, ease-in for exits, spring for playful), spring configs, stagger delays (30-60ms). Use them everywhere; no magic numbers.

### 3b. Controlled variation ("alive, never identical, never chaotic")

Animations that repeat identically feel robotic. Add *bounded* variation to **decorative and celebratory** feedback only.

**Where to randomize (decorative):** success/reward celebrations, confetti/particles/sparkles, floating "+10" numbers, idle/ambient motion, empty-state and loading flourishes, character/mascot reactions, sound pitch, congratulation microcopy.

**Where NEVER to randomize (functional):** press/release timing, focus and selection states, navigation transitions, layout, error/validation feedback, anything that communicates state or must be predictable. Same action = same functional response, always.

**How to build it (one `variation` helper next to the feedback layer):**
1. **Variant pools.** For each success/reward event define 3-5 hand-tuned variants (e.g. pop-and-glow, spin-pop, bounce-up, ring-pulse, sparkle-burst). The system picks one per event.
2. **Shuffle-bag, not pure random.** Draw variants from a shuffled bag so the same variant never plays twice in a row and all appear evenly before any repeats.
3. **Parameter jitter within clamps.** Randomize small ranges around the token value, never outside it: duration +/-10-15%, scale overshoot +/-8%, rotation +/-6 degrees, particle count +/-20%, particle spread/angle, stagger offsets +/-15ms, sound pitch +/-5% (and 2-3 sound variants per event), hue shift within the palette only (never outside brand colors).
4. **Seeded RNG.** Use a seedable generator (injectable in tests, plus a "deterministic mode" flag) so tests and screenshots are reproducible.
5. **Intensity coupling.** Variation range scales with event importance: tiny events = near-identical, milestones = more variety. Combos/streaks escalate predictably (pitch up, bigger burst) with jitter layered on top.
6. **Copy variation.** Rotate 4-6 success and encouragement messages (no immediate repeats), matching the app's tone. Never vary error instructions.
7. **Budget.** Variation must not cost performance: pre-build variants, reuse pooled particle objects, no per-frame allocation.
8. Expose `variation.intensity` (0 = off, 1 = default) in config and respect reduced-motion (variation off, calm single variant).

4. **Upgrade the basics first (every app):**
   - **Buttons:** pressed state in <=80ms (scale 0.96-0.98 + subtle shade change), release springs back; disabled and loading states (inline spinner, keep width stable, prevent double-submit); light haptic tap.
   - **Transitions:** screens/modals/sheets animate with spatial logic (slide from where they came, shared-element where possible); lists animate insert/remove/reorder; no hard cuts, no layout jumps.
   - **Loading:** skeletons that match final layout, never blank screens; optimistic UI where safe.
   - **Inputs:** focus ring/label animation, inline validation with gentle shake only on error, success check on valid.
   - **Numbers & progress:** count-up/tween numbers, smooth progress bars, animated rings.
   - **Empty states and first-run:** friendly illustration/animation and a clear next action.
   - **Performance:** animate only transform/opacity (or platform equivalent), target 60fps, no jank; test on a low-end device profile.

### 4b. Interaction spec - the single source of truth for feedback

Create `INTERACTIONS.md` (and mirror values in code as constants). One row per component and per state, no vague words. Fill with concrete numbers for THIS app:

| Component | State | Visual | Duration / easing | Haptic | Sound |
|---|---|---|---|---|---|
| Primary button | pressed | scale 0.97, darken 8% | 80ms ease-out | impact-light | tap |
| Primary button | released | spring back to 1.0 | 160ms spring | - | - |
| Primary button | loading | inline spinner, width locked, disabled | 150ms fade | - | - |
| Primary button | success | check morph + green flash | 250ms | notification-success | success-small |
| Toggle / switch | on/off | thumb slide + track color | 150ms | impact-light | tick |
| Text input | focus / error / valid | ring, shake 4px x2, check | 150-250ms | error only | - |
| List row | pressed / swipe | highlight, action reveal | 100ms | selection | - |
| Tab / nav | change | indicator slides, content fades | 250ms | selection | - |
| Modal / sheet | open / close | rise + dim backdrop / reverse | 250ms / 200ms | - | - |
| Answer correct / incorrect / reward / milestone | (per rules below) | ... | ... | ... | ... |

Rules for the table:
- Press feedback starts within **100ms** of touch-down (visual first, haptic same frame). Never wait for the network before acknowledging a tap.
- Pressed state triggers on touch-DOWN; the action triggers on touch-UP (cancel gracefully if the finger slides off).
- Prevent double-taps/double-submits; ignore repeat feedback within 60ms.
- Every tappable element gets a pressed state - buttons, cards, list rows, icons, chips, tabs, no exceptions.
- Touch targets >= 44px (iOS) / 48px (Android), with press feedback covering the full target.
- Every row is implemented by ONE shared component (see 4c), not re-implemented per screen.

### 4c. Consistency enforcement (UX uniformity across the whole app)

1. **Audit first.** Grep the codebase and list every distinct implementation of: buttons, inputs, toggles, cards, list rows, modals/sheets, toasts, loaders, empty states, headers/nav, icons, and every hard-coded duration/easing/color/size/radius. Report duplicates and drift ("5 different button styles, 7 different border radii").
2. **Consolidate.** Create or fix ONE shared component per UI primitive, built on design tokens + the feedback layer. Migrate screens to use them. Delete dead duplicates. Small safe steps; the app must build after each.
3. **Single entry points.** Press feedback, animations and haptics are triggered only via the shared components or the feedback API - no raw Animated/CSS transition/vibrate/sound calls scattered in screens.
4. **Pattern consistency.** Same action = same pattern everywhere: confirm/cancel placement and order, destructive action styling, back/close behavior, swipe gestures, pull-to-refresh, how errors and toasts appear, how loading is shown, how lists empty out, microcopy terminology and tone, icon meaning.
5. **Guardrails.** Add lightweight automated checks where feasible: a lint rule or script that fails on hard-coded colors/durations/radius outside token files and on raw animation/haptic/sound APIs outside the feedback layer; a test that renders each shared component in every state (default, pressed, disabled, loading, error) and snapshots it.
6. **Cross-platform parity** (if several platforms): same behavior adapted to platform conventions (haptics, back gesture, safe areas), never different logic.
7. **Document** intentional deviations with a reason in `INTERACTIONS.md`. Undocumented differences are bugs.

5. **Success moments (scaled to importance):**
   - *Small* (correct answer, item completed): color flash on the element, check-mark draw, tiny scale pop, short pleasant sound, light haptic.
   - *Medium* (streak up, section done): number tween, badge/XP fly-up into the counter, subtle confetti burst or sparkle from the element, medium haptic.
   - *Big / milestone* (level up, course finished, new record): full-screen but dismissible celebration - confetti/particles, hero animation of the reward, escalating sound, success haptic pattern, clear "Continue" button. Under ~1.5s before the user can act.
   - Celebrations originate from where the user acted and never block the next action. Apply controlled variation (3b) here.

6. **Failure & "not yet" moments - the emotional rules:**
   - **Educational / habit apps:** NEVER punish or shame. Soft warm color (amber/coral, not harsh red), gentle shake or soft bounce, calm lower tone (no buzzer), supportive microcopy ("Almost! Try again", "Good effort - here's the trick"), and immediately show the path forward (hint, explanation, retry). Preserve streak/progress where sensible; offer "streak freeze" style safety nets. Show what they got right before what they got wrong.
   - **Games:** failure can be dramatic but fast to recover from: short sting animation, clear cause, instant retry button, "so close" progress indicator, never a long unskippable screen.
   - **Utility apps:** errors are calm and actionable; red only for real errors, with how to fix them.
   - Failure color must pass contrast and never be the only signal (add icon + text).

7. **Reward & progression systems (if the app has or wants engagement):**
   - Layer them: instant feedback (points popping) -> session reward (summary screen with stats) -> short-term (daily streak, daily goal ring) -> long-term (levels, badges, collections, unlocks).
   - Variable, surprising-but-fair rewards sparingly (bonus XP, rare badge) - never dark patterns, no fake urgency, no guilt trips, no manipulative notifications.
   - Always show progress toward the next reward ("3 more to level 5").
   - Make rewards *visible and collectible*: animated counters in the header, badge shelf, level indicator, screenshot-worthy summary cards.
   - Propose a small reward economy table (what earns what) in `DESIGN.md`, matched to the core loop. Keep it simple; flag anything needing my decision.

8. **Sound & haptics:** a small, cohesive sound palette (tap, success, fail, reward, milestone) in one sonic style, short (<1s), normalized volume, respects mute/silent mode. Haptics: platform semantic patterns (impact light/medium, notification success/warning/error), never constant vibration. If no audio assets exist, list the exact sounds needed (name, length, mood) and wire placeholders so I can drop files in; do not download unlicensed assets.

9. **Games addendum (when the app is a game):** add "juice" - tiny tunable screen shake, hit-stop/freeze frames on impact, squash-and-stretch, anticipation + follow-through, trails, particle bursts, camera easing, floating damage/score numbers, combo escalation (pitch and visual intensity rising), satisfying pickups, idle animations so nothing is ever static, juicy menus/buttons. Intensity values are tunable constants in one config.

10. **Intensity by app type** (default dials):
    - Utility/productivity: subtle - micro-feedback, smooth transitions, rare celebrations.
    - Educational/habit: warm and encouraging - frequent small wins, medium celebrations, gentle failure.
    - Games: expressive - high juice, big celebrations, fast retry.
    - Finance/health/serious: restrained - clean confirmation, no confetti for money movements.

11. **Verify.** Run the app. Check:
    - Every primary action has visible + tactile feedback; nothing animates longer than needed; reduced-motion disables big motion but keeps state clarity; sound/haptic toggles work; no jank; no feedback fires twice.
    - Variation: trigger the same success event 20 times - no identical back-to-back repeats, all variants appear, nothing outside clamps; deterministic mode gives identical output; reduced-motion turns variation off.
    - Press precision: every tappable element shows pressed feedback within 100ms; no double-fire; touch-up triggers the action; sliding off cancels.
    - Consistency: re-run the 4c audit and report before/after counts of distinct implementations and hard-coded values; zero raw animation/haptic/sound calls outside the feedback layer.
    Update `DESIGN.md` with motion tokens, feedback API, reward table; keep `INTERACTIONS.md` current.

## Rules
- Feedback must be **meaningful** (communicates state), **fast** (starts <100ms), **proportional** (bigger event = bigger reaction), **skippable** (never traps the user), **consistent** (same event = same response everywhere).
- Do not change business logic; hook into existing events through the central feedback layer.
- Do not add effects to every element - pick the 20% of interactions users do 80% of the time and make them excellent.
- Accessibility: respect reduced-motion, avoid flashing >3 times/second, keep text readable during animations, provide non-audio and non-color cues.
