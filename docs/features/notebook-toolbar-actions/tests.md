# כפתורי "שלח למורה" ו"הבא" מחוץ לסרגל הכלים — Tests

## Coverage
כל הבדיקות ב-`tests/e2e/notebook-toolbar-actions.spec.ts`:
- קריטריונים 1, 2 (אין "שלח למורה" בסרגל; הכפתור קיים ומשתנה בין לא פעיל לפעיל) → `the toolbar has no 'שלח למורה' button, but the button exists on screen`, `'שלח למורה' is disabled on an empty page and enabled after drawing`
- קריטריון 3 ("הבא" מחוץ לסרגל ומקדם) → `after a reading, 'הבא' is outside the toolbar and moves on to the next question`
- קריטריון 4 (נגיש במסך מלא בלי גלילה) → `in fullscreen the button is visible without scrolling and the toolbar still has no action`
- קריטריון 5 → `chose fullscreen → the next question starts in fullscreen` (כולל ש-תוצאה מוצגת בפריסה רגילה, קריטריון 8)
- קריטריון 6 → `never chose fullscreen → the next question is not in fullscreen`
- קריטריון 7 → `left fullscreen by hand (✕) → the next question is not in fullscreen`
- קריטריון 9 → `the toolbar's other controls still work (page add, tools)`

לא נשברה אף בדיקה קיימת; לא נדרש תיקון בהן (הן מוצאות את הכפתור לפי שם נגיש).

## How to run
`npm run test:e2e`

## Status
עובר ב-2026-10-02: ריצה בודדת של הסוויטה המלאה, `394/394`.
