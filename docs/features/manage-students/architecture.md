# ניהול משתמשים דינמי — Architecture

## Overview
`curriculum.ts`'s hardcoded `students: Student[]` constant is replaced by a new
storage-abstraction module, `src/data/userStore.ts`, whose public surface is
`Promise`-returning from day one — even though its only implementation today is
synchronous `localStorage` — so a future server-backed implementation can replace the
internals later without touching any caller. `App.tsx` becomes the single owner of the
roster (`students: Student[]` state, loaded once via the store), passed down to
`StudentPicker` as data + callbacks rather than the picker fetching its own copy.
`progress.ts` and `adaptiveProgress.ts` keep their existing shape and gain one new
export each, `clearStudent(studentId)`, so deletion can wipe a student's saved data
from both without either module changing its existing read/write API.

## Affected Files / Components

- **`src/data/userStore.ts` (new)** — the abstraction layer: `UserStore` interface
  (`list`, `create`, `remove`, all `Promise`-returning) plus the one concrete
  implementation today (`localStorageUserStore`) and the exported singleton
  (`userStore`) every caller uses. Imports `type { Student }` from `./curriculum` — the
  type itself doesn't move, only the array that used to populate it.
- **`src/data/curriculum.ts`** — remove the `students: Student[]` constant and its
  export. `export interface Student { ... }` **stays exactly where it is** — three
  other files already import the type from here (`App.tsx`, `History.tsx`,
  `StudentPicker.tsx`); moving it would touch all three for no behavioral reason.
  Nothing else in this file changes (grades/topics/`gradeById` etc. are untouched).
- **`src/data/progress.ts`** — add `clearStudent(studentId: string): void`: reads all
  records, filters out every one whose `studentId` matches, writes the rest back under
  the same `"learn-math:history"` key. Same try/catch-and-ignore guard as every other
  function here.
- **`src/data/adaptiveProgress.ts`** — add `clearStudent(studentId: string): void`:
  reads the full `Record<string, number>`, deletes every key whose `studentId:` prefix
  (the part before the first `:`, per `keyFor`) matches, writes the rest back under
  `"learn-math:adaptive-tier"`.
- **`src/components/StudentPicker.tsx`** — rewritten to take `students: Student[]`,
  `onCreate: (name: string, gradeId: string) => void`, `onDelete: (id: string) => void`
  as props instead of importing the static array. Renders `[...students, <AddCard>]`.
  Each existing card gets a small `🗑` button that opens the delete dialog instead of
  calling `onSelect`. Hosts both new dialogs' open/closed state locally (they're pure UI
  state, not data the rest of the app needs).
- **`src/components/CreateStudentDialog.tsx` (new)** — overlay+card modal, same
  structural pattern as `VersionLog.tsx` (`role="dialog"`, `aria-modal`, backdrop click
  closes, inner click `stopPropagation`s). Name text input, grade selection reusing the
  same grade-button markup/classes `GradePicker.tsx` already uses (check its JSX before
  writing this — reuse the classnames, don't reinvent them). Calls `onCreate(name,
  gradeId)` and closes itself.
- **`src/components/DeleteStudentDialog.tsx` (new)** — overlay+card modal, same pattern.
  Takes the target `Student` as a prop (so it can read the name for its title), calls
  `onConfirm()` on the delete button.
- **`src/App.tsx`** —
  - Drops `import { students } from "./data/curriculum"`.
  - Adds `const [students, setStudents] = useState<Student[]>([])`.
  - `loadStudent()`'s job (resolve the remembered id against the roster) moves into a
    `useEffect` on mount: `userStore.list().then((list) => { setStudents(list);
    const remembered = localStorage.getItem(STORAGE_KEY); setSelectedStudent(list.find(s
    => s.id === remembered) ?? null); })`. The existing synchronous `loadStudent()`
    helper and its use as a `useState` initializer are removed — a `Promise`-based store
    can't be read synchronously at init, which is exactly the constraint that makes this
    abstraction honest (see Technical Approach).
  - Adds `handleCreateStudent`/`handleDeleteStudent`, calling `userStore.create`/
    `userStore.remove` and updating `students` state from the resolved result (see
    Technical Approach) — `handleDeleteStudent` also calls `clearStudent(id)` on both
    `progress.ts` and `adaptiveProgress.ts`.
  - Passes `students`, `onCreate={handleCreateStudent}`, `onDelete={handleDeleteStudent}`
    to `<StudentPicker>` instead of nothing (it reads the module-level constant today).
- **`tests/e2e/helpers/*`** — any e2e helper that currently relies on `students` always
  containing exactly mika/rotem/omer on a fresh profile needs to create those students
  through the UI first (see `qa`'s job — flagged here only so `developer` doesn't delete
  a helper that `qa` still needs updated, not removed).

## Data / State Changes

```ts
// src/data/userStore.ts
export interface UserStore {
  list(): Promise<Student[]>;
  create(name: string, gradeId: string): Promise<Student>;
  remove(id: string): Promise<void>;
}
```

No change to `Student` itself (`{ id: string; name: string; gradeId: string }`, already
in `curriculum.ts`). No change to `PracticeRecord` (`progress.ts`) or the adaptive-tier
record shape (`adaptiveProgress.ts`) — both already key by a free-form `studentId`
string, which is exactly why this feature barely touches them.

New `localStorage` key: `"learn-math:users"` (the roster itself, JSON array of
`Student`) — separate from `"learn-math:student"` (App.tsx's existing "who was last
selected" pointer, unchanged) and `"learn-math:history"` / `"learn-math:adaptive-tier"`
(unchanged, just gain the one cleanup function each).

## Technical Approach

**Why `Promise`-returning today, with only a synchronous implementation behind it:** the
user was explicit that storage moves server-side later and that today's code shouldn't
need a rewrite when that happens. A network call cannot be synchronous, so any caller
written against a synchronous `list()`/`create()`/`remove()` would have to be rewritten
the day a server-backed store arrives — the exact rewrite the user is asking to avoid.
Making the interface `Promise`-based now, even though `localStorageUserStore`'s
implementation just does `Promise.resolve(JSON.parse(...))` internally, means every
caller (`App.tsx`) already handles the "this might take a moment" case, so swapping
`userStore`'s assignment to a `fetch`-based implementation later is the *only* change
required — no caller touches this file.

```ts
// src/data/userStore.ts — shape, not full code
const STORAGE_KEY = "learn-math:users";

function readAll(): Student[] { /* same try/catch-and-default-to-[] as progress.ts */ }
function writeAll(list: Student[]): void { /* same try/catch-and-ignore */ }

export const localStorageUserStore: UserStore = {
  list: () => Promise.resolve(readAll()),
  create: (name, gradeId) => {
    const student: Student = { id: crypto.randomUUID(), name, gradeId };
    writeAll([...readAll(), student]);
    return Promise.resolve(student);
  },
  remove: (id) => {
    writeAll(readAll().filter((s) => s.id !== id));
    return Promise.resolve();
  },
};

export const userStore: UserStore = localStorageUserStore;
```

`crypto.randomUUID()` — available in every current evergreen browser this app already
targets (same assumption the rest of the app already makes; this is a personal app for
three specific, known children, not a public product needing legacy-browser fallbacks).
No collision handling needed beyond what a UUID already gives.

**Delete orchestration lives in `App.tsx`, not inside `userStore.remove()`:**
`userStore` only owns the roster. Progress and adaptive-tier data are separate existing
modules with their own storage keys, so `handleDeleteStudent` in `App.tsx` calls three
things in sequence — `userStore.remove(id)`, `clearStudentProgress(id)` (new export
from `progress.ts`), `clearStudentAdaptiveTiers(id)` (new export from
`adaptiveProgress.ts`) — rather than teaching the roster store about two unrelated
modules' storage formats. This keeps each module answering only for its own key, same
as today.

**Grade-selection control in `CreateStudentDialog`:** reuses `GradePicker.tsx`'s
existing per-grade button markup (check its actual JSX/classnames before writing this —
`developer`'s job to copy correctly, not re-derive from this doc) so the "choose a
grade" interaction looks identical to the one the app already uses elsewhere, rather
than inventing a second grade-selection visual language.

## Edge Cases

- **Deleting the currently-remembered student while on the picker screen** (reachable
  via the existing "החלף תלמיד ←" link without first clearing the remembered id): after
  delete, `"learn-math:student"` still holds the now-stale id. This is already handled
  for free — next app load, `list.find(s => s.id === remembered)` returns `undefined`,
  `selectedStudent` becomes `null`, and the picker shows with no crash. No special
  handling needed beyond what the existing `?? null` pattern already does.
- **Deleting a student whose name matches another student's name exactly** — fine by
  construction: identity is `id` (a UUID), never `name`. Two students can share a
  display name without any ambiguity in delete/select.
- **Empty roster on first load of this version** — `students` starts as `[]` (not
  pre-seeded; see product-spec's explicit "no migration" decision), so
  `StudentPicker` renders with only the add-card. No special-cased empty-state branch
  needed — this falls out of `[...students, addCard]` naturally.
- **Create dialog submitted with only whitespace in the name field** — trim before the
  non-empty check (`name.trim().length > 0`), both for enabling the create button and
  for the value actually saved, so a name of all spaces can't create an unlabeled card.
- **Brief loading moment between app mount and the roster resolving** — with
  `localStorage` this resolves on the same microtask, so there's nothing to visually
  design for today, but the code must not assume `students` is populated synchronously
  on first render (see `App.tsx` changes above) — rendering `StudentPicker` with an
  empty `students` array for one tick before the real list arrives is acceptable and
  matches how `[]` already renders (just the add-card), so no separate loading spinner
  is needed.
- **`"learn-math:menu-position"` (per-student last-menu-position) is not cleaned up on
  delete** — deliberate: product-spec only requires progress/history to be deleted with
  the student. A leftover menu-position entry for a deleted id is inert (never read
  again, since nothing can select that id anymore) and cleaning every incidental
  localStorage key that ever mentioned a student id is disproportionate to what was
  asked. If this becomes an actual problem (e.g. storage quota on a very long-lived
  device), that's a separate, narrow future fix.

## Risks / Tradeoffs

- **`progress.ts` and `adaptiveProgress.ts` are deliberately NOT moved behind the same
  `Promise`-based abstraction in this pass**, even though the user's stated motivation
  (storage moving server-side) applies to them just as much as to the roster. Doing so
  now would mean converting every existing synchronous call site of `historyFor`,
  `statsByTopic`, `statsByDifficulty`, `loadAdaptiveTier` (used directly in render paths
  across `History.tsx`, `Practice.tsx`, `App.tsx`) to handle async data — a much larger,
  riskier refactor than this feature's actual scope (create/delete UI + per-user
  isolation, which already works today via the free-form `studentId` parameter). Treated
  as a reasonable future follow-up once/if the server-backed store is actually being
  built, not a gap in this feature.
- **No id reuse / no undo on delete** — matches product-spec exactly ("אין דרך לשחזר").
  Worth stating plainly since it's irreversible by design, not an oversight.
- **`userStore`'s localStorage implementation has no migration path from the old
  hardcoded `students` constant** — also matches product-spec's explicit decision (no
  auto-seeding of מיקה/רותם/עומר). Their old progress/adaptive-tier records remain in
  `localStorage` under the old literal ids, inert and harmless, until someone manually
  clears storage or a future feature addresses it.

## Open Questions
None.

## Implementation Notes

Built essentially as planned, with one mechanical extension of the plan's shape:

- The plan's `App.tsx` code sketch showed `loadStudent()`'s job moving into a single
  `useEffect`. In the real file, `student`, `gradeId`, and `screen` each had their own
  `useState(() => loadStudent() ...)` initializer (three separate synchronous reads, not
  one) — all three now start at their "nothing yet" value (`null`/`null`/`{name:"home"}`)
  and are set together inside the one effect once `userStore.list()` resolves. Same
  outcome the architecture doc described, just applied to all three pieces of initial
  state it hadn't enumerated individually.
- `clearStudent` is the exported name in both `progress.ts` and `adaptiveProgress.ts`
  (matching "Affected Files"), imported into `App.tsx` under aliases
  (`clearStudentProgress`, `clearStudentAdaptiveTiers`) so the two calls at the delete
  site read unambiguously — "Technical Approach"'s prose used those longer names only
  for the narrative, not as a second proposed export name.
- `CreateStudentDialog` defaults the grade selector to `grades[0]` and reuses
  `GradePicker`'s exact card markup/classnames, with a new `.grade-card-selected`
  modifier (not needed by `GradePicker` itself, which never shows a persistent
  selection) and a dialog-scoped size override (`.create-student-grade-list .grade-card`)
  so four cards fit a 420px-wide dialog instead of the full-page `.grade-list` layout.
- The trash icon could not be nested inside the student's own `<button>` (invalid
  HTML), so `StudentPicker` wraps each card in a `.student-card-wrap` div and positions
  `.student-card-delete` as its sibling, absolutely placed over the card's corner.

Verified live (empty state → create "דנה" into כיתה ו׳ → appears unselected, as
designed → select her → any-grade choice still offered, unaffected → back → delete her
via the trash icon → confirmation names her and warns about progress loss → confirms →
back to empty state) with zero console errors throughout.

`npm run build` and `npm run lint` both clean. Version bumped 1.45.1 → 1.46.0
(`npm run bump:feature`), changelog entry added in the same commit.
