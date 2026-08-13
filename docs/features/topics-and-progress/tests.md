# בחירת נושא והתקדמות אישית — Tests

## Coverage
`tests/e2e/topics-and-progress.spec.ts`:
- "נושאים ככפתורים, נושא מציג שלוש רמות" →
  `picking a student shows the grade's topics, and a topic shows its levels`
- "שלוש רמות ועשר שאלות לכל נושא" →
  `grade 1 has three levels of ten questions for every topic` (עובר על כל 5 הנושאים
  ו-15 הרמות)
- "תרגול מהנושא הנבחר בלבד" → `a level practises only its own topic` (מוודא שכל 10
  השאלות ב"חיסור עד 10" הן באמת חיסור - זו כל המטרה של בחירת נושא)
- "חזרה רמה → נושא → תלמיד" → `you can walk back from level to topic to student`
- "רשומה עם תאריך, נושא, רמה וציון, ששורדת רענון" →
  `finishing a practice records the topic, level and score, and it survives a reload`
- "מהחדש לישן" → `history is newest first`
- "היסטוריה נפרדת לכל תלמיד/ה" → `each student's history is their own`
- "היסטוריה ריקה עם הודעה" →
  `an empty history says so instead of showing a blank screen`

## בדיקות קיימות שעודכנו
הניווט של כיתה א' עמוק בשלב אחד, ולכן כל הבדיקות שפתחו רמה קיבלו עוזר `openLevels`
שמוסיף את לחיצת הנושא רק לכיתה שדורשת אותה. `students-and-syllabus.spec.ts` נכתב
מחדש כך שבדיקת "שלוש רמות של עשר שאלות" ובדיקת שיוך הנושאים עובדות מול שתי צורות
הניווט, במקום להניח את הישנה.

## How to run
`npm run test:e2e`

## Status
✅ 32/32 עוברות נכון ל-2026-08-13 (8 של הפיצ'ר הזה + 24 קיימות).
