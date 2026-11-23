# Stitch UI pass — 2026-11-22

First run of `stitch-ui-review`. Five screens, direction only — nothing here is built yet.
Student used for before-shots: a throwaway "דוגמה" student created for screenshots, not a real child.
`localStorage` was cleared before shooting; no real progress data was touched or uploaded.

## Screens

1. **StudentPicker** (`before/01-student-picker.jpg` → `after/01-student-picker.png`)
   Stitch: distinct shape+color badge per student card (star/triangle/diamond) so a non-reading
   child can recognize her own card without reading the name. Good idea, cheap to build (CSS).
   Take.

2. **TopicPicker** (`before/02-topic-picker.jpg` → `after/02-topic-picker.png`)
   Stitch: added a star-rating per topic card and a "daily challenge" banner at the bottom.
   The rating idea is reasonable (visual progress per topic) but needs real data wired in, not
   decoration. The "daily challenge" banner is a game-y addition this app doesn't have a concept
   for — skip unless product wants to design that as a real feature first.

3. **Practice** (`before/03-practice.jpg` → `after/03-practice.png`)
   **RTL constraint held**: `3 + 1 =` rendered strictly left-to-right inside the RTL page, as
   instructed. Added a number-pad instead of relying on the OS keyboard (plausible win for small
   hands on a phone, worth prototyping) and a small dot-counting visual above the equation
   (3 red dots + 1 purple dot) — a nice fit with this app's existing `analogy` field concept.
   Take the RTL-safe layout and number-pad idea; the dot visual would need per-question logic,
   so later.

4. **Result** (`before/04-result.jpg` → `after/04-result.png`)
   Stitch added coins/points ("+20 כוכבים זהובים") and a streak counter. **Skip** — this app
   deliberately has no currency/points system, and CLAUDE.md's whole posture is "does this help
   a child who just got something wrong," not engagement mechanics. Keep the plain
   stars-and-percentage version already in this app; only take the layout/typography direction.

5. **History / "My Progress"** (`before/05-history.jpg` → `after/05-history.png`)
   Clean, matches what was asked (by-topic and by-difficulty summary, plain session list,
   no gamification). Closest of the five to something buildable as-is, direction-wise.

## RTL/Hebrew check
No screen mirrored digits or flipped math expression order. All generated Hebrew text read
correctly (Stitch renders real coded screens, not an image-diffusion model like Gemini — so unlike
the `gemini-ui-review` skill's warning, the Hebrew text here was NOT garbled). Still, per project
rule, no text was or will be copied out of these mockups into the app — real Hebrew copy stays
typed directly from the app's own data files.

## Unknowns resolved (for updating `~/.claude/skills/stitch-ui-review/SKILL.md`)
- **No account picker needed**: the browser's active Google session (the user's own) was already
  signed into Stitch; no account-switch UI was exercised.
- **Image upload did not work via browser automation**: clicking the "+" → "Upload Files" menu
  item in the prompt box did not leave a persistent `<input type="file">` in the DOM before or
  after the click (confirmed via JS query), and no OS-level file dialog was visibly capturable
  either. Likely a File System Access API / ephemeral input that only exists for the instant of
  the click. **This session fell back to describing each screen in text only — no screenshots
  were actually attached to Stitch.** A future run should try: dragging a file onto the canvas,
  or a CDP-level file-chooser intercept, before assuming this is impossible.
- **UI shape**: homepage has a single prompt box with an App/Web toggle (chose **Web**, not App,
  since this is a browser app) and a "+" menu (Upload Files / Website URL / Enhance prompt). First
  prompt creates a named project with two artifacts: a generated style system ("Sunlit Study" —
  colors, type, button/nav samples) plus the first screen. Each later prompt in the same project
  thread adds one more screen to the canvas and offers 3 follow-up suggestion chips.
  Send button is a round arrow icon at the bottom-right of the prompt box; it's disabled (lighter)
  until there's text.
- **No visible usage-limit hit** across 5 generations (roughly 45-75s each) in one session — unlike
  Gemini Pro's daily cap, nothing here suggested a limit. Not proven absent, just not encountered.
- **Reading completion**: no reliable single "done" element was identified; this run polled with
  `wait`+`screenshot` every ~8-10s and judged completion by the chat's "N Screens created" line
  appearing (loading dots disappear) plus the canvas card's content settling across two checks.
- **Export formats offered**: AI Studio (preview), Figma, MCP, Netlify (preview), Lovable
  (preview, grayed out). No plain "download image" or "export code as files" option was seen in
  this menu — Figma is the realistic option if a real export is ever wanted, but per the skill,
  none of this is needed since the mockups are direction-only and were captured as PNGs via the
  canvas `zoom`+`save_to_disk` action instead (full-card capture needs "zoom to selection" after
  clicking the card, since cards taller than the viewport don't fit at the default zoom level).
- **No sign-in/sign-up flow was exercised** — the account was already active, so the "never sign
  in" rule was never tested in practice here.
