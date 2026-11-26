# מסכים שמתאימים למסך בלי גלילה — Tests

## Coverage
מתוך `product-spec.md`'s Acceptance Criteria — כל בדיקה ב-
`tests/e2e/no-scroll-screens.spec.ts`, מודדת `document.documentElement.scrollHeight`
מול `window.innerHeight` עם `devices['iPhone 13']` (390×664, הדפדפן האמיתי) מול שרת-dev
אמיתי — לא ניחוש ולא כלי המרה-גודל-חלון של תוסף הדפדפן:

- "TopicPicker מתאים למקרה הגרוע ביותר (7 נושאים, כיתה ח׳)" →
  `TopicPicker fits without scrolling for a grade with the most topics (ח, 7 topics)`
- "StudentPicker מתאים ל-5 תלמידים (מטרת ה-design, לא רק ל-3 האמיתיים)" →
  `StudentPicker fits without scrolling for 5 students`
- "מסכים שכבר התאימו היום לא נשברים" (רגרסיה: StudentPicker ריק, GradePicker,
  TopicPicker עם 5 נושאים — כיתה א׳) →
  `StudentPicker and TopicPicker still fit at today's real scale (regression guard)`
- "History לא גולל בעמוד כולו לעולם, לא משנה כמה רשומות הצטברו — רק האזור
  הפנימי גולל, והכותרת (קישור-חזרה + שם התלמיד/ה) נשארת גלויה" (25 רשומות
  מוזרקות — שימוש אמיתי לאורך שבועות, לא תרחיש-קיצון מלאכותי) →
  `History never requires scrolling the whole page, however many records have piled
  up — only its own list scrolls, and the header stays put`
- "מצב-ריק של History לא נפגע מהעטיפה החדשה" →
  `History's empty state is unaffected by the new scrolling region`

כל חמש הבדיקות אינן נגזרות מקריאת קוד המימוש — הן מודדות את ההתנהגות
בפועל בדפדפן, לפי המספרים הקונקרטיים ש-`design.md`/`architecture.md` כבר
אימתו (7 נושאים, 5 תלמידים, 25 רשומות).

## How to run
```bash
npx playwright test --workers=1
```
(לא `npm run test:e2e` הרגיל — הוא מריץ כמה workers גם בהרצה בודדת, ראו
CLAUDE.md "שתי ריצות מקבילות... אינן שתי מדידות".)

**הערה סביבתית:** אם worktree מקביל אחר כבר תפס את פורט `5173`
(`reuseExistingServer: true` ב-`playwright.config.ts` ישתמש בו בטעות), יש
לבדוק זאת לפני שסומכים על התוצאה (`.app-version-number` בעמוד מול
`package.json` של ה-worktree הנוכחי) ולהרים שרת-dev זמני על פורט אחר אם
לא תואם — ראו `architecture.md`'s הערה התפעולית.

## Status
**ירוק, 2026-11-25.** ריצה בודדת ונקייה מול שרת-dev אמיתי (על פורט נפרד,
כדי לוודא שלא נמדד שרת של worktree אחר): `404 passed, 2 skipped, 0 failed`
(כולל 5 הבדיקות החדשות; ה-`2 skipped` קיימים-מראש ולא קשורים לפיצ'ר הזה).
`npm run build` ו-`npm run lint` עברו נקי (ראו `architecture.md`'s
Implementation Notes).
