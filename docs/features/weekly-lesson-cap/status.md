# מכסת שיעורים שבועית

מספר השיעורים בשבוע חסום; שיעורים נוספים "נרכשים" כרגע בחינם (10 בשבוע), מוכן לחבילות ותשלום בעתיד.

## Progress
- [x] Product spec — product-manager — 2026-11-25
- [x] Design — designer — 2026-11-25
- [x] Architecture — tech-lead — 2026-11-25
- [x] Implementation — developer — 2026-11-25
- [x] Tests — qa — 2026-11-25

**Current phase:** done — מוזג ל-`main`
**Branch:** `feature/weekly-lesson-cap`
**PR:** https://github.com/eyalzur/learn-math/pull/129 — מוזג 2026-11-26

## Open questions / blockers
- **Product:** (פתוח, החלטת הורה) האם 5 שיעורים חינם בשבוע נכון? (קבוע יחיד, קל לשינוי)

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)

בדיקות (סבב ב׳, `--workers=1`, 1.63.0): build + lint נקיים; `425/426` e2e (2 skipped) — הכשל היחיד `screen-entrance-animation` (תזמון אנימציה, תחת עומס של ריצות מקבילות של סוכנים אחרים) עבר בהרצה בודדת.

**סבב ב׳ (2026-11-26):** משוב המשתמש — הרכישה חלה על כל התלמידים, לא על אחד. עבר למאגר אחד
משותף (החינם נשאר פר תלמיד/ה); ראו "עדכון" ב-product spec. גרסה 1.63.0.
