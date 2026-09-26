---
name: resume-proj
description: Session-start command — reads the project's current status and proposes what to work on next as a list, instead of just reporting it. Use when the user opens a session and wants to pick up where he left off — "מה נמשיך", "על מה נעבוד", "בוא נתחיל", "resume", or invokes `/resume-proj` directly. For a plain status check mid-session with no request to start something, use `/status` instead.
---

# Resume Project

You are opening a new session for a **non-programmer**. He does not want a report — he
wants a list of things he can act on right now, each one ready to just say "כן" to.

## 1. Gather the facts and sort them

Run the same data gathering `/status` runs:

```bash
node scripts/status.mjs
```

Then read `.claude/skills/status/SKILL.md` and follow its steps 1–2 (gather the facts,
sort each open item into a pipeline stage) exactly as written there — don't re-derive the
stage table here, it already exists.

## 2. Summarize — short, like `/status`

One line per open item: what it is, what stage. Skip finished features. This is the
overview; the list in step 3 is where each item becomes actionable.

## 3. Propose — a list, and blocked items belong in it too

Don't collapse to one item and don't drop the blocked ones into a separate vague note.
Every open item gets a line in **one list**, in one of two shapes:

**A. Blocked on the user** — a pending review, an unanswered decision, an account/API-key
step. Give it a reminder, not just a mention — and if it's a pending review, give the
**full recipe right there**, inline, so he can act without coming back to ask you for it:

- **איפה** — the clickable link (PR, live site, or preview build).
- **איך** — the exact click-through or which section to read.
- **מה אמור לקרות** — the literal text/behavior he's checking for.
- **מה לשפוט** — the real judgment call, not "does it work."

Build these fields exactly the way the `review-ready` skill specifies — invoke it (or
follow it directly) rather than reinventing a shorter version here; it already knows the
difference between a UI change, a content change, and a docs-only PR, and the mistakes
that have already cost a session (a table reference instead of the real text, a second PR
named without instructions).

**B. Ready for Claude to start** — name the exact next command (`/feature`, `/designer`,
`/tech-lead`, `/developer`, `/qa`) and, briefly, what it will produce, so saying "כן,
תתחיל ב-X" is enough.

Order: blocked-on-user items first (he's the only one who can move them, and he may
already have an answer), then ready-to-start items, furthest along the pipeline first.

If there's no open work at all, say so plainly and ask if he has something new in mind —
don't invent work.

End with one short question — which item(s) to start now — and **wait for the answer**.
Do not run any pipeline step yourself in this same turn.

## What not to do

- Don't run the test suite.
- Don't list finished features.
- Don't soften a blocked item into something that sounds in progress, and don't shorten
  its recipe to a mention — a blocked item without its full fields leaves him with
  nothing to act on, same as before this command existed.
- Don't skip an item from the list because it's blocked — blocked items are exactly the
  ones he needs reminded, with everything needed to unblock them himself.

Hebrew, like the rest of the project's user-facing text.
