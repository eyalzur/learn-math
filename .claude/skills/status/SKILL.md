---
name: status
description: Gives the user a short project status at the start of a session — every open piece of work and which stage it has reached (idea with no product spec, spec but no design, designed but not built, built and waiting for review, waiting to merge), plus what is blocked on the user rather than on Claude. Use when the user asks "what's the status", "what's open", "where did we leave off", "מה הסטטוס", "מה פתוח", or opens a session wanting to know what to pick up. Do not use for the status of one specific feature — read that feature's docs/features/<slug>/status.md directly.
---

# Status

You are giving a **non-programmer** a picture of his own project in under a minute of
reading. He needs to decide what to do next; he does not need a report.

## 1. Gather the facts

```bash
node scripts/status.mjs
```

That prints every feature's phase checklist from `docs/features/*/status.md`, the open
work in `CLAUDE.md` that never entered the pipeline, the open pull requests, and the git
state. **Read it rather than remembering** — a status assembled from memory is exactly the
one that goes stale.

If something in the output contradicts what you believe, the output is right.

## 2. Sort each open item into one stage

The five-phase pipeline already records this. `x----` means a spec exists and nothing
else; `xxx--` means it is planned down to the architecture and nobody has written code.

| Stage | What it means | What unblocks it |
|---|---|---|
| **רעיון** | Written down in `CLAUDE.md`, no folder in `docs/features/` | `/feature` — or a product decision from the user first |
| **ספק** `x----` | What and why decided; no screens | `/designer` |
| **עיצוב** `xx---` | Screens and copy decided; no technical plan | `/tech-lead` |
| **מוכן לפיתוח** `xxx--` | Fully planned, nobody has written code | `/developer` |
| **נבנה, בלי בדיקות** `xxxx-` | Code exists, unverified | `/qa` |
| **ממתין לריוויו** `xxxxx` + open PR | Done and green; the user has not looked | **the user** |
| **ממתין למיזוג** | Reviewed and approved | **the user** |

A feature whose five boxes are checked and whose PR is merged is **done** — leave it out
entirely. The status is about what is open, not a catalogue.

## 3. Write it — and keep it short

The user asked for `בקצרה`. That is a constraint, not a preference.

**One table.** One line per open item: what it is, which stage, what unblocks it. No
paragraphs explaining features he already knows about — he wrote the requests.

**Then a separate, short list: what is waiting on him.** This is the most useful part of
the whole thing, because it is the only part he can act on. Reviews, decisions you asked
for and never got an answer to, and things only he can do (cloud accounts, API keys,
repository settings).

**Then one line: what you would pick up next, and why.** A recommendation, not a menu.

Hebrew, like the rest of the project's user-facing text.

### What not to do

- **Do not list finished features.** Sixteen green rows push the two live ones off the
  screen.
- **Do not repeat the reasoning behind a decision.** It is in the feature's docs; link the
  slug if he wants it.
- **Do not run the test suite** unless the user asks. It takes minutes, and the status is
  about where work stands, not whether it passes today.
- **Do not soften a blocked item into an in-progress one.** "Waiting for a decision from
  you since Tuesday" is the information.

## 4. Anything genuinely ambiguous

If an item's stage cannot be read off the docs — a `status.md` that disagrees with itself,
or an idea in `CLAUDE.md` too vague to place — say so in one line under the table rather
than guessing a stage for it. A status that quietly invents a stage is worse than one that
admits a gap, because he will plan around it.
