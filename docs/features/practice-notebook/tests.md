# מחברת תרגול — Tests

## Coverage
Map of acceptance criteria (`product-spec.md`) → test in `tests/e2e/practice-notebook.spec.ts`:

- גישה למחברת עם משטח ציור → `there is access to a notebook with a writing surface`
- אפשר להוסיף דף חדש → `a new page can be added`
- אפשר להסיר דף קיים, לא את האחרון → `a page can be removed, but not the last one`
- אפשר לעבור בין דפים → `pages can be navigated back and forth`
- הבדיקה הקיימת של התשובה לא משתנה (שאלה/קלט נשמרים, "בדיקה" ממשיך לעבוד) →
  `closing the notebook returns to the same question with the typed answer intact, and checking still works`
- מה שנכתב במחברת לא משפיע על נכון/לא-נכון →
  `writing in the notebook does not change whether an answer is marked right or wrong`
- אין כפתור שליחה/ייצוא במסך המחברת → `the notebook has no submit or export action`

## How to run
`npm run test:e2e`

## Status
כל 253 הבדיקות בסוויטה עוברות (2026-08-28), כולל 7 החדשות של הפיצ'ר הזה.

שני כשלים אמיתיים נתפסו ותוקנו תוך כדי כתיבת הבדיקות — לא באגי מימוש, אלא
הנחה שגויה בבדיקה עצמה: `harvestFirstAnswer` (ופעם נוספת בגוף בדיקה אחת)
הניחו ש-"נסו שוב" מופיע אחרי תשובה שגויה בודדת — בפועל הוא מופיע רק במסך
הסיכום אחרי שכל השאלות ברמה נענו (התנהגות קיימת, לא קשורה למחברת). תוקן
ע"י אתחול מחדש דרך `openLevel` במקום הכפתור.
