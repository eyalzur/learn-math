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

**רוויזיה (שיפור טבעיות הקול):**
- "העדפת קול איכותי כשיש כמה קולות עבריים" →
  `prefers a quality-hinted Hebrew voice over a generic one`
- "נפילה לקול עברי זמין כשאין קול מסומן כאיכותי (לא נופל לריק)" →
  `still picks a Hebrew voice when none is quality-hinted`
- "קצב וגובה צליל מוגדרים במפורש ולא נשארים על ברירת המחדל" →
  `sets an explicit speech rate and pitch instead of the browser defaults`

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

**מלכודת שהתגלתה ברוויזיה הזו:** בדיקת ה-rate/pitch לא נועלת ערכים מדויקים
(`0.92`/`1.05`) - היא בודקת רק ש**שונים מברירת המחדל** (`1`/`1`), בהתאם למה
שarchitecture.md מגדיר במפורש כלא-ניתן-לבדיקה-אוטומטית (איכות שמע היא שיפוט
אנושי). נעילת הערכים המדויקים הייתה הופכת כל כיוונון עתידי לבדיקה נכשלת בלי
שום רגרסיה אמיתית.

## How to run
`npm run test:e2e`

## Status
✅ 41/41 עוברות נכון ל-2026-08-13 (3 חדשות לרוויזיה הזו + 38 קיימות).
