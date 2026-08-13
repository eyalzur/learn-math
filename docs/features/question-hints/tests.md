# שני רמזים לכל שאלה — Tests

## Coverage
`tests/e2e/question-hints.spec.ts`:
- "אפשר לבקש רמז לפני בדיקה" + "הרמז אינו מוצג מעצמו" →
  `a hint can be asked for before answering, and none shows itself`
- "ראשון שיטתי, שני בבקשה נוספת" →
  `the first press gives one hint, the second gives the other`
- "אין רמז שלישי ואין אפשרות לבקש עוד" → `there is no third hint to ask for`
- "הרמזים נשארים גלויים" → `hints stay on screen after the answer is checked`
- "אחרי בדיקה אי אפשר לבקש עוד" →
  `no more hints can be asked for once an answer is checked`
- "מעבר לשאלה מתחיל מחדש" → `the next question starts over with no hints shown`
- "בקשת רמז אינה משנה ניקוד" → `taking a hint does not cost anything in the score`
- "שאלה בלי רמזים לא מציגה כפתור" → `a question with no written hints shows no button`

## הבדיקה שהכי שווה להסתכל עליה
`taking a hint does not cost anything in the score` עונה על עשר שאלות **נכון**,
אחרי שלקחה את **שני** הרמזים בכל אחת, ומוודאת ציון מלא. זה הקריטריון שהכי קל
לשבור בשוגג — מספיק שמישהו "ישפר" את הניקוד כדי שיעניש על עזרה, וילדה שחוששת
לבקש רמז זה בדיוק ההפך ממטרת הפיצ'ר.

הבדיקה מחשבת את התשובה מהשאלה שעל המסך במקום לקבע רשימת תשובות, כך שהיא לא
תישבר אם התוכן של הנושא יתעדכן.

## הבדיקה שנשענת על מה שעוד לא נעשה
`a question with no written hints shows no button` נכנסת לנושא **אחר** ("חיבור
עד 10") ומוודאת שאין שם כפתור. היא תקפה כל עוד יש בפרויקט שאלות בלי רמזים.
**כשכל 330 השאלות יקבלו רמזים, הבדיקה הזו תאבד את המשמעות שלה** ותצטרך להימחק
או להיכתב מחדש מול נתוני בדיקה. כתוב כאן כדי שמי שישלים את התוכן ידע.

## מה נבדק מחוץ ל-e2e
קריטריוני **התוכן** אינם התנהגות של הדפדפן, ונבדקו בשלב המימוש מול הנתונים:
לכל 30 השאלות בדיוק שני רמזים, אף רמז לא מכיל את התשובה (למעט מספר שכבר מופיע
בשאלה עצמה), הרמז השני אינו חזרה על השאלה, וכל מספר בתוך רמז מסומן בגרשיים
אחוריים כדי שלא יתהפך. הפירוט ב-Implementation Notes.

## How to run
`npm run test:e2e`

## Status
✅ 63/63 עוברות נכון ל-2026-08-13 (8 חדשות + 55 קיימות).
`npm run build` ו-`npm run lint` נקיים.
