# עיצוב חדש — ממתקייה — Tests

## Coverage
- "רקע קבוע, בלי תלות ב-light/dark" → `tests/e2e/candy-redesign.spec.ts` › שתי בדיקות
  תחת "candy-redesign — fixed pink background..." (light + dark OS emulation)
- "כל המסכים מציגים את אותו רקע" → `grade/topic screen shows the same background`,
  `practice/notebook screen shows the same background`
- "כותרות בגופן עגול" → `headings use the rounded font`
- "כרטיסים עם פינות מעוגלות" → `main cards show clearly rounded corners`
- "מסגרת מנוקדת סביב אזור הכתיבה" → `the notebook's writing area is framed by a
  dotted accent-colored border`
- "ניגודיות WCAG AA" → `text contrast against the background meets WCAG AA (>= 4.5:1)`
- "ביטויי חשבון נשארים LTR" → `arithmetic expressions still render left-to-right`
- "אין בורר/הגדרה/localStorage לעיצוב" → `no theme picker, setting, or localStorage
  key for the design exists`

## How to run
`npm run test:e2e`

## Status
`500/501` נכון ל-2026-11-20, ריצה בודדת ונקייה (10/10 ב-`candy-redesign.spec.ts`
עצמו). הכשל היחיד — `grade8-angles-congruence.spec.ts` — הוא ה-flake הסטטיסטי
הקיים-מראש והמתועד כבר ב-CLAUDE.md, לא קשור לפיצ'ר הזה.

**מלכודת תפעולית שתפסה המון זמן בדרך, שווה לתעד כדי לא לחזור עליה:** שרת-פיתוח
שהופעל ידנית (`npm run dev`, בלי משתני הסביבה של הבדיקות) נשאר רץ על פורט 5173.
`playwright.config.ts`'s `reuseExistingServer` השתמש בו במקום להפעיל שרת משלו —
כך שה-`VITE_NOTEBOOK_SERVER_URL` הקבוע-ובלתי-פתיר של הבדיקות (שמייצר כתובת
שה-mocking תמיד תופס) לא היה בתוקף, וכל בדיקה שעוברת דרך זרימת "שלח למורה"
(עשרות קבצים) נכשלה ב-timeout על "לא הצלחנו לשלוח את הדף". שתי ריצות מלאות
(28 ו-52 דקות, עם אותה רשימת כשלים כמעט זהה בשתיהן) בוזבזו על זה לפני שהאבחון
הנכון נמצא. הריצה הנקייה האמיתית (שרת שה-Playwright מנהל בעצמו) לקחה 3.5 דקות.
**הכלל**: תמיד לוודא שאין שרת-פיתוח ידני רץ על 5173 לפני `npm run test:e2e`.
