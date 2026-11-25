# שאלה לפני כיבוי הקראה אוטומטית — Tests

## Coverage

Map of product-spec.md's acceptance criteria → `tests/e2e/ask-before-disabling-autoread.spec.ts`:

- **AC #1** (השאלה מופיעה רק כשהקראה אוטומטית פעילה ועצם ההקראה לא הסתיימה מעצמה) →
  `asks whether to turn off auto-read-aloud after a question reading is stopped before it finishes`
- **AC #2** (אין שאלה כשהקראה אוטומטית כבויה) →
  `does not ask when auto-read-aloud is off, even after manually stopping a reading`
- **AC #10** (לא תלוי בנושא/מסך — שאלה ורמז) →
  `also asks after a hint reading is stopped before it finishes`
- **AC #6** ("לא" לא משנה התנהגות) →
  `answering "לא, המשיכו" leaves auto-read-aloud on`
- **AC #5** ("כן" מכבה את ההגדרה, מידית, בלי reload) →
  `answering "כן, כבו" turns auto-read-aloud off for this student`
- **AC #3** (פעם אחת; תקופת-שקט של יומיים; חל גם על "לא") →
  `after answering once, stopping again right away does not ask a second time` +
  `asks again once the ~2-day suppression window has passed` (via `page.clock`, no real wait)
- **AC #4** (פר-תלמיד/ה) →
  `the ask's suppression belongs to the student, not the device`
- **AC #8** (אין חסימת תרגול; התעלמות לא מתחילה תקופת-שקט) →
  `does not block answering the question while the ask is showing, and ignoring it does not suppress the next ask`
- **AC #7** (ההקראה עצמה לא מתעכבת/נחסמת בשביל השאלה) — לא מכוסה בבדיקה נפרדת כאן:
  זו תכונה מבנית של `toggleSpeech` (ההקראה כבר נעצרת לפני שנבדק אם להציג שאלה),
  ומכוסה בעקיפין על ידי `read-aloud-questions.spec.ts`'s "the speak button turns into
  a stop, and pressing it again stops".
- **AC #9** (ניסוח קצר, מתאים למיקה) — לא בדיקה נפרדת; כל הבדיקות שמאשרות את הכרטיסון
  מצמידות לטקסט המדויק מ-design.md ("לכבות הקראה אוטומטית?", "כן, כבו", "לא, המשיכו",
  "לא לשאול אותי יותר"), כך שהניסוח בפועל נבדק דרך השימוש בו, לא רק נקרא.

## How to run
`npm run test:e2e` (או `npx playwright test --workers=1` — ריצה בודדת ונקייה, תואמת-CI;
ראו CLAUDE.md על הסיכון בריצה בלי `--workers=1`).

## Status

**ירוק, 2026-11-25.** ריצה מלאה, בודדת, `--workers=1`: **408/410 נבדקו, 408 עברו, 0
נכשלו**. ה-`2` הנותרות הן `test.skip()` מכוון וקיים-מראש ב-`adaptive-pace-setting.spec.ts`
(פער ב-`main` עצמו — אין עוד דרך לפתוח ⚙️ באמצע תרגול פעיל, לא קשור לפיצ'ר הזה) —
לא flake, ולא דבר שהשתנה כאן.

שתי תקלות אמיתיות נמצאו ותוקנו במהלך השלב הזה, לפני הריצה הנקייה הסופית:
1. שלוש מהבדיקות החדשות כאן הניחו ניווט שגוי מתוך `Practice` בחזרה למסך החלפת-תלמיד/ה
   (צריך שלושה "← חזרה", לא אחד) ובדקו `readAloudState` ממקום שאין בו דיאלוג הגדרות
   בכלל (רק מהמסך הראשי) — בעיה בבדיקות עצמן, לא במימוש; תוקן בקובץ הבדיקות.
2. קומיט המימוש העלה את המספר ל-`1.59.0` אבל לא הוסיף שורה תואמת ל-
   `src/data/changelog.ts` — `tests/e2e/version-log.spec.ts`'s "marks the version
   currently open on this device as today's" (בדיקה קיימת-מראש, לא נכתבה כאן) תפסה
   את זה; תוקן בקומיט נפרד של ה-developer, ראו architecture.md's Implementation Notes.

שתי ריצות-ביניים נוספות לפני הריצה הנקייה הסופית הראו כשלים מפוזרים ולא-קשורים
(`topics-and-progress`, `version-log`, `version-number`) — אומתו כתלות-משאבים מריצות
**מקבילות של סשנים אחרים** על אותה מכונה (`ps aux` הראה תהליכי `playwright`/`vite`
מסשנים אחרים, בתיקיית ה-checkout הראשית, לא בעבודת הסניף הזה) ולא כרגרסיה — ראו
CLAUDE.md's "שתי ריצות מקבילות... אינן שתי מדידות". אומת מחדש בנפרד, מבודד
(`tests/e2e/ask-before-disabling-autoread.spec.ts` לבדו: `9/9`; `version-log.spec.ts`
+ `version-number.spec.ts` לבדם: `14/14`) ולבסוף בריצה מלאה ונקייה כשאין סשן אחר
פעיל — `408/408` (לבד מה-`2` flake-ים הידועים).
