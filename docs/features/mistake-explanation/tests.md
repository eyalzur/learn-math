# הסבר דרך פתרון אחרי טעות — Tests

## Coverage
מיפוי קריטריוני הקבלה ל-`tests/e2e/mistake-explanation.spec.ts`:

- "מוצג הסבר בנוסף להודעה ולתשובה הנכונה" →
  `a wrong answer shows an explanation alongside the correct answer`
- "מוצג אוטומטית מיד, בלי לחיצה" →
  `the explanation appears without any extra click`
- "מציג שלבים ולא רק תוצאה" →
  `the explanation shows working steps, not just the final answer`
- "מתייחס למספרים של התרגיל הספציפי" →
  `the explanation refers to the numbers of the problem that was failed`
- "בתשובה נכונה אין הסבר" → `a correct answer shows no explanation`
- "לכל תרגיל בכל ששת התרגולים יש הסבר" →
  `every problem in every exercise set has an explanation` (עובר על כל 60 התרגילים,
  עונה תשובה שגויה בכל אחד, ומוודא שיש בלוק הסבר עם שלב אחד לפחות)

בנוסף, בדיקת רגרסיה שלא נובעת מקריטריון קבלה אלא מהערת ה-RTL ב-design.md:
- `arithmetic inside the explanation stays left-to-right` — מוודאת ש-`direction`
  המחושב של כל ביטוי חשבוני בהסבר הוא `ltr`. זה בדיוק הבאג שכבר קרה פעם באפליקציה
  במסך התרגול, ובלי הבדיקה הזו הוא יכול לחזור בשקט בכל שינוי CSS עתידי.

## How to run
`npm run test:e2e`

## עדכון אחרי המבנה החדש
הבדיקות נכתבו מחדש לניווט תלמיד → כיתה → רמה. הבדיקה שעברה על כל התרגילים הוחלפה
בבדיקה דו-כיוונית: כל שאלה שהיא ביטוי חשבוני טהור *חייבת* לקבל בלוק הסבר עם שלבים,
וכל שאלה אחרת *חייבת* לא לקבל בלוק בכלל. היא עוברת על כל 90 השאלות בשלוש הכיתות.

## Status
✅ 20/20 עוברות נכון ל-2026-08-13 (7 של הפיצ'ר הזה + 13 של שאר הפיצ'רים).
