---
name: merge-pr
description: Merges a PR the user has explicitly approved, and keeps the project's own bookkeeping honest while doing it — the feature's docs/features/<slug>/status.md, the docs/features/README.md row, and (when the PR was tracked there instead of in the pipeline) CLAUDE.md's "מה פתוח" table all get updated to say "done — מוזג" in the SAME commit that merges, not as an afterthought. Use this whenever about to merge a PR — after the user's explicit approval, never before it. Do not call the GitHub merge tool directly without running this first.
---

# Merge PR

You merge PRs constantly in this project, and every single time the docs quietly go
stale the moment the merge lands — `status.md` still says "not opened yet", the
`README.md` row still says "ממתין ל-PR", days or weeks after the PR is gone. Nothing in
the five-phase pipeline (`product-manager` → `designer` → `tech-lead` → `developer` →
`qa`) owns this step, because none of those phases are the one doing the merge. This
skill is that missing step.

**Never skip this to save a round-trip.** The whole point is that the doc update lands
in the exact commit that makes it true, not in a separate cleanup pass discovered weeks
later (see `docs/features/README.md`'s and multiple `status.md`'s history for exactly
how much staleness accumulates otherwise).

## 1. Confirm this is actually authorized

You need **explicit** approval for this specific PR from the user — see
`../_shared/references/principles.md` and the merge rule in `CLAUDE.md` ("לא ממזגים בלי
אישור מפורש"). "Looks good" about what the PR *does* is not automatically approval to
*merge* it — if there's any doubt which one you have, ask. Once you have it, proceed
without asking again for the same PR.

## 2. Verify it's actually ready

```bash
gh_pr_check_runs   # or the mcp__github__pull_request_read get_check_runs equivalent
```

Both `check` (version bump) and `test` (build/lint/e2e) must show `completed` /
`success`. If either is still running, wait for it — don't merge on a guess. If either
failed, this isn't a merge, it's a `developer` pass: diagnose and fix first.

Also check `mergeable_state`. If it's not `clean`, there's a conflict against the current
`main` — resolve it yourself (fetch, merge `origin/main` into the PR branch, fix
conflicts, rerun build/lint/test, push) before continuing. Never force through a conflict.

## 3. Update the doc trail — before you merge, not after

Still on the PR's branch (or push one more commit to it), update:

**`docs/features/<slug>/status.md`** — the feature this PR belongs to:
- `**Current phase:**` → `done — מוזג ל-\`main\`` (keep any test-count/build note
  already there, just add the merge fact)
- `**PR:**` → the PR's URL, with `— מוזג <today's date>` appended

**`docs/features/README.md`** — that feature's one row:
- Status cell → `🟢 done — מוזג ל-main` (or keep an existing more specific note, just
  make sure it no longer says "ממתין ל-PR" or "not opened yet")

**`CLAUDE.md`, section "מה פתוח"** — only if this PR is listed in the
"ממתין לריוויו ולמיזוג" table there (this happens for process/skill files that don't go
through the full pipeline, like `/status` or `review-ready` were). If it's listed:
- Remove its row from that table
- Add it to the current day's "מוזג היום (<date>)" line (create one if today doesn't
  have one yet), following the existing format of that section exactly

If the PR isn't tracked in `CLAUDE.md` at all (the normal case — it went through the
pipeline and only lives in its own `docs/features/<slug>/` folder), skip this part
entirely. Don't invent an entry for it there.

Commit these doc changes to the PR's branch:
```bash
git add docs/features/<slug>/status.md docs/features/README.md CLAUDE.md
git commit -m "Mark <slug> as merged in its docs"
git push
```

If this commit retriggers CI, wait for it green before merging (docs-only changes are
exempt from the version-bump check per `git-workflow.md`, so this is normally fast).

## 4. Merge

```
mcp__github__merge_pull_request(owner, repo, pullNumber, merge_method: "merge")
```

Then unsubscribe if you'd subscribed to PR activity for it, and confirm to the user that
it merged — a one-line confirmation, not a new review-ready ask (that was for before the
merge, not after).

## 5. If you're merging several PRs in one batch

Do them one at a time, each through steps 1–4 in full, oldest first when they might
touch overlapping files (so later merges see earlier ones already in `main` and Step 2's
conflict check catches anything real). Don't batch the doc commits — each PR's docs
commit belongs on that PR's own branch, not a shared one, or the bookkeeping stops
being traceable to the PR that earned it.
