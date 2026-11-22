# אנימציית-כניסה למסך — Tests

## Coverage
רוב ה-acceptance criteria הם שיפוט-חזותי ("נראה כמו רגע-כניסה אחד מאוחד")
ולא assertable משמעותית. מה שכן נבדק:

- כניסה אמיתית למסך-תפריט מראה opacity עולה בפועל (לא רק מוצהר ב-CSS) →
  `tests/e2e/screen-entrance-animation.spec.ts` ›
  `a genuine menu-screen entry fades opacity up from 0`
- `prefers-reduced-motion` מכבה לגמרי →
  `prefers-reduced-motion disables the entrance fade`
- לא חל בתוך מסך השאלה/תרגול →
  `the entrance fade does not apply inside the practice screen itself`
- רגרסיה: ניווט רגיל (כניסה/חזרה/כניסה-מחדש) ממשיך לעבוד →
  `re-entering a screen keeps navigation working — regression guard`

## How to run
`npm run test:e2e` (לריצה מקומית אמינה: `npx playwright test --workers=1` —
ראו CLAUDE.md, "אותו מנגנון קורה גם בלי שתי ריצות נפרדות", למה זה קריטי).

## Status
ירוק — 342/343 בסוויטה המלאה נכון ל-2026-11-21, **ריצה בודדת עם `--workers=1`**
(ריצה ראשונה עם ברירת-המחדל המקומית, 4 worker-ים, הראתה 2 כשלים נוספים
שהתבררו כתחרות-משאבים בין ה-workers עצמם, לא רגרסיה אמיתית — ראו CLAUDE.md
לפרטים). הכשל היחיד שנשאר (`grade8-angles-congruence.spec.ts`) הוא flake
מתועד-מראש, לא קשור. ארבעת הבדיקות הייעודיות של הפיצ'ר הזה: 4/4.
