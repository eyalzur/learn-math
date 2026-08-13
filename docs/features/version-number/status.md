# מספר גרסה במסך הראשון

מספר גרסה `major.middle.minor` מוצג במסך בחירת התלמיד/ה ועולה אוטומטית בכל
פיצ'ר (middle) ובכל תיקון (minor).

## Progress
- [x] Product spec — product-manager — 2026-08-13 (fix: הבדיקה יכולה להיעדר בשקט)
- [x] Design — designer — 2026-08-13 (fix: אין שטח עיצובי - התיקון לא נוגע במסך)
- [x] Architecture — tech-lead — 2026-08-13 (fix: dispatch עם מספר PR, types מורחב, checkout ל-HEAD מפורש)
- [x] Implementation — developer — 2026-08-13 (fix: workflow + סקריפט; אין שינוי ב-src ולכן ללא העלאת גרסה)
- [x] Tests — qa — 2026-08-13 (fix: אין שטח ל-e2e; אומת ידנית, ומגבלת ההפעלה הידנית תועדה)

**Current phase:** done
**Branch:** `fix/version-number`
**PR:** https://github.com/eyalzur/learn-math/pull/13

### היסטוריית סבבים
- סבב 1 — מספר הגרסה ואכיפת ההעלאה — PR #10, גרסה 1.0.0
- סבב 2 — תיקון: הבדיקה יכולה להיעדר בלי שאיש ישים לב — PR #13, ללא שינוי גרסה

## Open questions / blockers
None.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
