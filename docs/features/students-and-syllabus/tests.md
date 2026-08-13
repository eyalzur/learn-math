# משתמשים, סילבוס ורמות — Tests

## Coverage
מיפוי קריטריוני הקבלה ל-`tests/e2e/students-and-syllabus.spec.ts`:

- "מסך בחירה עם שלושה תלמידים, שם וכיתה" →
  `opens on the student picker with all three students and their grades`
- "אחרי הבחירה מוצגים נושאי הכיתה ושלוש רמות" →
  `picking a student shows that grade's syllabus and three levels`
- "בדיוק שלוש רמות לכל כיתה, עשר שאלות לכל רמה" →
  `every grade has exactly three levels of ten questions each` (עובר על שלוש הכיתות)
- "כל שאלה משויכת לנושא מהסילבוס של כיתתה" →
  `every question in every level belongs to its own grade's syllabus`
- "בחירת רמה פותחת תרגול, ובסיום מסך סיכום" →
  `picking a level runs its ten questions and ends on a score summary`
- "אפשר לחזור ולהחליף משתמש" → `you can switch student from the grade screen`
- "הבחירה האחרונה נשמרת" → `the chosen student is remembered across a reload`
  ו-`switching student is also forgotten across a reload`

בדיקות רגרסיה שנובעות מהערות הכיווניות ב-design.md:
- `word problems read right-to-left and their algebra stays left-to-right` — מוודאת
  ששאלה מילולית היא RTL אבל שהביטוי האלגברי בתוכה מבודד ל-LTR. בלי הבידוד
  `3(x + 2)` מוצג `3)2 + x(` - זה קרה בפועל במהלך הפיתוח.
- `a bare expression is shown left-to-right with a trailing equals sign` — הצד השני
  של אותו כלל.

## הערה על שיטת הבדיקה
בדיקות הציון המושלם (`perfect-score-message.spec.ts`) נכתבו מחדש כדי לעבוד מול הניווט
החדש. הן משחקות את הרמה פעם אחת עם תשובות שגויות, אוספות את התשובות הנכונות מתוך שורת
המשוב, ואז לוחצות "נסו שוב" ומשחקות שוב נכון. הן לא מייבאות את נתוני השאלות - כך
הבדיקה נשארת נאמנה למה שתלמיד/ה רואים בפועל, ולא צריכה לשכפל את החשבון של שברים,
משוואות וגיאומטריה.

היוצא מן הכלל היחיד הוא בדיקת שיוך הנושאים, שכן קוראת את הנתונים ישירות - שם *התוכן*
הוא מושא הבדיקה ולא ההתנהגות, ואי אפשר לראות מהמסך לאיזה נושא שאלה משויכת.

## How to run
`npm run test:e2e`

## Status
✅ 13/13 עוברות נכון ל-2026-08-13 (10 של הפיצ'ר הזה + 3 של הודעת הציון המושלם).
