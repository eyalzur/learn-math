# Content rules

The questions are reviewed by a human who reads them one at a time. That review is
expensive and it is the only real quality signal this project has, so it must not
evaporate the moment the comment is addressed.

**The default response to a content comment is a rule, not a fix.** A person finds *a
case*; a rule finds *every case*. Fixing in place is the fallback, taken deliberately.

This is not a theory. Three analogies were reported where someone ate stamps and
stickers. Writing a rule that looked for the pattern instead of editing three lines turned
up **four more**, in a different topic, that nobody had seen. Moving the explanation checks
off the screen and onto the data found four steps rendering backwards the same day.

## Where the rules live

`tests/e2e/content.spec.ts`. One list, `RULES`, of `{ name, check }` — `check` takes a
question and returns a sentence saying what's wrong, or `null`.

```ts
{
  name: "does not have anyone eating something inedible",
  check: (q) => {
    const analogy = explainQuestion(q)!.analogy;
    return INEDIBLE.test(analogy) ? `something inedible is eaten — "${analogy}"` : null;
  },
},
```

Adding a rule is adding an entry. One test runs every rule over every question and reports
**all** violations together, so a new rule shows you all twelve places it catches at once
rather than one per run.

Rules about the **collection** rather than a single question — analogy uniqueness, how many
questions a level holds — stay separate tests. They don't fit the signature and forcing
them in would bend it out of shape.

## When a comment becomes a rule

**The test: can the comment be described without naming a particular question?** If yes,
it's a pattern and it belongs in `RULES`.

| Comment | Rule? | Why |
|---|---|---|
| "people are eating stamps and stickers" | **yes** | pattern: an eating verb on an inedible object |
| "a hint that just repeats the question doesn't help" | **yes** | pattern: a hint containing the prompt verbatim |
| "the analogy in `m3` doesn't land for a child that age" | **no** | judgement about one case |
| "this question is boring" | **no** | there is no pattern to describe |

A comment that stays a one-off **is not a failure of this process** — it is simply not that
kind of comment. Fix it in place and move on. A rules file that tries to encode taste
becomes noise nobody reads, and starts failing on legitimate changes.

## Writing one

1. **Start from the wording of the comment**, not from the question that triggered it. "the
   hint gives away the answer" is the rule; `g1-addsub20-h7` is the example.
2. **Run it before believing it.** Nearly every rule written here caught something on the
   first run — that is the point — but two of them were also *wrong* on the first run.
3. **Say which question and what about it.** `${q.id} — <what is wrong>`. A failure that
   only says a rule broke sends the reader hunting through 330 questions.
4. **Prefer a narrow rule that is right** to a broad one that needs exceptions. A rule with
   a list of exemptions is a rule that will be deleted the next time it complains.

## When a rule fires on content that is fine

**Fix the rule, not the content.** This happened twice on the day the rules were written:
the hint rule flagged `18 − 9 = 9` for containing the answer, when the `9` in question was
the subtrahend, already on screen. Rewriting the hint to satisfy a wrong rule would have
made the hint worse and left the rule wrong for next time.

Loosening a rule to get to green is only right when the rule is genuinely wrong. When it is
right and the content is wrong, fix **everything it caught**, in the same pull request.

## The rules only matter because they run

`.github/workflows/tests.yml` runs the build, the lint and the whole test suite on every
pull request and on every push to `main`. Before it existed, the tests ran when someone
remembered — which is the same failure mode as the documentation that went stale, and just
as invisible.

Making a failing check actually *block* a merge is a repository setting, not a file here —
see the branch-protection note in `git-workflow.md`. Both **check** and **test** belong in
that list.
