# תיקוני שימושיות במחברת התרגול — Tests

## Coverage

| קריטריון קבלה (product-spec.md) | בדיקה |
|---|---|
| אישור לפני "נקה דף"; ביטול משאיר את הדף כמו שהיה | `tests/e2e/notebook-usability-fixes.spec.ts` › `"נקה דף" asks for confirmation before clearing, and "ביטול" leaves the page untouched` |
| "נקה דף" מוחק בפועל אחרי אישור | `› "נקה דף" actually clears the page once confirmed` |
| דילוג על אישור כשהדף כבר ריק | `› "נקה דף" on an already-empty page clears silently, with no confirmation dialog` |
| שני הדיאלוגים ("נקה דף"/"הסר דף") לא מתבלבלים ביניהם | `› "נקה דף" and "הסר דף" use the same dialog component but never confuse their actions` |
| זום פתיחה קבוע 70%, לא תלוי בגודל המסך | `› the notebook opens at a fixed 70% zoom, even on a narrow phone viewport` |
| אין מעבר אוטומטי לשאלה הבאה אחרי תשובה נכונה | `› a correct answer does not advance on its own — the practice screen waits for the manual button` , `› there is no countdown row anywhere on a correct answer` |
| תשובה נכונה רגילה (בלי `errorPointer`) — ללא שינוי | `› a correct final answer with no errorPointer looks exactly like today — full green celebration` |
| תשובה נכונה עם `errorPointer` — עיצוב ענברי מובחן | `› a correct final answer whose process the teacher flagged is visibly distinguished from a plain correct answer` |
| ההבחנה חלה רק על תשובה נכונה, לא על שגויה | `› a wrong final answer with an errorPointer is unaffected — the flagged styling is only for a correct answer` |
| הניקוד וההיסטוריה לא מושפעים מהדגל | `› a flagged-but-correct answer still counts as correct in the final score` |

**שני קריטריונים לא מכוסים ב-e2e, במכוון:**
- **פונט תרגיל קטן יותר במסך מלא** — ערך `font-size` בודד (עברי מ-`26px` ל-`18px`), בלי
  התנהגות שבדיקת DOM יכולה להבחין ממנה משמעותית מ"איזשהו גודל קטן אחר". פרט עיצובי, לא
  קריטריון שניתן לממש כבדיקת אמת/שקר שימושית.
- **המספר `70%` המדויק** — בסופו של דבר **כן** נבדק ישירות: `.notebook-zoom-readout` מרנדר
  את האחוז כטקסט מילולי, אז הבדיקה הראשונה בטבלה שמה עליו `toHaveText("70%")` ממש.

## Coverage — עדכון (סבב רוויזיה א׳, 2026-09-05)

| קריטריון קבלה (product-spec.md, עדכון) | בדיקה |
|---|---|
| "הסר דף" קיצוני יותר מ"נקה דף" | `› "הסר דף" sits at the very far edge of the toolbar, past "נקה דף"` |
| פתיחה מהפינה השמאלית-עליונה (לא ממורכזת), עדיין `70%` | `› the page opens at a fixed 70% zoom with its top-left corner aligned to the stage's top-left corner, not centered` |
| זום/מיקום נשמרים במעבר למסך מלא ובחזרה | `› zoom and position are preserved across entering and leaving fullscreen` |
| כפתור "הצג את כל הדף" — זום-אאוט ושחזור מדויק | `› "הצג את כל הדף" zooms out to fit the whole page, and a second press restores the exact previous zoom` |
| הכפתור לא נשאר "תקוע" פעיל על עמוד שכבר לא רלוונטי | `› "הצג את כל הדף" resets its own toggle state when the visible page changes, instead of carrying a stale restore point` |

## שינוי תשתית בדיקות שהתגלה כהכרחי

תיקון הזום (סעיף למעלה) חשף באג אמיתי בעזר המשותף `tests/e2e/helpers/notebookAnswer.ts`
(`drawOnCanvas`), לא רק בקוד האפליקציה — ראו "רוויזיה" למטה. `drawOnCanvas` תוקן להשתמש
במרכז `.notebook-stage` (אזור התצוגה החתוך) במקום נקודה קבועה יחסית ל-`<canvas>` עצמו,
כי מ-70% קבוע ואילך הקנבס יכול להיות גדול מהאזור הנראה שלו (בכוונה — זה מה שמאפשר
pan/zoom). זה קובץ עזר **משותף** לכל הסוויטה (לא רק לפיצ'ר הזה) — התיקון אומת מול
`notebook-default-practice.spec.ts` (19/19) ומול הסוויטה המלאה (328/328) לפני שנחשב גמור.

## How to run
```bash
npm run build && npm run lint && npm run test:e2e
```

## Status

**328/328 עוברות, בריצה בודדת ונקייה** (2026-09-04). `build`/`lint` ירוקים.

`tests/e2e/countdown-next.spec.ts` נמחק במלואו — הפיצ'ר שהוא בדק (מעבר אוטומטי בין
שאלות) הוסר על ידי הפיצ'ר הזה; ראו `docs/features/countdown-next/status.md`.

### רוויזיה — באג אמיתי שנתפס ותוקן בדרך (2026-09-04)

שני באגים אמיתיים נתפסו רק בזכות ריצת `test:e2e` בפועל, לא בזכות `build`/`lint`:

1. **זום הפתיחה לא באמת היה קבוע.** ה-effect הקיים שמתאים מחדש את הזום בכניסה/יציאה
   ממסך מלא רץ **גם** ב-mount הראשוני (כי `fullscreen` משתנה מ"שום דבר" ל-`false`),
   ודרס את הזום הקבוע החדש בחזרה לחישוב הדינמי — אבל רק בפועל בזמן ריצה אמיתית, כי
   ה-guard הראשון שנוסה ("רצתי כבר פעם אחת?") נצרך על ידי ההרצה הכפולה של React
   StrictMode ב-mode פיתוח. תוקן להשוואת הערך הקודם לנוכחי (אידמפוטנטי, לא נצרך על
   ידי הכפלה) — ראו architecture.md, Implementation Notes.
2. **`drawOnCanvas` (העזר המשותף) הפסיק לעבוד על מסכים לא-צרים.** ברגע שהזום קבוע
   ב-`70%` בלי קשר לגודל התיבה, הקנבס יכול לצאת גדול מהאזור הנראה שלו (עם
   `.notebook-stage { overflow: hidden }`) — נקודה קבועה יחסית לפינת הקנבס עצמו
   (`canvas.boundingBox()`, שמתעלם מחיתוך הורה) יכלה ליפול מחוץ לאזור הנראה בפועל,
   כך שלחיצת עכבר אמיתית שם לא פוגעת בקנבס בכלל. זה **לא** התגלה בבדיקה הראשונה
   (מסך צר, 390×700) — התגלה רק כש-`notebook-default-practice.spec.ts` הקיים (מסך
   רגיל, לא צר) נכשל לגמרי (11/19 נכשלו) עם `שלח למורה` נשאר `disabled` לנצח.
   תוקן ב-`drawOnCanvas` עצמו: קליק במרכז `.notebook-stage` (שהוא, מהגדרתו, תמיד
   כולו נראה) במקום נקודה יחסית לקנבס. השפעה: כל קובץ שמשתמש ב-`drawOnCanvas`
   (רוב בדיקות המחברת בסוויטה), לא רק זה — אומת מול `notebook-default-practice.spec.ts`
   (19/19) ומול הסוויטה המלאה (328/328) לפני שנחשב גמור.

### רוויזיה — סבב רוויזיה א׳ (2026-09-05)

`333/333 עוברות, בריצה בודדת ונקייה` (328 + 5 חדשות). שתי בדיקות מתוך החמש
נכתבו לא נכון בפעם הראשונה ותוקנו תוך כדי הכתיבה, לא אחרי שנתגלו כבאג אמיתי
באפליקציה — שני לקחים ל-locator-ים ב-Playwright, לא לקוד המוצר:
- `getByRole(..., { name: "צאו ממסך מלא" })` דו-משמעי במסך מלא: גם כפתור
  היציאה בפס המצומצם (`.notebook-fullscreen-exit`) וגם כפתור ה-toggle
  בבקרות הזום נושאים את אותו `aria-label` באותו רגע. נפתר עם לוקטור לפי class.
- לוקטור לכפתור "הצג את כל הדף" **לפי השם הנגיש שלו** נשבר ברגע שהלחיצה
  משנה את השם (`aria-label` מתחלף בין "הצגת כל הדף" ל"חזרה לזום הקודם") —
  לוקטור שנבנה מהשם הישן פשוט לא תואם יותר אחרי הקליק. נפתר עם לוקטור לפי
  מיקום בתוך `.notebook-zoom-controls` (`nth(2)`), לא לפי שם.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
