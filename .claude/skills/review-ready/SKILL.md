---
name: review-ready
description: Use this right before telling the user that a PR, feature, or fix is ready for them to check — opening a new PR, reporting CI went green, wrapping up a batch of work, or answering "מה צריך לבדוק" / "איפה ומה". Builds the four-field review request (איפה/איך/מה אמור לקרות/מה לשפוט) that CLAUDE.md requires for every review ask, covers every PR mentioned in the message (not just the first), and has a docs-only variant for PRs with no screen. Do not send a review-ready message without running this first.
---

# Review-ready

The user is not a programmer. He cannot look at a diff and know what to click or what
"correct" looks like. A review request that isn't a runnable recipe leaves him with
nothing — this has already happened three times in one session (see `CLAUDE.md`, section
3), always the same way: a table reference, a second PR named without instructions, or a
rule described instead of quoted.

**The rule: every review ask, for every PR it mentions, gets exactly these four fields —
in the message itself, not by reference to something said earlier.**

```
**איפה:** <clickable link>
**איך:** <student> ← <topic/level> ← <difficulty> ← <question N> (`<the exact math>`) ← type `<exact input>`
**מה אמור לקרות:** "<exact quoted text the app should show>"
**מה לשפוט:** <the real judgment call — not "does this work">
```

If your message is about to say "ready for review", "מוכן לבדיקה", "ready to check",
hand over a PR link, or list more than one PR — stop and fill this template for **each**
one before sending.

## Two review modes — pick by what actually changed

**Content changes** (question wording, hints, the explanation shown after a wrong answer —
i.e. anything in `src/data/grade*.ts` or `explain.ts`) are reviewed as **content, not as an
app**. The user has said this explicitly: he doesn't want to navigate student → topic →
level → question → type a wrong answer, once per question, to see a string he could
instead just read. For these, build a **listing page** (see below) instead of a
click-through recipe, and that page fills the איפה field.

**Screen/UI/behavior changes** (new component, layout, diagram, navigation, anything you'd
actually have to click to see) still get the click-through recipe this file already
describes — a listing page can't show a layout or an interaction.

A single PR can need both — e.g. a diagram PR is UI (click-through), but if it also
reworded a hint, that hint gets a content-mode entry too.

## Content mode: build a listing page, one card per pattern

Show **one example per distinct pattern, not every touched question.** The user has said
this explicitly: new questions in the same style arrive later with different numbers, and
matching the pattern is the whole difficulty — seeing the same rendering rule five times
with different digits confirms nothing a single instance doesn't.

**Find the patterns programmatically, don't eyeball them.** Every shape/wording rule in
this codebase already exposes its own branches as data, because each one is "the check
with teeth" — read off the prompt, verified against `question.answer`. Write a small
script that runs the real extractor (`geometryShape`, `percentStrip`, `explainQuestion`,
...) over every touched question and buckets the results by whatever field(s) the
extractor itself returns as the discriminant — `kind`+`measure`+`unknown` for a geometry
shape, `unknown` for a Pythagoras triangle, which named branch matched for a shape with no
discriminant field (percent, ratio: give each `readShape` branch a name and bucket by
which one fired). Take the **first real question in each bucket** as that pattern's
example. This is exactly the same technique `content.spec.ts` uses to re-derive coverage
independently of the implementation — reuse the instinct, not the file.

Content wording (no diagram) buckets the same way: group by which explanation is actually
produced (e.g. the opening sentence of `explainQuestion(question).steps`), not by question
id or by skimming the data file. Two questions that read differently in the source but
produce the identical rendered explanation are one pattern; two that look similar in the
source but branch into different rendered text are two.

For every pattern's representative, render — using the app's own components, not a
hand-rolled re-implementation (see "Use real components" below):

- **השאלה** — the prompt.
- **רמז ראשון** / **רמז שני** — both hints, in order.
- **הציור, אם יש** — if a diagram module returns non-null for this question, render the
  real diagram component. A changed or new diagram is exactly as reviewable as changed
  wording, and belongs in the same page — don't make graphics a separate click-through
  when a static render shows it just as well.
- **פתרון על טעות** — the explanation shown after a wrong answer, from the real
  `explainQuestion()` — not the source `steps` array copied by hand, since some questions
  compute their explanation from the operands rather than writing it literally.

## Use real components, not a re-implementation

Don't hand-roll HTML/CSS that approximates what the app renders — import the actual
components and data modules and let them render for real, the same way `Practice.tsx`
does. A drawing built from scratch to look like the diagram can silently drift from what
the child actually sees; the real component cannot.

1. Create a small standalone entry (e.g. under a scratch/build directory) that imports
   directly from `src/data/*` and `src/components/*` — the real `explainQuestion`, the
   real shape extractors, the real `<GeometryShape>`/`<PercentStrip>`/etc., and
   `src/index.css` **and** `src/App.css` (the design tokens like `--text-h` live in
   `index.css`; importing only `App.css` renders shapes with invisible strokes — check for
   this before publishing, it fails silently, not with an error).
2. Copy the handful of JSX lines `Practice.tsx` actually uses for the prompt box, the
   hints list, and the explanation block (classNames included) rather than reinventing
   the markup — grep `Practice.tsx` for `problem-box`, `hints`, `explanation-step` to find
   them. This is the one thing worth copying instead of importing, since `Practice.tsx`
   itself isn't a reusable component.
3. Give this entry its own tiny `vite.config.ts` (separate `root`, own `outDir`) so it
   builds standalone without touching the app's real `vite.config.ts` — it must never ship.
4. `npx vite build --config <that config>`, inline the built CSS/JS into one HTML file
   exactly like an app preview, and publish with the Artifact tool.
5. **Verify before publishing**, don't trust that it compiled: open the built HTML with a
   headless browser, check for zero console/page errors, and screenshot at least one card
   of each kind (a diagram, a text-only card, light and dark) — a missing CSS import (like
   #2 above) produces no error and no warning, only a blank shape.

If the PR being reviewed is still on an unmerged branch, check out that branch before
building. If **multiple** unmerged PRs together are what the reviewer needs to see (e.g. a
diagram PR plus a separate wording PR that touches the same questions), create a local
throwaway branch, merge all of them into it (never push it), resolve any trivial conflicts
arbitrarily since nothing here ships, and build the harness from that combined tree. Delete
the branch after publishing.

## Give every card a place for notes

The reviewer reads on the page, not in the chat — so the page needs somewhere to write
back, or every finding has to be re-typed by hand afterward. Give each card a `<textarea>`
for notes (React state is enough; persist to `localStorage` in a `try`/`catch` since a
sandboxed viewer may block storage, but the note still survives for the session either
way). Compile all non-empty notes into one sticky summary panel — sticky so it stays
reachable on a long page — with a "copy all" button (`navigator.clipboard.writeText`,
wrapped in `try`/`catch`) **and** a visible read-only textarea holding the same compiled
text as a fallback, since clipboard permissions aren't guaranteed inside a sandboxed
artifact. Label each compiled entry with the card's id and pattern (`[PR #38]
g6-percent-h1 — discount-amount wording`), not just the note text — a note that only makes
sense next to the card it came from is useless once it's copied out of context.

This page **is** the איפה field for a content/graphics-mode PR.

## Filling each field

**איפה — a link that opens to the thing, not near it.**
- Content and/or graphics change: the listing page above, one card per pattern.
- Already merged/on `main`, and it's a UI change: the live site,
  `https://eyalzur.github.io/learn-math/`.
- Still on an unmerged branch/PR, and it's a UI change: the site can't show it yet. Build a
  throwaway preview — `npm run build`, inline the built CSS/JS into one HTML file, publish
  it with the Artifact tool — and link that. Don't describe the change in words as a
  substitute for a link; CLAUDE.md is explicit that this is what "בונים גרסת בדיקה ונותנים
  לינק" means.
- Docs-only PR (nothing to click through, and not question content either): link straight
  to the file on the branch, e.g.
  `https://github.com/eyalzur/learn-math/blob/<branch>/docs/features/<slug>/status.md`.

**איך — exact clicks, not a description of the area (UI mode); which item to read (content mode).**
UI mode: name the actual student, the actual topic/level, the actual difficulty, the
question number, and the literal thing to type or click. "Check the percent questions" is
not this field; `רותם ← אחוזים ← קשה ← שאלה 3 (` + "`" + `200 שקלים, הנחה 15%` + "`" + `) ← הקלד 30` is. If you had
to run the app yourself to find the right path, that path is what goes here — don't make
the user rediscover it.
Content mode: point at the entry in the listing page (question id or its position), not "go
run the app" — the page already has everything, reading it is the whole recipe.
For a docs-only PR, this is which section to read, not "read the file."

**מה אמור לקרות — a literal quote, not a paraphrase of the logic.**
Copy the actual string the app renders (or the actual paragraph in the doc). If you
haven't seen the string appear, you don't have this field yet — go look, don't
reconstruct it from the code.
Content mode: the listing page already shows the real strings inline, so this field can
point at them ("the four lines under the question") rather than re-quoting the page.

**מה לשפוט — the actual open question, not a rubber stamp.**
Never "does this work" or "is this correct" — those are already covered by the automated
tests. This field is the thing only a human can judge: does the wording actually teach,
does the number make sense for that child's age, is the explanation's order the way a
teacher would actually walk through it. Write the real question the user has to answer.

## Multiple PRs in one message

Every PR that appears in a message announcing readiness needs its own complete four
fields. Two failure modes to check for before sending:

- **A second PR named in passing** ("ועוד #30 ממתין") **without instructions** — either
  give it full fields or don't mention it as something to review.
- **"ראה בטבלה למעלה"** or any other back-reference — restate the essentials inline. A
  reference is not an instruction.

## Self-check before sending

For every PR your message mentions as ready: do all four fields appear as literal text in
this message, filled with specifics (not placeholders, not "see above")? If any field is
missing or vague, you're not done — go get the missing piece (run the app, build the
preview, read the actual rendered text) rather than sending it anyway.

For a content/graphics-mode PR specifically: does every distinct pattern among the touched
questions have a card — found by actually bucketing the extractor's output, not by
skimming the data file? A page that shows five near-identical cards from the same bucket
while a genuinely different branch goes unrepresented is the content-mode version of "see
above" — it looks thorough and isn't. And did you verify the built page in a headless
browser rather than trusting a clean `vite build` — a missing CSS import renders with zero
errors and an invisible diagram.

## When this doesn't apply

Status updates that aren't asking the user to check anything — a quiet CI re-check with
nothing new, a note that something is still building — don't need this template. It's for
the moment you're handing the user something to look at.
