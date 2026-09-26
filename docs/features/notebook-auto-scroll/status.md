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
- [x] Product spec — product-manager — 2026-09-26 — **חסום**, ראו Open questions
- [ ] Design — designer — ממתין לתשובת המשתמש
- [ ] Architecture — tech-lead — not started
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** product-manager — blocked, see Open questions below
**Branch:** `feature/notebook-auto-scroll`
**PR:** [#75](https://github.com/eyalzur/learn-math/pull/75) — עודכן, ממתין לתשובת
המשתמש לפני שהסבב הבא ממשיך

## Open questions / blockers
- **Product (סבב ב׳):** "כמובן זה צריך לעבוד לכל כיוון" — רק אופקית (ימין/שמאל,
  כמו ה-scope הקיים), או גם אנכית (מעבר שורה למעלה/למטה)? ראו product-spec.md,
  Open Questions, לפירוט המלא. נשאל המשתמש ישירות.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
