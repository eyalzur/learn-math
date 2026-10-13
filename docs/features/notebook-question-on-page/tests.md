# השאלה כתובה על דף המחברת עצמו — Tests

## Coverage

`tests/e2e/notebook-question-on-page.spec.ts`, מיפוי לקריטריוני-קבלה
ב-`product-spec.md`:

- "השאלה מופיעה בתוך דף המחברת עצמו" → `the question is written on the
  notebook page itself, and the old separate box is gone`
- "התיבה הנפרדת... אינה מוצגת יותר... כולל ההעתק במסך מלא" →
  `fullscreen shows the same written question — no separate duplicate copy`
- "זום/פאן מזיזים ומשני גודל את הטקסט יחד עם הדף" →
  `zooming moves the written question with the page, not fixed to the screen`
- "מחק לא מוחק את השאלה" → `the eraser cannot erase the written question`
- "כל דף חדש מציג את השאלה שלו, ניווט לדף קודם מראה את השאלה שהייתה שם" →
  `each new page shows its own question, and navigating back still shows
  what was there` — **נכשל, ראו "באג 1" למטה.**
- "ביטויים חשבוניים ממשיכים להיקרא נכון (LTR מבודד)" + בדיקת-רגרסיה
  לבאג האמיתי שנתפס בפיתוח (טקסט שנחתך מחוץ לתצוגה הראשונית) →
  `a Hebrew word problem's arithmetic stays left-to-right, and the
  question is visible at the page's default view`
- "הקראה בקול ממשיכה לעבוד" → `the question's read-aloud button lives
  in one shared place and still works`
- "חל על כל שלושת התלמידים/כל הנושאים" → `applies to other
  students/topics using the notebook, not just one`
- מסך השיעור (Out of Scope) נשאר לא-מושפע → `the lesson screen outside
  practice is unaffected — explicitly out of scope`

## How to run
`npx playwright test tests/e2e/notebook-question-on-page.spec.ts`
(או כחלק מ-`npm run test:e2e` המלא)

## Status — 🔴 חסום, שני באגים אמיתיים נתפסו

**לא "בדיקה גרועה" — התנהגות שגויה בפועל, אומתה ישירות מול האפליקציה
החיה, לא רק קריאת קוד.** שני הממצאים הבאים הם עבודה אמיתית לשלב
`developer`/`tech-lead` נוסף, לא תוקנו כאן בכוונה (per הכלל של סקיל
ה-qa: "don't edit the test to force it green").

### באג 1 — ניווט ל"דף קודם" לא משחזר את השאלה שהייתה שם
קריטריון קבלה מפורש מ-product-spec.md: "ניווט לדף קודם מראה את השאלה
שהייתה כתובה שם... ללא שינוי." בפועל: אחרי מענה על שאלה 1 ומעבר ל"הבא",
לחיצה על "דף קודם" **ממשיכה להציג את שאלה 2** (השאלה הנוכחית/"החיה"),
לא את שאלה 1 שהייתה כתובה בפועל על הדף הראשון. אומת יציב פעמיים (לא
flake) — ראו `tests/e2e/notebook-question-on-page.spec.ts`, הבדיקה
"each new page shows its own question, and navigating back still shows
what was there".

**השורש הסביר** (לא אומת בקריאת קוד בשלב הזה — זה ל-tech-lead/developer
לאבחן ולתקן): architecture.md הניח ש"`questionHeader` נגזר מ-`question`
הנוכחי בכל רינדור... כך שהמקרה של דף-מְשומש-מחדש עובד נכון אוטומטית" —
הנחה נכונה *רק* לגבי המקרה של `MAX_PAGES`, אבל פספסה שה"דף הנוכחי
שמוצג" (`currentPageIndex`, שה"דף קודם"/"דף הבא" של ה-toolbar קובעים)
ו"השאלה החיה שעונים עליה כרגע" (`index` ב-`Practice.tsx`, שרק `next()`
מקדם) הם **שני דברים נפרדים** — ניווט בין דפים דרך `.notebook-page-nav`
אף פעם לא היה אמור לשנות באיזו שאלה "עובדים" כרגע, רק איזה דף *מוצג*.
כתוצאה מכך הכותרת-הכתובה, שתלויה רק ב-`question`, לא "עוקבת" אחרי
`currentPageIndex` כמו שצריך.

### באג 2 — רגרסיה רחבה: `.problem-text`/`.problem-box` הוסרו מזרימת
### התרגול בלי לבדוק כמה בדיקות קיימות נשענות עליהם

ריצה מלאה בודדת ונקייה (`npm run build && npm run lint && npm run
test:e2e`): **348/468 עברו, 120 נכשלו**. **119 מתוך ה-120** (כל הכשל
חוץ מבאג 1 למעלה) הם באותה סיבה מדויקת: `architecture.md` בחר שמות
מחלקה חדשים (`notebook-question-header`/`qh-rtl`/`qh-ltr`) במקום
`.problem-box`/`.problem-text` הישנים **כדי ש-`TopicLesson.tsx` לא
יושפע** — נימוק נכון כשלעצמו, אבל ההחלטה לא נבדקה מול שאר חבילת
הבדיקות, והתברר ש-**עשרות קבצי בדיקה קיימים, לא קשורים לפיצ'ר הזה,
משתמשים ב-`.problem-text`/`.problem-box` בתור הדרך הגנרית לקרוא "מה
השאלה הנוכחית על המסך" בתוך זרימת התרגול עצמה** (לא רק במסך השיעור)
— לא רק הקומפוננטה ששונתה. 20 קבצים הושפעו (119 בדיקות בודדות):

| קובץ | כשלים |
|---|---|
| `mistake-diagnosis.spec.ts` | 24 |
| `mika-diagrams.spec.ts` | 18 |
| `mika-adaptive-difficulty.spec.ts` | 15 |
| `grade8-angles-congruence.spec.ts` | 8 |
| `fraction-diagram.spec.ts` | 8 |
| `clearer-explanations.spec.ts` | 8 |
| `more-diagrams-wave2.spec.ts` | 7 |
| `style-lessons.spec.ts` | 6 |
| `grade2-syllabus.spec.ts` | 6 |
| `adaptive-difficulty.spec.ts` | 5 |
| `topics-and-progress.spec.ts` | 3 |
| `question-hints.spec.ts` | 2 |
| `notebook-default-practice.spec.ts` | 2 |
| `teaching-explanations.spec.ts` | 1 |
| `students-and-syllabus.spec.ts` | 1 |
| `review-status.spec.ts` | 1 |
| `notebook-toolbar-actions.spec.ts` | 1 |
| `mistake-explanation.spec.ts` | 1 |
| `mika-grade2-content.spec.ts` | 1 |
| `grade2-clock.spec.ts` | 1 |

**שני קבצים כן תוקנו בפועל כבר בשלב הזה** (לא נשארו ברשימה למעלה) —
`tests/e2e/read-aloud-questions.spec.ts`'s שתי הבדיקות שהשתמשו
ב-`.problem-text` בתוך זרימת התרגול תוקנו ישירות ל-`.notebook-question-header`
(אותו תוכן אמיתי בדיוק, רק מיקום חדש — לא שינוי בהתנהגות הנבדקת, ולא
"עקיפת כישלון"). ה-20 קבצים ברשימה למעלה **לא** נגעתי בהם — ההיקף גדול
מדי בשביל תיקון סלקטור-בלבד חד-צדדי בשלב qa, וסביר שהפתרון הנכון
אינו "להחליף סלקטור ב-20 קבצים" אלא החלטה ארכיטקטונית (האם
`.notebook-question-header`'s `span` הפנימי צריך גם לשאת `problem-text`
כמחלקה נוספת, או שההחלטה המקורית לנתק לגמרי מ-`.problem-box` הייתה
שגויה) — **זו עבודה ל-tech-lead, לא החלטה לקחת כאן בלי אישור**.

**לא מתועד/לא נבדק כתוצאה מהחסימה הזו**: אי אפשר לדווח "יציב על פני
כמה הרצות" עד שהבאגים האלה נפתרים — ריצה חוזרת תראה את אותם 120 כשלים
שוב ושוב, לא flake.
