# שיעור לעומת תרגול — מסך לימוד לכל נושא — Tests

## Coverage
מיפוי Acceptance Criteria (כולל שתי הרוויזיות מ-2026-08-21 — כמה דוגמאות, ואז
דפדוף עמוד-אחר-עמוד במקום גלילה) → בדיקה, כולן ב-`tests/e2e/topic-lesson.spec.ts`:

- לכל נושא יש כניסה נפרדת לשיעור ולתרגול; הכרטיס עצמו ללא שינוי → `a topic card
  still enters practice directly, unchanged, with a separate lesson button beside it`
- מסך השיעור אינו מציג שדה קלט/כפתור בדיקה → `the lesson screen has no answer
  input and no check button`
- מסך השיעור מציג תוכן לימודי אמיתי → `the lesson screen shows real learning
  content, not a blank screen`
- העמוד האחרון: הכפתור השני אומר "→ לתרגול" ונכנס לתרגול של אותו נושא →
  `the last page's '→ לתרגול' enters practice for the same topic`
- "חזרה" מחזיר לרשימת הנושאים של אותו תלמיד → `'← חזרה' from the lesson screen
  returns to the same student's topic list`
- נושא `adaptive` (רותם/עומר) מדפדף דרך דוגמה אחת לכל דרגת קושי: עמוד ראשון בלי
  "← הקודם", עמודים אמצעיים עם שני הכפתורים ותוכן/כותרת משתנים, עמוד אחרון עם
  "← הקודם" אבל "→ לתרגול" במקום "הבא →", וחזרה מהעמוד האחרון מציגה את התוכן
  הנכון (לא נתקעת) → `an adaptive topic's lesson pages through one worked
  example per difficulty tier, one at a time`
- נושא לא-`adaptive` (מיקה) — דוגמה אחת, בלי כותרת עמוד ובלי כפתורי הקודם/הבא →
  `a non-adaptive topic's lesson shows exactly one example, with no page
  heading or prev/next buttons`
- נושא לא-`reviewed` לא מציע כפתור שיעור → `wherever a topic is still
  unreviewed, it offers no lesson button either` (בדיקה מותנית, אותה מוסכמה
  כמו `review-status.spec.ts` — אין כרגע נושא לא-`reviewed`).

**עודכן ברוויזיה ב׳:** שתי בדיקות מהסבב הקודם הניחו שכל הדוגמאות מוצגות בבת
אחת בגלילה — נכתבו מחדש לזרימת הדפדוף: הבדיקה שנקראה בעבר
`"moving from lesson to practice..."` הפכה ל-`"the last page's '→ לתרגול'..."`
(מדפדפת עד הסוף לפני שהיא לוחצת), והבדיקה `"...shows one worked example per
difficulty tier..."` נכתבה מחדש לבדוק דפדוף עמוד-אחר-עמוד במקום ספירת כל
הדוגמאות בבת אחת.

## How to run
`npm run test:e2e`

## Status
עבר, 2026-08-21 (רוויזיה ב׳) — `tests/e2e/topic-lesson.spec.ts` בפני עצמו:
**8/8**. סוויטת ה-e2e המלאה רצה אחר כך, ריצה בודדת ונקייה: **246/246 עברו**.
`npm run build`/`npm run lint` נקיים.
