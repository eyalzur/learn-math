# שיעור לעומת תרגול — מסך לימוד לכל נושא — Tests

## Coverage
מיפוי Acceptance Criteria (כולל הרוויזיה מ-2026-08-21) → בדיקה, כולן ב-
`tests/e2e/topic-lesson.spec.ts`:

- לכל נושא יש כניסה נפרדת לשיעור ולתרגול; הכרטיס עצמו ללא שינוי → `a topic card
  still enters practice directly, unchanged, with a separate lesson button beside it`
- מסך השיעור אינו מציג שדה קלט/כפתור בדיקה → `the lesson screen has no answer
  input and no check button`
- מסך השיעור מציג תוכן לימודי אמיתי → `the lesson screen shows real learning
  content, not a blank screen`
- אפשר לעבור שיעור→תרגול בלי לאבד מקום → `moving from lesson to practice and
  back to the topic list keeps the same student and topic`
- "חזרה" מחזיר לרשימת הנושאים של אותו תלמיד → `'← חזרה' from the lesson screen
  returns to the same student's topic list`
- נושא `adaptive` (רותם/עומר) מציג דוגמה אחת לכל דרגת קושי, ממוספרת נכון ובסדר
  עולה → `an adaptive topic's lesson shows one worked example per difficulty
  tier, numbered in order`
- נושא לא-`adaptive` (מיקה) ממשיך עם דוגמה אחת, בלי כותרת "דוגמה N מתוך M" →
  `a non-adaptive topic's lesson shows exactly one example, with no 'דוגמה N
  מתוך M' heading`
- נושא לא-`reviewed` לא מציע כפתור שיעור → `wherever a topic is still
  unreviewed, it offers no lesson button either` (בדיקה מותנית, אותה מוסכמה
  כמו `review-status.spec.ts`: אין כרגע אף נושא לא-`reviewed`, אז זה עובר בלי
  לבדוק תוכן אמיתי — נשאר מוכן ליום שנושא יחזור ל-`reviewed: false`).

## How to run
`npm run test:e2e`

## Status
עבר, 2026-08-21 — `tests/e2e/topic-lesson.spec.ts` בפני עצמו: **8/8**. סוויטת
ה-e2e המלאה רצה אחר כך, ריצה בודדת ונקייה: **244/244 עברו** (236 קיימות + 8
חדשות). `npm run build`/`npm run lint` נקיים.
