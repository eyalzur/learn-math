# שרת המחברת — שלב א׳: קבלת מטריצה והפיכתה לתמונה

הפיצ'ר הראשון עם רכיב שרת אמיתי (גוגל קלאוד): מקבל את נתוני דף המחברת ומחזיר תמונה.
אין קריאה ל-Claude בשלב הזה — זו הוכחת תשתית לפני שמוסיפים LLM.

## Progress
- [x] Product spec — product-manager — 2026-08-29
- [x] Design — designer — 2026-08-29
- [x] Architecture — tech-lead — 2026-08-29
- [x] Implementation — developer — 2026-08-29
- [x] Tests — qa — 2026-08-29

**Current phase:** done — מוזג ל-`main` (287/287 בדיקות עברו)
**Branch:** `feature/notebook-server-relay`
**PR:** https://github.com/eyalzur/learn-math/pull/55 — מוזג 2026-08-29

## הפריסה בפועל
השרת נפרס לגוגל קלאוד באותו יום וחי ב-
`https://notebook-server-864901299725.me-west1.run.app` (פרויקט `learn-math-506923`,
region `me-west1`). הכתובת מחוברת ל-build של האתר דרך
`.github/workflows/deploy.yml`, ולכן המיזוג הזה מביא לאתר החי כפתור "שלח למורה"
שעובד מקצה לקצה — ולא כפתור שנכשל. פרטי הפריסה והמכשולים החד-פעמיים:
[`server/README.md`](../../../server/README.md).

## Open questions / blockers
None.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
