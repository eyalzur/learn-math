# קושי מסתגל למיקה — שלב א׳ — Tests

## Coverage

Acceptance criteria (product-spec.md) → tests:

- שלושת הנושאים בנויים מטמפלייט, קושי מגיב בזמן אמת → `tests/e2e/content.spec.ts` ›
  "every generated חיבור עד 10 question passes every content rule…", "every generated
  חיסור עד 10 question passes every content rule…", "every generated חיסור עד 100
  question passes every content rule…" (200 samples/tier, all 3/3/5 tiers).
- בורר הרמות לא מוצג יותר, כניסה ישירה לתרגול → `tests/e2e/mika-adaptive-
  difficulty.spec.ts` › "`<topic>` skips the level picker and lands straight on a
  20-question practice" (שלושת הנושאים).
- קושי עולה עם הצלחה, יורד עם טעות → `tests/e2e/mika-adaptive-difficulty.spec.ts` ›
  "`<topic>`: a streak of correct answers reaches the hardest tier, a streak of wrong
  answers never does".
- כל תרגיל: שני רמזים + הסבר אמיתי אחרי טעות → `tests/e2e/mika-adaptive-
  difficulty.spec.ts` › "`<topic>`: a generated question still has two hints and shows a
  real explanation after a wrong answer".
- תרגילים משתנים בין סשנים → `tests/e2e/mika-adaptive-difficulty.spec.ts` ›
  "`<topic>`: questions vary between sessions, even at the same starting difficulty".
- `20` שאלות לתרגול → מכוסה בתוך אותם טסטים למעלה (`מתוך 20`).
- היסטוריה ממשיכה לתעד, בלי שם רמה → `tests/e2e/mika-adaptive-difficulty.spec.ts` ›
  "`<topic>`: history records the topic without a level suffix".
- ניסוח מתאים לקוראת מתחילה, שיטת הרמז=שיטת ההסבר → מכוסה על ידי `RULES` הגנריים
  ב-`content.spec.ts` (כולל "speaks a first-grader's Hebrew, not a textbook's" ל-grade
  1, ו-"keeps its hints to exactly two, without giving the answer away").
- יחיד/רבים נכון ("עשרה/עשרות", "יחידה/יחידות") ב-`sub100` → `content.spec.ts` ›
  שני הטסטים הקיימים על `generateAdd100Question` הורחבו לרוץ גם על
  `generateSub100Question`.
- רשומות היסטוריה ישנות (שם רמה) ממשיכות כפי שהן → ללא מיגרציה, ללא שינוי ב-`progress.ts`
  — לא נבדק ישירות (identical to the untouched mechanism `adaptive-difficulty.spec.ts`
  already covers for add100).
- כל נושא אחר ממשיך לעבוד → כל 261 הבדיקות בסוויטה, כולל כל הבדיקות הקיימות שתוקנו (ראו
  "Regressions found and fixed" למטה).

## How to run
`npm run test:e2e`

## Status
**268/268 עוברות** (2026-08-28), ריצה נקייה בודדת — אחרי מיזוג `main` (כולל PR #52,
מחברת תרגול) לתוך הבראנץ' לפני המיזוג הסופי (ראו "רגרסיה נוספת" למטה).

## רגרסיה נוספת שנמצאה בשילוב עם PR #52

מיזוג `main` (עם PR #52 שזה עתה מוזג) לתוך הבראנץ' הזה הביא איתו את
`tests/e2e/practice-notebook.spec.ts`, שה-`openLevel` הפרטי שלו נכנס דרך "חיבור עד 10"
ולוחץ `.level-card` — בדיוק הנושא שהפיצ'ר הזה הפך לאדפטיבי, וגם בדיוק הבאג שכבר תוקן
בקבצים אחרים (`countdown-next.spec.ts` וכו') לפני המיזוג. תוקן באותו אופן: הפתיחה
עוברת ל-"מספרים עד 20" (`.topic-card` הראשון) + `.style-card` הראשון, בדיוק כמו
ש-`countdown-next.spec.ts` כבר עושה ומתעד למה. `268/268` אחרי התיקון.

## באג תוכן אמיתי שנמצא ותוקן

`adaptiveSub100.ts`'s `borrowing()` template could produce a single-digit answer (e.g.
`46 − 38 = 8`) whenever `tensA − tensB` was exactly `1`. Hint 2 always names `unitsA` and
`unitsB` ("ליחידה `X` אין מספיק כדי להוריד `Y`") — both single digits — so when the
answer coincidentally equalled one of them, the content rule "keeps its hints to exactly
two, without giving the answer away" (rightly) failed. Fixed by requiring
`tensA − tensB ≥ 2`, which forces the answer's own tens digit to be at least `1` (i.e.
the answer is always ≥ `11`), making the coincidence structurally impossible instead of
just unlikely. Not a test relaxed to force green — the generator changed.

## רגרסיות שנמצאו ותוקנו (לא קשורות לתוכן החדש עצמו)

הפיכת `add10`/`sub10`/`sub100` לאדפטיביים חיסלה את הדרך האחרונה שנותרה באפליקציה
להגיע למסך "בחירת רמה" (`LevelPicker`) — כל נושא אחר בכל הכיתות כבר עבר לתרגול מסתגל
או לבחירת סגנון (PR #43/#48 לרותם/עומר; שאר נושאי מיקה הם רב-סגנוניים). כתוצאה מזה,
מסך בחירת הרמה **אינו נגיש יותר משום מסלול ניווט באתר החי** — לא נמחק קוד, פשוט
אין יותר כפתור שמוביל אליו. זה גילה `10` בדיקות קיימות שהניחו שנושא ספציפי של מיקה
(בעיקר `חיבור עד 10`) עדיין מציג רמות, ותוקנו:

- `content.spec.ts` — added the three new generators' own content-rule tests, and
  extended the two add100 singular/plural tests to also run against `sub100`.
- `countdown-next.spec.ts` — fixture switched from `חיבור עד 10` (now adaptive, and
  incompatible with this suite's "answer wrong, then replay the same questions" pattern
  since an adaptive retry generates fresh random numbers) to `מספרים עד 20` (style-based,
  still a fixed written list).
- `heading-wrap-balance.spec.ts` — "the level picker's heading balances" removed (screen
  unreachable; the underlying `text-wrap: balance` rule is global CSS, already proven by
  the other six heading tests); "the result screen's heading balances" fixture updated to
  skip the now-absent level click.
- `mika-grade2-content.spec.ts` — "grade ב׳'s topics run three levels…" rewritten to
  describe the current reality (both topics adaptive, no level screen); the LTR-direction
  test's fixture updated to skip the level click.
- `question-hints.spec.ts`, `read-aloud.spec.ts` — shared `openTopic`/`failFirstQuestion`
  helpers gained a third fallback (adaptive: land directly on practice) alongside their
  existing style/level branches.
- `students-and-syllabus.spec.ts` — "picking a level runs its ten questions…" renamed and
  updated to 20 questions, no level click; the LTR bare-expression test's fixture updated
  the same way.
- `style-lessons.spec.ts` — "a topic with one style is untouched…" and "every one of
  Mika's topics lands somewhere…" updated to accept the new third landing state (straight
  to practice); "leaving a level still returns to the levels" removed (unreachable).
- `topics-all-grades.spec.ts` — "grade 1 still practises ten questions per level"
  rewritten as a data-level check (reads `curriculum.ts` directly) instead of walking a
  UI path that no longer exists — the same move this file's own comment already
  describes doing for other criteria once review-status made walking the UI impossible.
- `topics-and-progress.spec.ts` — four tests: the topic-shows-its-levels assertion
  generalized to "leads somewhere to practise"; the three-levels-per-topic loop gained an
  adaptive branch; the topic-only-subtraction test dropped its level click; "history is
  newest first"'s fixed two-click back navigation made conditional (an adaptive topic
  needs only one "← חזרה" to reach the topics list, not two, since it skips the
  intermediate styles/levels screen the other topics still have).
- `adaptive-difficulty.spec.ts` — the "חיסור עד 100 … still shows three levels" test
  removed (this feature converted it too — the assertion is superseded, not broken).
- `clearer-explanations.spec.ts` — the shared `start()` helper gained a `null` pick
  mode for adaptive topics.

None of these are content or behavior regressions in the app — every fix updates a test's
fixture or assertion to match a real, intended change this feature (and the one before it)
made on purpose. No assertion was weakened to hide a real bug; where a real bug turned up
(`adaptiveSub100.ts`'s `borrowing()`), the generator was fixed instead.
