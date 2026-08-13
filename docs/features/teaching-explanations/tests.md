# מורה שמסבירה — Tests

## Coverage
`tests/e2e/teaching-explanations.spec.ts`:
- "לכל 90 השאלות יש הסבר עם שלבים ודימוי" →
  `every question in every grade explains itself and offers an analogy` (סורק את כל
  90 השאלות בשלוש הכיתות ובתשע הרמות)
- "ההסבר מתייחס למספרים של השאלה" →
  `the explanation refers to the numbers of the failed question`
- "בתשובה נכונה אין הסבר" → `a correct answer still shows no explanation`
- רגרסיה: `arithmetic inside explanations is never left in the prose element` —
  עובר על כל 90 השאלות ומוודא שאין ביטוי חשבוני שנשאר בשדה הטקסט. זו הבדיקה שתופסת
  את הבאג המרכזי של הפיצ'ר הזה.

## למה אין בדיקה ל"מתאים לגיל"
הקריטריון "הדימוי מותאם לגיל" הוא שיפוט אנושי. הבדיקה הראשונה שכתבתי התאימה מילות
מפתח לכל כיתה, והיא נכשלה על `בלון` שאינו תת-מחרוזת של `בלונים` - כי אותיות סופיות
בעברית משנות צורה. זה הבהיר שהתאמת מילות מפתח על טקסט חופשי הייתה נשברת בכל עריכת
תוכן בלי לתפוס אף בעיה אמיתית.

במקומה נבדקת התכונה האובייקטיבית שמאפשרת התאמה לגיל:
`every analogy is written for its own question, not reused` - כל 90 הדימויים שונים
זה מזה ואף אחד אינו קצר מדי. ההתאמה לגיל עצמה נבדקת בעין אנושית מול הצילומים ב-PR.

## How to run
`npm run test:e2e`

## Status
✅ 24/24 עוברות נכון ל-2026-08-13 (5 של הפיצ'ר הזה + 19 קיימות).
