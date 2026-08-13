# Git workflow for the feature pipeline

Nothing reaches `main` by a direct push. Every feature or fix lives on its own branch and
merges through a pull request, so there's always a reviewable diff — docs and code
together — before it goes live. Remember `main` auto-deploys to
https://eyalzur.github.io/learn-math/ , so a direct push to `main` is a push straight to
production with nobody having looked at it.

## Branch naming

- New capability → `feature/<slug>`
- Fixing broken behavior → `fix/<slug>`

Same `<slug>` as the feature's folder under `docs/features/`, so the branch, the docs, and
the PR are obviously the same piece of work.

## Starting work

Always branch from the current `origin/main`, never from whatever happens to be checked
out — otherwise you inherit unrelated in-flight work into your PR:

```bash
git fetch origin main
git checkout -B feature/<slug> origin/main
```

If you're picking up a feature that already has a branch (e.g. a later phase, or a second
pass after review), check it out and pull instead of recreating it:

```bash
git checkout feature/<slug> && git pull origin feature/<slug>
```

Before creating anything, check where you already are — `git branch --show-current`. If
you're already on the right branch for this slug, just keep working on it.

## Committing

Each phase commits its own artifact when it finishes, so the PR's history reads as the
story of the feature (spec → design → architecture → code → tests) rather than one
undifferentiated blob:

```bash
git add <the files this phase touched>
git commit -m "<short description of this phase's contribution>"
```

Commit only what your phase actually produced — the doc you wrote plus, for `developer`,
the code, and for `qa`, the tests. Don't sweep unrelated modified files into your commit.

## Raising the version number

The app shows its version on the first screen, and the number lives in `package.json` —
the only place it's written down. Any change that touches `src/`, `public/` or
`index.html` has to raise it, in the same commit as the change itself:

```bash
npm run bump:feature   # new capability  — middle + 1, minor back to 0
npm run bump:fix       # fixing behavior — minor + 1
```

`major` is never raised by a script. It's a deliberate decision, edited by hand.

Which one you run follows the branch you're on: `feature/<slug>` → `bump:feature`,
`fix/<slug>` → `bump:fix`. A PR that changes the app without a matching bump fails the
**Version bump check** workflow, so this isn't something to remember so much as something
you'll be told about. Docs-only changes are exempt and skip the check — raising the number
for a documentation edit would announce an app change that never happened.

### Check that the check actually ran

The workflow prints the commit it looked at, on its first line:

```
checking feature/my-thing @ ea86e09 against origin/main
```

Compare that short SHA against the head the PR shows. They should match. If a run is
missing entirely, or reports an older commit — this happened once after a rebase — the
result on screen is describing code that is not the code about to merge. Re-run it from
the **Actions** tab: *Version bump check* → *Run workflow* → enter the PR number.

**A PR with no checks at all looks exactly like a PR whose checks passed.** GitHub shows
nothing in both cases and the merge button is equally available, which is why the SHA line
above is worth a glance before merging.

The only thing that turns a missing run into a blocked merge is a repository setting, not
a file in this repo:

> **Settings → Branches → Add branch ruleset** (or *Add rule*) for `main` →
> tick **Require status checks to pass** → search for and select **check** →
> save.

Once that is on, a pull request cannot be merged while the check is absent or failing.
Until then, the workflow reduces how often the gap happens and makes it visible — it does
not close it.

## Opening the PR

Only the last phase (`qa`, or the `feature` orchestrator after it) opens the PR, once the
build, lint, and e2e tests are all green. Push the branch and open it against `main`:

```bash
git push -u origin feature/<slug>
```

PR title: the feature name in plain language. PR body: a short summary of what changed and
why, a link to `docs/features/<slug>/status.md` for the full trail, and the test status.

Then **stop**. Don't merge it yourself, and don't enable auto-merge. A human reads the PR
and merges when they're happy — that review point is the reason the PR exists, and
merging on their behalf quietly removes it. Tell the user the PR is open and hand them the
link.

## If the PR needs another pass

Review comments or a failing check mean more commits on the same branch — never a new
branch and never a new PR for the same feature. Push to the existing branch and the PR
updates itself.
