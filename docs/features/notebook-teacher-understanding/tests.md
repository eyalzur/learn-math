# המורה מבינה מה נכתב בדף — Tests

## Coverage

Acceptance criteria (`product-spec.md`) → test (`tests/e2e/notebook-teacher-understanding.spec.ts`
unless noted):

- "לחיצה על 'שלח למורה' מציגה... תיאור קצר... שני אלה מובחנים בבירור" →
  `a clear reading shows what was written and the answer as two distinguished, unjudged lines`
- "אין בתשובה שום קביעה על נכון/שגוי" → same test (forbidden-word check on the dialog text)
- "כשהמורה אינה בטוחה... אומרת זאת בפירוש" →
  `an uncertain reading says so plainly instead of guessing, and offers no read-aloud button`
- "לחיצה על 'שלח למורה' נשארת פעולה יזומה במפורש" →
  `sending only happens on an explicit click — opening the notebook or drawing on it never triggers it on its own`
- "זמן ההמתנה מוגבל וברור... שגיאה ברורה... שאר המחברת ממשיכה לעבוד" → the loading-label
  and toolbar-stays-usable half moved to `tests/e2e/notebook-server-relay.spec.ts` (`while
  sending, the button shows a loading label...` — unchanged by this feature, just the wire
  format underneath it); the failure-path half is
  `a failed call to the teacher shows the same generic error as any other communication failure, and the rest of the notebook keeps working`
- "אין מפתח או סוד Anthropic בקוד הלקוח" →
  `tests/e2e/notebook-server-relay.spec.ts` › `no client-side code talks to Anthropic/Claude directly — that stays server-only`
  (this check already lived in that file before this feature gave it a real reason to matter)
- "שום מחרוזת שהתלמיד/ה רואה אינה משתמשת במונח תשתית" → not a separate test; every new
  string this feature shows is asserted verbatim across the tests above, which is a
  stricter guarantee than a generic word-blocklist scan
- read-aloud (designer's own addition, not in product-spec.md's acceptance criteria, but a
  real behavior the app now has) →
  `reading it aloud speaks what the teacher understood, and toggles like every other speak button in the app`
  and `with no speech engine, there is no read-aloud button at all`

**Not covered by e2e, and can't be** — see the file's own header comment:
- "התיאור נאמן למה שבאמת נכתב בדף" — a promise about what Claude actually does when
  reading a real page. Every test here mocks `/read-page`, which proves the client displays
  exactly what the server said and nothing more — it cannot prove the server's own reading
  was faithful. That half needs a real page and a real Claude call, which is exactly what
  this suite must never do (see below).

## Why every test mocks the server

`/read-page` makes a real, paid call to Claude when it actually runs. Letting Playwright
hit a real deployment would mean every CI run spends real money and gets a
non-deterministic answer back — the opposite of a repeatable test. `playwright.config.ts`
already points `VITE_NOTEBOOK_SERVER_URL` at a fixed, unresolvable host for the whole
suite (set up for `notebook-server-relay`, reused here unchanged), so every test in this
file intercepts `**/read-page` with `page.route` and controls the response directly — no
network call, paid or otherwise, is ever attempted.

## How to run
`npm run test:e2e`

## Status
Full suite (`npm run build && npm run lint && npm run test:e2e`), single clean run,
2026-08-30: **305/305 pass** (build and lint clean too). Two rounds of fixes during
writing, both in the tests themselves, not the implementation:
- The Anthropic/Claude boundary check inherited from `notebook-server-relay.spec.ts`
  originally forbade the word "claude" anywhere in client code — that flagged
  `notebookServer.ts`'s own doc comment (which legitimately names "Claude" when
  describing what the teacher is). Narrowed to what the acceptance criterion actually
  cares about: no `@anthropic-ai/sdk` import or direct call to `api.anthropic.com` from
  client code — not the word itself.
- The read-aloud tests initially called `stubSpeech`/`stubNoSpeech` after a shared
  `beforeEach` had already navigated the page — too late for `addInitScript` to take
  effect. Fixed by dropping the shared `beforeEach` and having each test that needs a
  speech stub register it before its own navigation, matching how
  `read-aloud-questions.spec.ts` already does this.
