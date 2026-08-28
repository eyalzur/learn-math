# כל כיתה לכל תלמיד/ה — Tests

## Coverage

Acceptance criteria (product-spec.md) → tests, all in `tests/e2e/any-grade-any-student.spec.ts`:

- בחירת התלמיד/ה נשארת בדיוק כמו היום → "student selection itself is unchanged — three
  named cards, no grade shown yet".
- כל תלמיד/ה רואה את כל ארבע הכיתות → "every student sees all four grades, not just
  their usual one".
- תלמיד/ה יכול/ה לתרגל כל נושא בכל כיתה → "a student can choose a grade that isn't
  their usual one and actually practise in it".
- מסך בחירת כיתה מוצג לכל תלמיד/ה → "the grade picker is shown to every student,
  including one who used to skip it".
- כניסה חוזרת פותחת במקום האחרון — כיתה בלבד → "reloading after reaching the topic
  list returns straight to that grade's topic list".
- כניסה חוזרת פותחת במקום האחרון — נושא+סגנון → "reloading after reaching a style
  picker returns straight to that same style picker".
- חזרה ממסך סגנונות מנקה את המיקום העמוק → "going back from a style picker to the
  topic list, then reloading, stays on the topic list".
- מיקום ניווט בלבד, לא מצב תרגול פעיל → "an adaptive topic never resumes inside an
  active practice session".
- מיקום נשמר בנפרד לכל תלמיד/ה → "a second student's saved position is just as
  independently remembered as the first's", "one student's saved position isn't
  disturbed by another student's turn".
- היסטוריה ממשיכה לעבוד כמו היום → "history keeps working exactly as before,
  reachable from the grade picker".

## How to run
`npm run test:e2e`

## Status
**279/279 עוברות** (2026-08-28), ריצה נקייה בודדת.

## רגרסיות שנמצאו ותוקנו

הפיכת מסך בחירת הכיתה לחובה לכל תלמיד/ה (לא רק מיקה) שברה **48 בדיקות קיימות** בפעם
הראשונה שהסוויט המלאה רצה, ב-**13 קבצים**. כולן מאותה סיבה: `helper` שנכנס דרך
`.student-card` ומצפה לנחות ישר על מסך הנושאים (או, עבור רותם/עומר, ישר על מסך "מה
נתרגל היום?") — כשעכשיו כל תלמיד/ה עוברת קודם דרך `.grade-card`. כל תיקון הוא הוספת
לחיצת `.grade-card` (או הרחבת תנאי שהיה מוגבל ל"רק מיקה") — לא שינוי בכוונת הבדיקה.

שני ריכוזים ראויים לציון:

1. **תיקון ראשון גרר תיקון שני, פעמיים.** אחרי שהפכתי עזר ניווט ל"תמיד לוחצים על
   כיתה", גיליתי **בדיקה שעברה מקרה קודם דווקא כי ההתנהגות הישנה הייתה שגויה** —
   `students-and-syllabus.spec.ts`'s "switching student is also forgotten across a
   reload" הצליחה במקרה, כי לרותם (לפני התיקון) לא היה מסך ביניים לעבור, אז הכפתור
   "← החלף תלמיד" צף מיד. אחרי שהוא קיבל מסך ביניים אמיתי, אותה בדיקה נשברה. אותו
   דבר קרה שוב סבב אחד אחרי זה ב-`read-aloud-questions.spec.ts` — "the setting
   belongs to the student, not the device" עשה בדיוק את אותו מעבר (תלמיד → כיתה →
   בדיקה → חזרה להחלפת תלמיד) פעמיים בתוך אותה בדיקה, ורק המופע הראשון תוקן בסבב
   הראשון. **הלקח: תיקון מכני על סמך רשימת כשלים בודדת לא מספיק — צריך להריץ שוב עד
   שאין אף כשל חדש, לא רק "פחות".**
2. **קובץ בדיקה אחד תיאר את התכונה הזאת מראש, מבלי לדעת.** `read-aloud-questions.spec.ts`
   כבר הכיל, לפני הפיצ'ר הזה, את הניסוח "Mika's topics screen leads to the grade
   picker first... switching student happens from there" — כי מיקה כבר הייתה
   דו-כיתתית מלפני הסשן הזה. זה בדיוק ההתנהגות שהפיצ'ר החדש הכליל לכולם, אז חלק
   מהעבודה כאן היה רק "לעשות לרותם/עומר את מה שכבר עבד למיקה", לא להמציא התנהגות
   חדשה.

אף תיקון לא היחליש בדיקה כדי להעלים כישלון אמיתי — כל שינוי הוא עדכון ניווט למציאות
החדשה שאושרה, ולא נגיעה במה שהבדיקה בפועל בודקת.
