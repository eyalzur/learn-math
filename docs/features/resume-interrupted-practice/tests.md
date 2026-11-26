# תרגול שנקטע חוזר לנקודה המדויקת — Tests

## Coverage
כל הבדיקות ב-`tests/e2e/resume-interrupted-practice.spec.ts`:
- "אותן שאלות שכבר הוצגו, בדיוק" → `leaving before answering the question on screen shows that exact same question again, not a new one` (נושא אדפטיבי, חיבור עד 1000)
- "כניסה חוזרת שקטה, בלי מסך/שאלה" → `resuming is silent — no dialog or extra screen...` (סגנון, חיבור וחיסור עד 20)
- "אותה ספירת נכון/לא-נכון" → `the running tally survives an interruption and carries into the final result` (14 מתוך 15 בסיום)
- "סיום תקין לא משאיר ריצה לחידוש" → `a topic finished normally does not leave a resumable state...`
- "נושא אחר לא נוגע בריצה הנקטעת" → `practising a different topic in between does not clear or corrupt...`
- "התיישנות 24 שעות" → `a saved run older than 24 hours is not offered back...` (חותמת-הזמן נכתבת ישירות ל-`localStorage`, כמו התקדים ב-`adaptive-lesson-start.spec.ts`)

הנתיב "בורר רמות" (`.level-card`) אינו נבדק: אין היום נושא בתוכן האמיתי שמגיע אליו (כל נושא לא-אדפטיבי כולל לפחות 2 סגנונות, ולכן עובר דרך בורר הסגנונות). נתיב הסגנון מכסה את אותה צורת קוד (מערך שאלות קבוע).

## בדיקות קיימות שעודכנו
`mistake-explanation.spec.ts` ו-`teaching-explanations.spec.ts` ("a correct answer ... no explanation") נשענו על "← חזרה" + כניסה מחדש לאותו סגנון כדי לקבל שוב את שאלה 1. הפיצ'ר הזה משנה את זה במכוון (כניסה מחדש ממשיכה), ולכן הן עברו להתחיל סשן חדש לגמרי (תלמיד/ה חדש/ה). הטענה עצמה לא השתנתה.

## How to run
`npx playwright test --workers=1` (לא `npm run test:e2e` — ראו CLAUDE.md). בסשן הזה פורט 5173 היה תפוס ע"י שרת-dev מ-checkout אחר, ולכן הריצה הייתה על פורט מבודד (5199) דרך קובץ-קונפיג זמני שלא נכנס לקומיט.

## Status
2026-11-25: `405` עברו, `2` דולגו (קיימים), `0` נכשלו — ריצה בודדת ונקייה, `--workers=1`. build ו-lint נקיים.

**מלכודת שנתגלתה בדרך:** ריצה ראשונה "נכשלה" `6/6` כי Playwright עשה reuse לשרת-dev של checkout אחר (קוד בלי הפיצ'ר), כך שהבדיקות רצו על הקוד הלא נכון. זו אותה משפחה של "מדידה שלא נמדדה" מ-CLAUDE.md.
**תיקון שנתגלה ב-QA:** חסרה רשומה ב-`src/data/changelog.ts` לגרסה `1.59.0` (בדיקת `version-log` תפסה). נוספה.
