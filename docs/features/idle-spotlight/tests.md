# זרקור-מנוחה — Tests

## Coverage
Most acceptance criteria describe a visual/motion *feel* ("עדין", "לא מסיח") that isn't
meaningfully assertable in e2e. The ones that are:

- בדיוק הדגשה אחת פעילה בכל רגע, וכל כרטיס מקבל תורו → `tests/e2e/idle-spotlight.spec.ts`
  › `exactly one card is highlighted at a time, and every card gets a turn`
- `prefers-reduced-motion` מכבה את שתי השכבות לגמרי →
  `prefers-reduced-motion removes both the card cycle and the background glow`
- מושהה ב-hover/focus/active →
  `hovering, focusing, or pressing a card pauses its animation`
- מושהה ברחבי המסך כש-דיאלוג מודאלי פתוח →
  `an open dialog pauses the spotlight screen-wide`
- רגרסיה: אנימציה מתמשכת לא שוברת יציבות-קליק אמיתי (זה בדיוק מה שקרה בפועל פעמיים
  תוך-כדי הפיתוח, ראו architecture.md's Implementation Notes) →
  `a continuous ambient animation doesn't destabilize repeated real clicks — regression guard`,
  `the spotlight does not interfere with answering — a real streak stays fast`

לא נבדק ישירות (שיפוטי, לא assertable משמעותית): עדינות האפקט בעין, קצב-ה-28 שניות
של זוהר-הרקע, "מתחיל מההתחלה בכל מסך חדש".

## How to run
`npm run test:e2e` (או `npx playwright test tests/e2e/idle-spotlight.spec.ts` לריצה
ממוקדת).

## Status
ירוק — 338/339 בסוויטה המלאה נכון ל-2026-11-21, ריצה בודדת ונקייה. הכשל היחיד
(`grade8-angles-congruence.spec.ts`) הוא flake מתועד מראש, לא קשור (ראו
`docs/features/grade8-angles-congruence/status.md`). ששת הבדיקות הייעודיות של
הפיצ'ר הזה עצמו: 6/6.

שתי בדיקות נכתבו תחילה עם הנחות-ניווט שגויות (level-picker עבור כיתה ו׳, שכבר הוחלף
במסלול-אדפטיבי ישיר; מספר-שאלות קבוע לסגנון כיתה א׳) ותוקנו מול ההתנהגות האמיתית של
האפליקציה (לא נוחשה) — לא באג במימוש, רק בדיקה שהניחה מבנה-ניווט ישן.
