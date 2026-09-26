# יומן מקרים שבהם המורה טעתה — Tests

## Coverage

הפיצ'ר הזה הוא שרת-בלבד, בלי UI (design.md) — אין דרך ואין טעם לבדוק ב-e2e
שרשומה נשמרה בפועל ב-Firestore (גם אין Firestore אמיתי בסביבת הבדיקות, וגם
הלקוח לא יודע/לא אמור לדעת אם השמירה הצליחה). הבדיקות שכן שייכות כאן בודקות
את **חוזה הרשת** בין הלקוח לשרת ואת **היעדר הרגרסיה** בזרימה הנצפית —
מיפוי קריטריוני קבלה (`product-spec.md`) → בדיקה ב-`tests/e2e/teacher-misread-log.spec.ts`:

- "רשומה נשמרת רק כשהתקבלה קריאה שכוללת תיקון... קריאה ראשונה, בלי תיקון —
  לא נשמרת" →
  `the first send (no correction yet) carries no correction or question-identifying fields`
- "המשוב... נשלח בחזרה למורה יחד עם אותו דף" + "כל רשומה חייבת לכלול... הקריאה
  שקדמה לתיקון... מזהה השאלה/הנושא" →
  `a correction round sends the previous reading and a question identifier alongside the correction text`
- "הזרימה שהתלמיד/ה חווה נשארת בדיוק כמו היום" →
  `the correction flow itself is unchanged: correcting an uncertain reading still shows the confident result that comes back`
  (בדיקת עשן — הכיסוי המלא של זרימת התיקון עצמה כבר קיים ב-
  `tests/e2e/notebook-teacher-feedback.spec.ts`, לא משוכפל כאן)

### לא מכוסה בכוונה
- **כתיבה אמיתית ל-Firestore** — לא ניתן לבדוק ב-e2e מול שרת ממוקק; זו התנהגות
  שרת שנבדקת ידנית על ידי המשתמש אחרי הצעד החד-פעמי (ראו `architecture.md`).
- **שם השדות המדויק בתשובת/רשומת Firestore עצמה** — הבדיקות בודקות את מה
  שהלקוח שולח (ניתן לצפייה), לא את מבנה המסמך הפנימי בענן.

## How to run
`npm run test:e2e`

## Status
`357/357` עוברות בריצה בודדת ונקייה (`npm run test:e2e`, 2026-09-07) — כולל
3 הבדיקות החדשות של הפיצ'ר הזה, בנוסף לכל הסוויט הקיימת ללא רגרסיה. `npm run
build` ו-`npm run lint` ירוקים.
