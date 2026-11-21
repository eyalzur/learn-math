# קישורי-טקסט (חזרה / החלף תלמיד / ההתקדמות שלי) — Tests

## Coverage
רוב ה-acceptance criteria הם שיפוט-חזותי ("נראה קל יותר") ולא assertable משמעותית.
מה שכן נבדק:

- קישור-טקסט לא מקבל את צל-המדף הכבד של כפתור-פעולה →
  `tests/e2e/back-link-redesign.spec.ts` ›
  `a text-link does not carry the same heavy box-shadow a real action button gets`
- רווח אנכי אמיתי כששני קישורים מופיעים יחד →
  `two stacked links have a real gap between them, not a crowded one`
- הקישור ממשיך לעבוד בפועל (לא רק שינוי-מראה) →
  `a text-link still works — clicking it still navigates`
- כפתורי-פעולה אמיתיים לא נפגעו (regression guard על ה-exclusion) →
  `real action buttons are unaffected — regression guard`

## How to run
`npm run test:e2e` (או `npx playwright test tests/e2e/back-link-redesign.spec.ts`
לריצה ממוקדת).

## Status
ירוק — 336/337 בסוויטה המלאה נכון ל-2026-11-21 (ריצה בודדת ונקייה). הכשל היחיד
(`grade8-angles-congruence.spec.ts`) הוא flake מתועד מראש, לא קשור. ארבעת הבדיקות
הייעודיות של הפיצ'ר הזה: 4/4.
