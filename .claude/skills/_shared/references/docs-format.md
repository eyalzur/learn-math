# Shared doc formats for the feature pipeline

Every role skill (`product-manager`, `designer`, `tech-lead`, `developer`, `qa`) and the
`feature` orchestrator read and write these two files the same way. Keeping the format
identical across skills is what lets a human open any feature folder and immediately
understand it, so don't improvise a different layout.

## `docs/features/<slug>/status.md`

The single glanceable summary of a feature. Whichever phase you just ran, update this file
before you finish — create it if it doesn't exist yet (this happens when a role skill is
run standalone, before `feature` or `product-manager` has touched this slug).

Template:

```markdown
# <Feature name — a few words, not the full request>

<One sentence: what this feature does and why.>

## Progress
- [ ] Product spec — product-manager — not started
- [ ] Design — designer — not started
- [ ] Architecture — tech-lead — not started
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** product-manager
**Branch:** `feature/<slug>`
**PR:** not opened yet

## Open questions / blockers
None.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
```

When you finish your phase:
- Check the box (`[x]`) for your phase and replace "not started" with today's date.
- Leave **Branch** and **PR** alone unless you're the one who created the branch or opened
  the PR — whoever does that fills in the line (the PR line becomes the PR's URL).
- Set **Current phase** to the next phase name in the sequence (product-manager → designer →
  tech-lead → developer → qa), unless you hit a blocking open question — in that case leave
  **Current phase** as your own phase and change the line to
  `**Current phase:** <your phase> — blocked, see Open questions below`.
- Rewrite the **Open questions / blockers** section as a flat bulleted list, one line per
  question, prefixed with the phase it came from, e.g. `- **Design:** should the timer show
  seconds or minutes:seconds?`. Pull this from the Open Questions section of the doc you just
  wrote. Don't delete earlier phases' entries unless you know they're resolved — if in doubt,
  leave them. If there are truly none across every doc, write `None.`

## `docs/features/README.md`

The index across all features, so a human can see everything at a glance without opening
each folder. Create it if missing:

```markdown
# Features

| Feature | Status | Details |
|---|---|---|
```

Each phase upserts (adds or updates) the one row for its slug:

```markdown
| <Feature name> | <emoji> <short phrase> | [status](./<slug>/status.md) |
```

Status emoji: 🟢 done (all 5 phases complete, QA green), 🟡 in progress, 🔴 blocked (open
question needs a human). The "short phrase" should match status.md's Current phase line in
spirit, e.g. "🟡 in design" or "🔴 blocked on product decision".

If a row for this slug already exists, replace it in place — don't duplicate rows.
