# התקנת האפליקציה כ-PWA באייפון ובאנדרואיד — Tests

## Coverage
- "מניפסט נגיש עם השדות הנכונים" → `tests/e2e/pwa-install.spec.ts` › `the page
  links a resolvable manifest with the right top-level fields`
- "איקוני המניפסט מכסים את הגדלים/המטרות הנדרשים, וכל קובץ נגיש בפועל" →
  `tests/e2e/pwa-install.spec.ts` › `the manifest's icons cover the required
  sizes/purposes and every icon file actually resolves`
- "תגיות-iOS (apple-touch-icon, capable, status-bar-style, title) קיימות עם
  הערכים הנכונים" → `tests/e2e/pwa-install.spec.ts` › `iOS install tags are
  present with the right values`
- "צבע-הזהות עקבי" → `tests/e2e/pwa-install.spec.ts` › `theme-color meta tag
  matches the manifest's theme_color`
- "האפליקציה הקיימת ממשיכה לעבוד בדיוק כמו היום" → `tests/e2e/pwa-install.spec.ts`
  › `the app keeps working completely normally in an ordinary browser tab`

**לא נבדק, ובכוונה:** זרימת-ההתקנה עצמה (באנר-ההתקנה של Chrome, "הוסף למסך
הבית" ב-Safari) — זו אינטראקציית דפדפן/מערכת-הפעלה אמיתית שאין ל-Playwright
דרך לכונן אותה; שום בדיקת e2e לא יכולה לאשר "הטלפון הציע להתקין". מה שניתן
לבדוק באמת — שהמניפסט/האיקונים/התגיות קיימים ונכונים — הוא מה שנבדק.

## How to run
`npm run test:e2e` (או ממוקד: `npx playwright test tests/e2e/pwa-install.spec.ts`)

## Status
ריצה מלאה בודדת ונקייה, 2026-10-27: **495/496 עברו**. חמשת הבדיקות החדשות של
הפיצ'ר הזה עברו כולן. הכשל היחיד — `grade8-angles-congruence.spec.ts` ›
"covers angle questions..." — **לא קשור לפיצ'ר הזה** (מניפסט/איקונים/תגיות-
HTML, שום נגיעה בכיתה ח׳/זוויות). זה אותו flake קיים-מראש ומתועד (ראו
CLAUDE.md/PR #77, ו-`docs/features/grade8-angles-congruence/status.md`) —
נכשל שוב בדיוק על אותו assert (`"נצבים"`). **הערה:** ה-flake הזה נכשל כמעט
בכל ריצה מלאה בסשנים האחרונים (ראו גם `docs/features/adaptive-lesson-start/tests.md`)
— ככל שהוא ממשיך לחזור, ראוי לבדיקה שורשית נפרדת, לא רק אישור-חוזר.
