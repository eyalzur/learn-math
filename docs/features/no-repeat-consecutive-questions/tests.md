# שתי שאלות זהות לא יוצאות ברצף — Tests

## Coverage
- "השאלה שנוצרת אחרי שאלה N אף פעם לא זהה לשאלה N... גם אם דרגת הקושי
  השתנתה בין השתיים" (רצף תשובות נכונות, הקושי עולה) →
  `tests/e2e/no-repeat-consecutive-questions.spec.ts` › `a run of correct
  answers (climbing difficulty) never repeats the question just answered`
- "...וגם אם לא" (רצף תשובות שגויות, הקושי נשאר באותה דרגה — התרחיש עם
  הטווח הכי צר, הכי סביר לגלות בעיה) →
  `tests/e2e/no-repeat-consecutive-questions.spec.ts` › `a run of wrong
  answers (difficulty staying put) never repeats the question just
  answered`
- "ההגבלה היא רק על הזוג הצמוד... שאלה יכולה לחזור על עצמה מאוחר יותר" →
  `tests/e2e/no-repeat-consecutive-questions.spec.ts` › `a question may
  still repeat later in the session, just not back-to-back`
- "המנגנון שקט — אין הודעה/השהייה/שינוי חזותי" — אין לזה מה לבדוק באופן
  ישיר (אין שום דבר על המסך שמשתנה); שלוש הבדיקות למעלה עצמן מוכיחות את
  זה בעקיפין, כי הן רצות דרך הזרימה הרגילה בלי לצפות לשום שינוי ב-UI.
- "במקרה הנדיר שטווח מצומצם מדי... המערכת עדיין מציגה שאלה ולא נתקעת" —
  לא נבדק באופן ישיר (קשה לכונן את התרחיש הזה בלי לקרוא את הקוד); מכוסה
  בעקיפין: אילו ה-retry היה לולאה אינסופית, שלוש הבדיקות למעלה (20 שאלות
  כל אחת) פשוט היו נתקעות וכושלות ב-timeout במקום להסתיים.

## How to run
`npm run test:e2e`

## Status
**493/494 (כל הסוויטה, ריצה בודדת ונקייה) — 2026-11-18.** הכשל היחיד הוא
flake קיים-מראש ולא קשור (`grade8-angles-congruence.spec.ts`). שלוש
הבדיקות החדשות עוברות — ואומתו גם בכיוון ההפוך: הורצו שלוש פעמים מול
הקוד *לפני* התיקון (זמנית, לא נשמר) ונכשלו בכל פעם, מה שמאשר שהן באמת
תופסות את הבאג ולא רק "ירוקות באקראי".
