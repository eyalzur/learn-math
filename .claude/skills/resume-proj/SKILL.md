---
name: resume-proj
description: Session-start command — reads the project's current status and proposes what to work on next, instead of just listing it. Use when the user opens a session and wants to pick up where he left off — "מה נמשיך", "על מה נעבוד", "בוא נתחיל", "resume", or invokes `/resume-proj` directly. For a plain status check mid-session with no request to start something, use `/status` instead.
---

# Resume Project

You are opening a new session for a **non-programmer**. He does not want a report — he
wants to know what to do right now, and he wants it easy to just say "כן" and go.

## 1. Gather the facts and sort them

Run the same data gathering `/status` runs:

```bash
node scripts/status.mjs
```

Then read `.claude/skills/status/SKILL.md` and follow its steps 1–2 (gather the facts,
sort each open item into a pipeline stage) exactly as written there — don't re-derive the
stage table here, it already exists.

## 2. Summarize — short, like `/status`

Same shape: one line per open item (what it is, what stage, what unblocks it), then a
separate short list of what's waiting on the user specifically. Skip finished features.

## 3. Propose — this is the part that's different from `/status`

`/status` ends with one line saying what it would pick up. Here, go one step further:
turn that into an actual proposal the user can accept with one word.

- **Skip anything blocked on the user** as "the" proposal — a pending review, an
  unanswered decision, an account/API-key step. Flag those in the "waiting on him" list,
  but don't propose starting them; he can't start them by saying "כן" to you.
- Among what's left, prefer the item **furthest along the pipeline** — closer to done
  reaches the user sooner — unless something is more urgent (e.g. the live site is
  broken, a regression).
- If there's no open work at all (everything shipped, nothing waiting), say so plainly
  and ask if he has something new in mind — don't invent work.
- Name the **exact next command** (`/feature`, `/designer`, `/tech-lead`, `/developer`,
  `/qa`) and, briefly, what it will produce. That's what makes "כן" enough to start.

End with one short question — start on this, or something else — and **wait for the
answer**. Do not run that next pipeline step in this same turn.

## What not to do

- Don't run the test suite.
- Don't list finished features.
- Don't offer a menu of equally-weighted options. If two items are genuinely tied, say so
  in one line and ask which — but the default is one proposal, not a list to browse.
- Don't soften "waiting on him" into something that sounds like it's in progress.

Hebrew, like the rest of the project's user-facing text.
