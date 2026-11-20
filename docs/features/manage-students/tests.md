# ניהול משתמשים דינמי — Tests

## Coverage

New `tests/e2e/manage-students.spec.ts` (10 tests), mapped to
`product-spec.md`'s Acceptance Criteria:

- "fresh profile has no users, clear way to create one" → `a fresh profile shows only
  the add-student card, not an empty or broken screen`
- "creating requires a non-empty name" → `create is disabled until a name is entered,
  and still disabled for whitespace only`
- "new user appears immediately, not auto-selected" → `creating a student adds them to
  the list without selecting them`
- "cancel creates nobody" → `cancelling the create dialog adds nobody`
- "no limit on how many users" → `any number of students can be created`
- "delete requires explicit confirmation naming the student" → `deleting requires
  confirmation that names the student, and cancelling keeps them`
- "delete removes the user" → `confirming deletion removes the student from the list`
- "delete removes saved progress/history too, irreversibly" → `deleting a student
  deletes their saved progress — a new student with the same name starts with none`
- "any-grade practice keeps working for a new user" → `a newly created student can
  still practise in any grade, not just their usual one`
- "choices persist across a reload" → `the roster survives a reload`

A new shared helper, `tests/e2e/helpers/selectStudent.ts`'s
`createAndSelectStudent(page, gradeId?, name?)`, creates a fresh student through the
real create-dialog and selects them — every other spec file in the suite that used to
assume a pre-seeded מיקה/רותם/עומר now uses this instead, since the roster starts empty
by design (see product-spec.md's migration decision). 30 existing files were updated to
use it; two (`students-and-syllabus.spec.ts`, `any-grade-any-student.spec.ts`) had one
test each whose premise was a fixed, pre-seeded three-student roster — those were rewritten
to cover what's still true (a created student's card renders correctly; no grade shows
before selection) rather than left asserting something now false by design.

## How to run
`npm run test:e2e`

## Status
323/324 passing as of 2026-11-20, single clean run (verified independently twice — once
by the implementing pass, once as a fresh rerun). The one failure
(`grade8-angles-congruence.spec.ts`'s "straight-angle completion, triangle angle sum,
exterior angle, and parallel lines" test) is the pre-existing, already-tracked flake
(see that feature's own `status.md` and `CLAUDE.md`'s "מה פתוח") — confirmed unrelated:
it fails on a different assertion each run, and neither it nor any file it depends on is
part of this feature's diff.
