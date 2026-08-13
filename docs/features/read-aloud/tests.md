# הקראה בקול של ההסבר — Tests

## Coverage
`tests/e2e/read-aloud.spec.ts`:
- "כפתור בבלוק ההסבר" → `the explanation offers a read-aloud button`
- "מקריא שלבים ודימוי" ו-"בעברית" →
  `pressing it speaks every step and the analogy, in Hebrew` (מוודא `lang = he-IL`)
- "חשבון כמילים ולא כסימנים" →
  `arithmetic is spoken as Hebrew words rather than symbols`
- "לחיצה נוספת עוצרת" → `pressing the button again stops the reading`
- "מעבר לשאלה עוצר" → `moving to the next question stops a reading in progress`
- "אין מנוע → אין כפתור" → `a browser with no speech engine shows no button at all`

## איך זה נבדק
`speechSynthesis` מוחלף ב-stub שמתעד מה נשלח להקראה. הבדיקות אומרות מה האפליקציה
*מבקשת* שייאמר - זה החלק שיכול להיות שגוי. האם למכשיר מסוים יש קול עברי מותקן זה לא
משהו שבדיקה יכולה או צריכה לקבע.

שתי מלכודות שהתגלו בכתיבת הבדיקות עצמן:
1. `speechSynthesis` הוא accessor לקריאה בלבד על `window`, ולכן השמה רגילה נכשלת
   **בשקט** וה-stub לא נתפס. נדרש `Object.defineProperty`.
2. הבדיקה הראשונה הניחה שכל שלב בחיסור מכיל אופרטור, אבל ברמה הקלה ההסבר הוא ספירה
   אחורה (`3, 2, 1`). היא נכתבה מחדש כך שהיא סורקת את הרמה עד שהיא מוצאת ביטוי, במקום
   להניח איפה הוא יושב.

## How to run
`npm run test:e2e`

## Status
✅ 38/38 עוברות נכון ל-2026-08-13 (6 של הפיצ'ר הזה + 32 קיימות).
