# גלילה אוטומטית במחברת לפי כיוון הכתיבה

האזור הגלוי במסך המחברת עוקב אוטומטית אחרי מקום הכתיבה, עם הגדרת עוצמה/כיבוי לכל
תלמיד/ה. **סבב ב׳ (בעיצומו):** המנגנון הוחלף ממעקב רציף תוך כדי כתיבה לקפיצה
בדידה בין תווים — ראו product-spec.md, "עדכון סבב ב׳".

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
- [ ] Architecture — tech-lead — not started
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** tech-lead
**Branch:** `feature/notebook-auto-scroll`
**PR:** [#75](https://github.com/eyalzur/learn-math/pull/75) — עודכן, סבב ב׳ בעיצומו

## Open questions / blockers
None.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
