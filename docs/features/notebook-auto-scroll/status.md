# גלילה אוטומטית במחברת לפי כיוון הכתיבה

אחרי שמסיימים לכתוב תו רחוק מהקודם, האזור הגלוי במסך המחברת קופץ פעם אחת כדי
לפנות מקום להמשך, עם בורר עוצמה/כיבוי per-student. **סבב ב׳ הושלם:** המנגנון
הוחלף ממעקב רציף תוך כדי כתיבה (סבב א׳) לקפיצה בדידה בין תווים — ראו
product-spec.md, "עדכון סבב ב׳".

## Progress — סבב א׳ (2026-09-26): מעקב רציף — בוטל בסבב ב׳
- [x] Product spec — product-manager — 2026-09-26
- [x] Design — designer — 2026-09-26
- [x] Architecture — tech-lead — 2026-09-26
- [x] Implementation — developer — 2026-09-26
- [x] Tests — qa — 2026-09-26 (398/398, ריצה בודדת ונקייה)

## Progress — סבב ב׳ (2026-09-26): קפיצה בדידה בין תווים, בורר עוצמה
- [x] Product spec — product-manager — 2026-09-26 (השאלה הפתוחה הוכרעה: "לכל
  כיוון" כולל גם אנכי)
- [x] Design — designer — 2026-09-26 (מסמך נכתב מחדש במלואו; מתג בינארי הופך
  לבורר שש אפשרויות כמו זום-ההחזקה, ברירת מחדל "בינוני" כי אין עדיין ערך שאומת
  בשטח)
- [x] Architecture — tech-lead — 2026-09-26 (bounding-box של כל קו, השוואה
  ב-endPointer, קפיצה חד-פעמית דרך animateTransformTo הקיים; לקח מפורש מסבב
  א׳: שמות מחלקה נפרדים לשני בוררים באותו דיאלוג, לא שיתוף)
- [x] Implementation — developer — 2026-09-26 (מנגנון סבב א׳ הוסר לגמרי,
  bounding-box + קפיצה בדידה + בורר שש-דרגות ממומשים; build/lint ירוקים,
  אומת ידנית בדפדפן כולל "כבוי" ותצוגה דו-ממדית; גרסה לא הועלתה שוב — כבר
  1.33.0 מסבב א׳ על אותו PR)
- [x] Tests — qa — 2026-09-26 (12 בדיקות סבב א׳ הוחלפו ב-14 בדיקות סבב ב׳;
  400/400 בסוויטה המלאה, ריצה בודדת ונקייה; אין תיקוני-לוואי הפעם)

**Current phase:** done — ממתין לריוויו ולמיזוג
**Branch:** `feature/notebook-auto-scroll`
**PR:** [#75](https://github.com/eyalzur/learn-math/pull/75) — עודכן, ממתין לריוויו

## Open questions / blockers
None.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
