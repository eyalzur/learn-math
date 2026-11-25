# מכסת שיעורים שבועית — Tests

קובץ: `tests/e2e/weekly-lesson-cap.spec.ts` (viewport iPhone 13, 390x664).

| קריטריון | בדיקה |
|---|---|
| 7: מונה, בלי גלילה | "the topics screen shows how many lessons are left, without scrolling" |
| 2: ברירת מחדל 5 | "production default is 5 free lessons a week" |
| 1: שיעור = תרגול שהסתיים; יציאה באמצע לא נספרת | "finishing a practice uses one lesson" |
| 3, 4: חסימה והודעה, הסתכלות בשיעור עדיין עובדת | "at zero, starting a practice is blocked..." |
| 5, 9: שער הורים, חבילה חינם, בלי שדות תשלום, תרגול מתחיל שוב | "the parent gate rejects a wrong answer..." |
| 6: פקיעה בסוף שבוע | "extra lessons belong to their week and expire" |
| 5: פר תלמיד/ה | "extra lessons are per student" |
| דיאלוג נכנס ב-664px | "the lessons dialog fits a short phone" |

עקיפת מכסה לשאר הבדיקות: `VITE_FREE_LESSONS_PER_WEEK=9999` ב-`playwright.config.ts`;
הבדיקות כאן מחזירות מכסה ממשית דרך המפתח `learn-math:free-lessons-override`.

**לא נבדק:** קפיצת שבוע אמיתית (ראשון 00:00) — נבדקת רק דרך extras ישנים; הקראה בקול בפועל.
