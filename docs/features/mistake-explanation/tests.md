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

## Status
✅ 10/10 עוברות נכון ל-2026-08-13 (7 של הפיצ'ר הזה + 3 של הודעת הציון המושלם).
