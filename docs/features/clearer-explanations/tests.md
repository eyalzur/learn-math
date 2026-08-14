# הסבר בארבע שכבות — Tests

## Coverage

| קריטריון מהספק | בדיקה |
|---|---|
| שום שכבה חדשה לפני התשובה | `clearer-explanations.spec.ts` › `no method sentence and no vertical anywhere before the question is answered` |
| משפט המשתמש מילה במילה + מאונך עם נקודה מתחת לנקודה | `…the decimal addition opens with the user's method sentence and a point-aligned vertical` |
| הנשא מוצג, `3.0` מוסבר כ-`3` | `…the one carrying question shows the carry mark, and 3.0 is explained as 3` |
| משפט חיבור לעולם לא על שאלת חיסור | `…a subtraction question gets a subtraction sentence, never an addition one` |
| פריטה בלי מאונך, ההסבר שלם | `…borrowing questions show no vertical, and the explanation still stands` |
| חד-ספרתיות: משפט בלי טור | `…single-digit sums get a sentence but no column layout` |
| חלופה מילולית = הכיתוב | `…the caption and the screen reader description say the same thing` |
| אי LTR מבודד בתוך עמוד עברי | `…the vertical block is one isolated left-to-right island` |
| סדר ההקראה: שיטה → כיתוב → שלבים | `…the explanation is spoken in layer order` |
| מקלדת עשרונית בשני השדות | `…numeric answer fields ask for a decimal keyboard` |
| **בדיוק 30 שאלות עם מאונך** | `content.spec.ts` › `exactly thirty questions write themselves in columns` — הזכאות מחושבת בבדיקה **באופן בלתי תלוי** מניסוח הספק ומוצלבת מול המודול |
| המאונך לעולם לא סותר את שאלתו | `content.spec.ts` › `no vertical ever disagrees with its own question` — יישור השורות, מיקום הנקודה, והשורה התחתונה היא התשובה |

## עדכון לבדיקה קיימת
`read-aloud.spec.ts` › `arithmetic is spoken as Hebrew words rather than symbols` דגמה
את החלק המוקרא הראשון — שהוא עכשיו משפט השיטה, פרוזה בלי חשבון. הבדיקה עודכנה
לבדוק את ההבטחה האמיתית: על פני **כל** ההקראה, אף סמל לא שורד ומילות הפעולה
מופיעות. לא ציפייה שהוחלשה — ציפייה שהוצמדה למה שהיא תמיד רצתה לומר.

## How to run
`npm run test:e2e`

## Status
עוברות — 125 / 125 בסוויטה המלאה, 2026-08-14.

הערת תזמון אחת: קורא ההסברים משהה כחצי שנייה בין חלקים, ולכן בדיקת סדר ההקראה
ממתינה לצירוף הייחודי של הכיתוב ("מתחת לנקודה") ולא סופרת חלקים — ספירה דוגמת
מוקדם מדי ונשברת בתזמון, לא בהתנהגות.
