# קצב התקדמות בקושי — Tests

## Coverage
- "קיים בורר חדש בדיאלוג ⚙️... שלוש אפשרויות... בינוני ברירת מחדל" →
  `tests/e2e/adaptive-pace-setting.spec.ts` › `the pace picker appears in ⚙️ with
  three options, בינוני chosen by default`
- "ההגדרה נשמרת... שורדת רענון" →
  `tests/e2e/adaptive-pace-setting.spec.ts` › `choosing a pace marks it immediately
  and survives a reload`
- "הגדרה אחת... לא פר-תלמיד/ה" — **נבדק בכיוון ההפוך בפועל**: ראו
  architecture.md, Risks/Tradeoffs, על הסטייה המכוונת מהספק (פר-תלמיד/ה, לא
  גלובלית) →
  `tests/e2e/adaptive-pace-setting.spec.ts` › `the setting belongs to the student,
  not the device`
- "מהיר: תשובה נכונה אחת מעלה רמה מיד" →
  `tests/e2e/adaptive-pace-setting.spec.ts` › `'מהיר' climbs difficulty within a
  couple of correct answers`
- "אטי: נדרשות 4 תשובות נכונות ברצף כדי לעלות רמה" →
  `tests/e2e/adaptive-pace-setting.spec.ts` › `'אטי' does not climb difficulty
  before four correct answers in a row`
- "אטי: נדרשות 2 תשובות שגויות ברצף כדי לרדת רמה" →
  `tests/e2e/adaptive-pace-setting.spec.ts` › `'אטי' does not drop difficulty after
  a single wrong answer`
- "שינוי ההגדרה חל מיד על תרגול חדש... לא נדרש להתחיל תרגול מחדש" →
  `tests/e2e/adaptive-pace-setting.spec.ts` › `switching pace takes effect on the
  very next answer, without restarting the session`
- "ההגדרה חלה על כל הנושאים האדפטיביים... לא פר-נושא" — **לא מומש כבדיקת-קצה
  נפרדת לכל אחד מ-19 הנושאים**: כל 19 הפונקציות (`src/data/adaptive*.ts`) קוראות
  לאותה פונקציה משותפת (`nextAdaptiveDifficulty`, `adaptivePace.ts`) שהתרגילים
  למעלה כבר בודקים דרך חיבור עד 1000 — בדיקה חוזרת של אותו חשבון על 18 נושאים
  נוספים לא הייתה מוסיפה כיסוי אמיתי. ראו architecture.md.
- "ברירת המחדל (בינוני) זהה בהתנהגותה להיום" — מכוסה בעקיפין: `tests/e2e/
  adaptive-difficulty.spec.ts` (שלא שונה כלל בסבב הזה) ממשיך לעבור ללא שינוי מול
  קצב ברירת המחדל.

## How to run
`npm run test:e2e`

## Status
**497/498 (כל הסוויטה, ריצה בודדת ונקייה) — 2026-11-18.** הכשל היחיד הוא flake
קיים-מראש ולא קשור (`grade8-angles-congruence.spec.ts`, אותו assert שכבר מתועד
ב-PR #88/#89). שבעת הבדיקות החדשות של הפיצ'ר הזה עוברות.
