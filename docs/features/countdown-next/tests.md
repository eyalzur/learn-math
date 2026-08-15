# ספירה לאחור למעבר לשאלה הבאה — Tests

## Coverage

| קריטריון מהספק | בדיקה |
|---|---|
| תשובה נכונה מתחילה ספירה נראית | `countdown-next.spec.ts` › `a correct answer starts a visible countdown` |
| **תשובה שגויה אינה מתחילה כלום** | `…a wrong answer starts nothing — the explanation is not on a timer` |
| **לא בשאלה האחרונה, גם לא תקועה** | `…the last question gets no countdown, not even a stalled one` |
| הספירה יורדת | `…the countdown falls, rather than sitting still` |
| בסוף — מעבר מעצמו | `…when it runs out, the next question opens by itself` |
| **הקשה אחת עוצרת, ואינה חוזרת** | `…one tap stops it, and it does not start again on that question` |
| "הבא" עובד מיד | `…pressing next works immediately, without waiting for the count` |
| הניקוד אינו מושפע | `…advancing on its own counts exactly like pressing next` |
| מוכרז לקורא מסך, והספרה מוסתרת | `…the row announces itself and hides the ticking digit from a screen reader` |

## הבדיקה שקיימת כי הבאג כבר קרה
**`the last question gets no countdown, not even a stalled one`** אינה היפותטית.
המימוש הראשון הציג את השורה על השאלה האחרונה והיא נתקעה על `5` לנצח, כי התנאי
ישב על ה**ספירה** ולא על ה**שורה**. הבדיקה בודקת את שניהם: שאין `.countdown`,
**וגם** שאחרי `2.5` שניות עדיין נמצאים במסך התרגול.

## איך נכתבו בדיקות שתלויות בזמן, בלי שיהבהבו
בדיקה שאומרת "אחרי `2000` מילישניות הספרה היא `3`" עוברת על מכונה מהירה ונכשלת
על אטית, ואז לומדים להתעלם ממנה. לכן **אף בדיקה כאן אינה קובעת ספרה ברגע נתון**:

- **ירידה** נבדקת כשתי דגימות — הראשונה, ואז `expect.poll` שהשנייה קטנה ממנה.
- **מעבר** נבדק כ-`expect.poll` על מספר השאלה בחלון של `10` שניות.
- **עצירה** נבדקת בכיוון ההפוך: `7` שניות שלמות, ומספר השאלה **לא** זז.

## תקציב הזמן של Playwright, ולמה זה שינה בדיקה
`advancing on its own counts exactly like pressing next` נכתבה תחילה כהליכה על כל
עשר השאלות בספירה. היא נכשלה — **לא בגלל באג אלא בגלל שעון**: תשע ספירות הן
`45` שניות, ותקרת הזמן לבדיקה היא `30`.

הכתיבה מחדש היא גם הבדיקה הנכונה יותר: **שתי שאלות עוברות בספירה והשאר בלחיצה**,
וזה בדיוק מה שהטענה אומרת — שהניקוד עיוור להבדל. עשר ספירות היו קונות את אותה
ידיעה בחמישים שניות של שעון.

## How to run
`npm run test:e2e`

## Status
עוברות — `9 / 9` בקובץ הזה. הסוויטה המלאה רצה, והתוצאה נרשמת ב-status.md.
