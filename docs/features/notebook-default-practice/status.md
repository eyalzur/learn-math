# מחברת כמצב התרגול היחיד

התלמיד/ה כותב/ת את כל הפתרון (כולל התשובה) רק במחברת; המורה קוראת, משקפת מה
הבינה, מצביעה על טעות בדרך אם יש, והתוצאה הסופית עוברת לבדיקה המקומית הקיימת.

## Progress
- [x] Product spec — product-manager — 2026-08-31
- [x] Design — designer — 2026-08-31
- [x] Architecture — tech-lead — 2026-08-31
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** developer
**Branch:** `feature/notebook-default-practice`
**PR:** not opened yet

## Open questions / blockers
None שחוסם. שלוש ההכרעות שהמשתמש סימן כלא-ידועות (מיקה, קריאה לא-ודאית, נתיב
גיבוי בלי שרת) הוכרעו ב-product-spec.md עם נימוק לכל אחת. תוצאת ההכרעה
המשמעותית ביותר: **אין נתיב גיבוי בלי שרת** — קבלת משוב על תשובה תלויה בהצלחת
קריאת המורה, כי אין עוד שדה טקסט חלופי. זו תוצאה מודעת ומפורשת של הבקשה, לא
פרצה בכלל "הילד לא ממתין לשרת" (שממשיך לחול על התוכן שכבר זמין תמיד: שיטה,
רמזים, דימוי).

- **Design → Tech-lead (הוכרע):** דף חדש נפתח אוטומטית לכל שאלה (כמו לחיצה
  עצמית על "+ דף חדש"); דפים קודמים נשארים לדפדוף. ראו architecture.md,
  "דף חדש לכל שאלה" ו-Edge Cases (מה קורה ב-`MAX_PAGES`).
- **Tech-lead → Developer, לתשומת לב:** חוזה `/read-page` משתנה שינוי שובר
  (לא תוסף) — `PageReading`, הבקשה (`expectedPrompt` חדש), והתשובה
  (`processReflection`/`errorPointer`/`finalAnswer` במקום `question`/`answer`
  הישנים; `imageDataUrl` הוסר). ראו architecture.md, Data/State Changes
  ו-Risks לנימוק המלא.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
