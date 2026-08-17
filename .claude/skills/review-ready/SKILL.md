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

## Filling each field

**איפה — a link that opens to the thing, not near it.**
- Already merged/on `main`: the live site, `https://eyalzur.github.io/learn-math/`.
- Still on an unmerged branch/PR: the site can't show it yet. Build a throwaway preview —
  `npm run build`, inline the built CSS/JS into one HTML file, publish it with the
  Artifact tool — and link that. Don't describe the change in words as a substitute for a
  link; CLAUDE.md is explicit that this is what "בונים גרסת בדיקה ונותנים לינק" means.
- Docs-only PR (nothing to click through): link straight to the file on the branch, e.g.
  `https://github.com/eyalzur/learn-math/blob/<branch>/docs/features/<slug>/status.md`.

**איך — exact clicks, not a description of the area.**
Name the actual student, the actual topic/level, the actual difficulty, the question
number, and the literal thing to type or click. "Check the percent questions" is not this
field; `רותם ← אחוזים ← קשה ← שאלה 3 (` + "`" + `200 שקלים, הנחה 15%` + "`" + `) ← הקלד 30` is. If you had
to run the app yourself to find the right path, that path is what goes here — don't make
the user rediscover it.
For a docs-only PR, this is which section to read, not "read the file."

**מה אמור לקרות — a literal quote, not a paraphrase of the logic.**
Copy the actual string the app renders (or the actual paragraph in the doc). If you
haven't seen the string appear, you don't have this field yet — go look, don't
reconstruct it from the code.

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

## When this doesn't apply

Status updates that aren't asking the user to check anything — a quiet CI re-check with
nothing new, a note that something is still building — don't need this template. It's for
the moment you're handing the user something to look at.
