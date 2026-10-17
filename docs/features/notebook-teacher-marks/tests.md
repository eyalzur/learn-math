# המורה כותבת על הדף באדום/ירוק — Tests

## Coverage

`tests/e2e/notebook-teacher-marks.spec.ts`, מיפוי לקריטריוני-קבלה
ב-`product-spec.md`:

- "אין הערה לפני שלח למורה" → `a page that hasn't been sent to the teacher
  shows no on-page note`
- "הערה קצרה וצבעונית כתובה על הדף עצמו" → `sending to the teacher adds a
  short colored note on the page itself`
- "ירוק כשהתשובה נכונה... הערה חיובית קצרה" → `a correct answer with no
  errorPointer shows a green note`
- "אדום כשהיא שגויה... כללי" → `a wrong answer with no errorPointer shows a
  red, general note`
- "ענבר כשנכון עם errorPointer, לא ירוק" (תיקון designer לעומת ה-spec
  המקורי) → `a correct answer with an errorPointer shows an amber note
  quoting it, not green`
- "כש-errorPointer קיים ההערה האדומה מזכירה אותו" → `a wrong answer with an
  errorPointer shows a red note quoting it`
- "מצב אי-ודאות אינו מציג הערה צבעונית" → `an uncertain reading shows no
  colored note on the page, only the existing panel message`
- "אינה מחליפה את הפאנל הקיים" → `the existing 'מה המורה הבינה' panel keeps
  working exactly as before, alongside the new note`
- "תיקון מעדכן גם את ההערה על הדף" (מחליף, לא מצטבר) → `a correction
  replaces the on-page note instead of adding a second one`
- "שייכת לדף הספציפי, לא לדף ה'חי'" → `the note belongs to the page it was
  given on, not whichever question is currently live`
- "אינה דיו של התלמיד/ה" → `the note cannot be erased — it is not the
  student's own ink`
- RTL/bidi של חשבון מוטמע בתוך ההערה → `arithmetic quoted inside the note
  stays left-to-right, isolated from the surrounding Hebrew`

## How to run
`npx playwright test tests/e2e/notebook-teacher-marks.spec.ts`
(או כחלק מ-`npm run test:e2e` המלא)

## Status — 🟢 ירוק, 482/482 בסוויטה המלאה

12/12 בדיקות הפיצ'ר עצמן עברו בריצה ראשונה. בריצה המלאה (הסוויטה כולה)
נתפסה **רגרסיה אמיתית אחת** בקובץ קיים ולא-קשור:
`tests/e2e/notebook-question-on-page.spec.ts`'s "each new page shows its own
question, and navigating back still shows what was there" בדק
`.notebook-question-header`'s **כל** ה-innerText — וזה עכשיו כולל גם את
הערת-המורה החדשה (כשיש כזו) בתוך אותו אלמנט, לא רק את טקסט השאלה. זו לא
רגרסיה בפיצ'ר הזה אלא בדיקה קיימת שהניחה שהכותרת מכילה רק שאלה — תוקן
בהיקף מצומצם: שלוש השורות בבדיקה הקיימת עברו מ-`.notebook-question-header`
ל-`.problem-text` (הטקסט של השאלה עצמה), שזה בדיוק מה שהבדיקה ממילא
התכוונה לבדוק. לא נגעתי בשום דבר אחר בקובץ הזה.

ריצה מלאה בודדת ונקייה, **אחרי** התיקון: **482/482 עברו**. אין flake ידוע.
