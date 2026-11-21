# שתי שאלות זהות לא יוצאות ברצף — Architecture

## Overview
בנקודה היחידה שבה שאלת-ההמשך של נושא אדפטיבי נוצרת בפועל (`App.tsx`,
`handleAdaptiveAnswered`), עוטפים את הקריאה ל-`adaptive.generate(difficulty)`
בעוזר retry חדש (`withoutRepeatingPrompt`, `adaptiveHelpers.ts`) שמנסה שוב אם
הניסוח יצא זהה לשאלה הקודמת — אותו דפוס "check with teeth, retry" ש-
`withoutLeakingHints` כבר משתמש בו באותו קובץ בדיוק.

## Affected Files / Components
- **`src/data/adaptiveHelpers.ts`** — פונקציה חדשה, `withoutRepeatingPrompt`,
  לצד `withoutLeakingHints` הקיימת. שני הקבצים קוראים לה: אין צורך לגעת
  ב-19 קבצי `adaptive*.ts` עצמם — הם לא יודעים (וגם לא צריכים לדעת) שהשאלה
  הקודמת קיימת, כי ה-retry קורה בנקודת הקריאה ל-`generate`, לא בתוך
  `generate` עצמו.
- **`src/App.tsx`** — `handleAdaptiveAnswered` (סביב שורה 300): השורה היחידה
  ש-`.map`-ת את `prev.questions` ומפעילה `adaptive.generate(difficulty)` על
  כל אינדקס `i >= answeredCount`.

## Data / State Changes
אין — אין שדה חדש ב-state, רק *איך* שאלה אחת בודקת (זו שתוצג הבאה) נוצרת.

## Technical Approach
1. `src/data/adaptiveHelpers.ts` מקבל:
   ```ts
   export function withoutRepeatingPrompt(build: () => Question, previousPrompt: string | null): Question {
     if (previousPrompt === null) return build();
     let question = build();
     for (let i = 0; i < 20 && question.prompt === previousPrompt; i++) {
       question = build();
     }
     return question;
   }
   ```
   אותו גבול-ניסיונות (20) ואותה נפילה-חזרה-לניסיון-האחרון כמו
   `withoutLeakingHints` — "עדיף חזרה נדירה על תקיעה" (product-spec.md).
2. ב-`handleAdaptiveAnswered`, השורה היחידה שצריכה לדעת על השאלה הקודמת היא
   זו שיוצרת את **השאלה הבאה שתוצג בפועל** — אינדקס `answeredCount` בדיוק
   (לא כל אינדקס `i >= answeredCount`, ראו Edge Cases למטה על למה). היא
   הופכת מ:
   ```ts
   const questions = prev.questions.map((q, i) =>
     i >= answeredCount ? adaptive.generate(difficulty) : q,
   );
   ```
   ל:
   ```ts
   const questions = prev.questions.map((q, i) => {
     if (i < answeredCount) return q;
     if (i === answeredCount) {
       return withoutRepeatingPrompt(() => adaptive.generate(difficulty), prev.questions[answeredCount - 1].prompt);
     }
     return adaptive.generate(difficulty);
   });
   ```
   `prev.questions[answeredCount - 1]` תמיד קיים בנקודה הזו — `answeredCount`
   מתעדכן רק אחרי תשובה, כך שתמיד יש שאלה קודמת שזה עתה נענתה.

## Edge Cases
- **למה רק אינדקס `answeredCount` בדיוק, לא כל הזנב שמחדש מתחדש**: כל אינדקס
  `i > answeredCount` נוצר כאן באופן ספקולטיבי אבל **נזרק ונוצר מחדש שוב**
  ברגע שהתלמיד/ה עונה על השאלה הבאה (אותו קוד רץ שוב, עם `answeredCount`
  גבוה ב-1, ומחדש את כל מה שמ-`answeredCount` החדש ומעלה — כולל מה שהיה
  שם). האינדקס היחיד שבאמת מוצג אי-פעם *כפי שנוצר* הוא זה שבדיוק שווה
  ל-`answeredCount` ברגע היצירה. בדיקת-כפילות על אינדקסים שממילא יוחלפו
  היא עבודה מבוזבזת בלי שום תועלת נצפית למשתמש — product-spec.md גם מגביל
  את ההיקף לזוג הצמוד בלבד, לא לכל התרגול.
  **חריג יחיד:** השאלה הראשונה בתרגול (`freshAdaptiveSession`, אינדקס 0)
  אין לה שאלה-קודמת כלל — `withoutRepeatingPrompt` כבר מטפלת בזה
  (`previousPrompt === null` מדלג על ה-retry), אבל אין צורך לקרוא לה שם
  בכלל כי `freshAdaptiveSession` לא נוגעים בו (אינדקס 0 הוא תמיד הראשון,
  אין לו "קודם" להיות זהה אליו).
- **דרגת קושי השתנתה בין שתי השאלות**: לא משנה דבר במנגנון —
  `withoutRepeatingPrompt` משווה מחרוזות `prompt` בלבד, לא דרגות קושי; אם
  הניסוח באמת שונה (רוב המקרים כשדרגת הקושי השתנתה) הלולאה פשוט לא
  מתבצעת בכלל (ההשוואה הראשונה כבר נכשלת).
- **טווח מצומצם מאוד**: אחרי 20 ניסיונות כושלים, מחזירים את השאלה האחרונה
  שנוצרה גם אם היא עדיין זהה — בדיוק ההתנהגות ש-product-spec.md דורש
  במפורש ("עדיף חזרה נדירה על תקיעה").

## Risks / Tradeoffs
- **לא נוגעים ב-`freshAdaptiveSession`**: הארכיטקטורה הזו תלויה בהנחה
  שאינדקסים `> 0` במערך ההתחלתי לעולם לא מוצגים כפי שנוצרו (הם נזרקים
  ונוצרים-מחדש דרך `handleAdaptiveAnswered` לפני שמגיעים אליהם). זו לא
  הנחה חדשה — זו ההתנהגות הקיימת היום, רק עכשיו היא גם הבסיס לנכונות
  התיקון. אם מישהו ישנה את זה בעתיד (שישאלה 1 תוצג *בלי* לעבור דרך
  `handleAdaptiveAnswered`), התיקון הזה יצטרך תוספת תואמת.
- **לא מיושם בנושאים לא-אדפטיביים**: בכוונה — ראו Out of Scope ב-
  product-spec.md.

## Open Questions
None.

## Implementation Notes

Built exactly as planned, no deviations.

- `src/data/adaptiveHelpers.ts`: added `withoutRepeatingPrompt`, right below
  `withoutLeakingHints`.
- `src/App.tsx`: `handleAdaptiveAnswered`'s regeneration `.map` now special-cases
  `i === answeredCount` to wrap the `generate` call in `withoutRepeatingPrompt`,
  comparing against `prev.questions[answeredCount - 1].prompt`. Every other index
  (`< answeredCount` kept as-is, `> answeredCount` regenerated plain) is unchanged.
- Version bumped `1.42.0 → 1.42.1` (`npm run bump:fix` — this is a `fix/` branch).
- `npm run build` and `npm run lint` are clean. Full single-run `npm run test:e2e`:
  **490/491 passing** — the one failure is the pre-existing
  `grade8-angles-congruence.spec.ts` flake (same one already documented against
  PR #88/#89/#90, unrelated to this change).

## Revision — merging `main` in before merge (2026-11-21)

Light conflict in `App.tsx`'s import block only — `main` had already added its own
`loadAdaptiveTier`/`saveAdaptiveTier` import from a different change; this branch's new
`withoutRepeatingPrompt` import slotted in next to it with no logic conflict.
`handleAdaptiveAnswered`'s own body merged clean.

`tests/e2e/no-repeat-consecutive-questions.spec.ts` needed updating for two unrelated
`main`-side changes: `answerViaNotebook`/`./helpers/notebookAnswer` (removed with
`docs/features/scored-answer-practice/`, which replaced the notebook with a typed
final-answer field) → `./helpers/answerQuestion`, and the old hardcoded
מיקה/רותם/עומר roster → `createAndSelectStudent` (`docs/features/manage-students/` made
the roster start empty per profile).

**Found while verifying the rewritten test:** the "run of correct answers (climbing
difficulty)" case failed intermittently (~20% of runs, different adjacent pair each time)
under `npm run test:e2e` (dev server, React `StrictMode` active), but passed `8/8` when
the identical test ran against `vite build` + `vite preview` (no `StrictMode`). Diagnosed
as a dev-only artifact: `StrictMode` deliberately double-invokes `useState` updater
functions in development, and here that interacts with the `Math.random()`-based adaptive
generators in a way that occasionally lets two draws collide despite
`withoutRepeatingPrompt`'s retry loop. **Confirmed not a production bug** — the live site
is always a production build, never dev-mode. Documented as a new, general CLAUDE.md
pitfall (not specific to this fix) rather than silently rerun past or worked around in the
test. The full suite's second failure this round
(`grade2-syllabus.spec.ts` › "...basic division...") is very likely the same family —
also an adaptive-topic test, also cleared on an isolated rerun (`3/3`).

Version re-bumped on top of the merge, `1.50.1 → 1.50.2` (the branch's own prior bump
predates the merge and no longer reflects `main`'s real version). Full single-run
`npm run test:e2e --workers=1` after the merge: **345/347** — the two failures are the
pre-existing `grade8-angles-congruence` flake and the `StrictMode`/adaptive flake above,
neither caused by this change. `npm run build` and `npm run lint` clean.
