# שרת המחברת — שלב א׳: קבלת מטריצה והפיכתה לתמונה

הפיצ'ר הראשון עם רכיב שרת אמיתי (גוגל קלאוד): מקבל את נתוני דף המחברת ומחזיר תמונה.
אין קריאה ל-Claude בשלב הזה — זו הוכחת תשתית לפני שמוסיפים LLM.

## Progress
- [x] Product spec — product-manager — 2026-08-29
- [x] Design — designer — 2026-08-29
- [x] Architecture — tech-lead — 2026-08-29
- [x] Implementation — developer — 2026-08-29
- [x] Tests — qa — 2026-08-29

**Current phase:** done — סבב הרוויזיה הושלם, ממתין ל-PR (287/287)
**Branch:** `fix/notebook-teacher-wording` (הסבב הנוכחי)
**PR:** https://github.com/eyalzur/learn-math/pull/55 — מוזג 2026-08-29 · סבב
הרוויזיה: טרם נפתח

## סבב רוויזיה — 2026-08-29 (ניסוח)
הפיצ'ר עצמו מוזג ונמצא באתר החי. אחרי שהמשתמש בדק אותו בפועל, הוא הכריע לשנות
את כותרת חלון התמונה מ-"זה מה שהשרת קיבל" לניסוח שילד/ה מבינ/ה. שינוי מחרוזת
אחת, ללא שינוי התנהגות. ההנמקה והקריטריון הכללי שנגזר ממנה: `product-spec.md`,
סעיף "רוויזיה".

- [x] Product spec — product-manager — 2026-08-29
- [x] Design — designer — 2026-08-29
- [x] Architecture — tech-lead — 2026-08-29
- [x] Implementation — developer — 2026-08-29
- [x] Tests — qa — 2026-08-29

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
