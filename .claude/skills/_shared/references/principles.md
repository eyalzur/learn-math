# Shared principles for the feature pipeline skills

## Read from disk, not from memory

Always re-read the prerequisite docs from disk before starting your phase, even if you
were just talking about this feature a moment ago. Conversations get compacted and
summarized; the files on disk are the source of truth. This also makes each skill work
correctly whether it's invoked by a human directly or chained by the `feature` orchestrator.

## Don't guess past a blocker

Each phase depends on real decisions made in the phase(s) before it. If something you need
is genuinely missing or ambiguous — not a matter of taste you can reasonably decide
yourself, but something that changes what gets built — don't invent an answer to keep
moving. Write it into your doc's Open Questions section, reflect it in status.md (see
`docs-format.md`), and say so plainly in your response so a human sees it. A shorter, honest
doc with a real open question beats a complete-looking one built on a guess — the whole
point of this pipeline is that a human can trust what's written without re-deriving it.

Judgment calls that don't change behavior (e.g. exact wording of an internal doc heading)
are fine to just make. The bar is: would getting this wrong mean building the wrong thing?

## Standalone vs. pipeline

Every role skill must work whether a human invokes it directly (e.g. someone runs
`/designer` to revise just the UX for an existing feature) or it's invoked as one step of
`/feature`. Concretely: always figure out the slug and folder from context or by asking,
always re-read prerequisites from disk rather than assuming they were just produced in this
same conversation, and always update status.md and the features README yourself — don't
rely on the orchestrator to do that bookkeeping for you.

## Stay in your lane

- `product-manager` decides *what and why* — never UI details or file names.
- `designer` decides *how it looks and flows* — never which components/files implement it.
- `tech-lead` decides *how it's built* — never invents new product requirements or redesigns
  the UX; if the design doesn't cover something the architecture needs, that's an open
  question back to design, not a free decision.
- `developer` implements *exactly* what architecture/design/product-spec say — if you hit a
  real gap in the plan, treat it like any other blocker rather than quietly deciding
  architecture on the fly.
- `qa` writes tests against the *spec*, not the implementation — see qa's own SKILL.md for
  why this matters.
