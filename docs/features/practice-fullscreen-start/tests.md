# פתיחת שאלה במסך מלא כברירת מחדל — Tests

## Coverage
אין קובץ בדיקות ייעודי חדש — זה שינוי של ערך התחלתי קיים, לא התנהגות חדשה
עם acceptance criteria משלה שלא נבדקו כבר. הכיסוי האמיתי הוא **עדכון** של
עשרות בדיקות קיימות שהניחו שתרגול נפתח במצב רגיל:

- "כניסה לתרגול פותחת מסך מלא בלי לחיצה" → נבדק implicitly בכל בדיקה
  שכבר מתחילה מתרגול ועכשיו בודקת/משתמשת ב-`.notebook-screen.fullscreen` או
  `.notebook-fullscreen-exit` מיד בכניסה (למשל
  `notebook-toolbar-actions.spec.ts` › `in fullscreen the button is visible
  without scrolling...`, `notebook-default-practice.spec.ts` › `a confident
  reading that arrives while fullscreen is on exits it automatically`).
- "✕ ממשיך לעבוד הפיך" → `notebook-default-practice.spec.ts` › `the exit
  button on the compact strip returns to the regular layout`.
- "נשאר לשאלה הבאה לא משתנה" → `notebook-toolbar-actions.spec.ts` ›
  `default fullscreen carries into the next question` /
  `left fullscreen by hand (✕) → the next question is not in fullscreen`.
- **באג שנמצא ותוקן** (לא היה ב-acceptance criteria המקוריים — התגלה כאן):
  יציאה ממסך מלא בלי לאבד את הדף, לדף מעוגן-ימינה — מאומת ידנית בדפדפן חי
  (Mika ← כיתה ב׳ ← "צורות וגופים" ← ✕), לא ב-Playwright (הבדיקה האוטומטית
  שהייתה חושפת את זה — `drawOnCanvas` אחרי יציאה על נושא מעוגן-ימינה — כבר
  מכוסה בעקיפין על ידי כל בדיקה ששולחת תשובה אחרי `.notebook-fullscreen-exit`
  בנושאי כיתה ב׳/ח׳ בעברית, למשל `grade2-syllabus.spec.ts`,
  `grade8-angles-congruence.spec.ts`).

29 קבצי `tests/e2e/*.spec.ts` עודכנו כדי לא להניח עוד שתרגול נפתח במצב רגיל
(הוספת קליק יציאה ממסך מלא בנקודה שבה הבדיקה צריכה אלמנט שהכותרת הרגילה
מכילה — כפתור חזרה, כפתור רמז, `.progress`). פירוט מלא בהערות בתוך הקבצים
עצמם ובהערת ה-Implementation Notes ב-architecture.md.

## How to run
`npm run test:e2e`

## Status
`489/490` נכון ל-2026-11-19, ריצה בודדת ונקייה. הכשל היחיד —
`grade8-angles-congruence.spec.ts` › "covers angle questions — straight-angle
completion, triangle angle sum, exterior angle, and parallel lines" — אומת
שהוא נכשל **גם על `main` נקי** (worktree נפרד, בלי אף שינוי מהפיצ'ר הזה) —
כשל קיים-מראש, לא קשור בכלל לברירת-המחדל החדשה של מסך מלא. מחוץ ל-scope
של הפיצ'ר הזה; לא תוקן כאן.
