# מחברת כמצב התרגול היחיד

התלמיד/ה כותב/ת את כל הפתרון (כולל התשובה) רק במחברת; המורה קוראת, משקפת מה
הבינה, מצביעה על טעות בדרך אם יש, והתוצאה הסופית עוברת לבדיקה המקומית הקיימת.

## Progress
- [x] Product spec — product-manager — 2026-08-31
- [x] Design — designer — 2026-08-31
- [ ] Architecture — tech-lead — not started
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** tech-lead
**Branch:** `feature/notebook-default-practice`
**PR:** not opened yet

## Open questions / blockers
None שחוסם. שלוש ההכרעות שהמשתמש סימן כלא-ידועות (מיקה, קריאה לא-ודאית, נתיב
גיבוי בלי שרת) הוכרעו ב-product-spec.md עם נימוק לכל אחת. תוצאת ההכרעה
המשמעותית ביותר: **אין נתיב גיבוי בלי שרת** — קבלת משוב על תשובה תלויה בהצלחת
קריאת המורה, כי אין עוד שדה טקסט חלופי. זו תוצאה מודעת ומפורשת של הבקשה, לא
פרצה בכלל "הילד לא ממתין לשרת" (שממשיך לחול על התוכן שכבר זמין תמיד: שיטה,
רמזים, דימוי).

- **Design → Tech-lead:** מסך התרגול ומסך המחברת (`Practice.tsx`,
  `PracticeNotebook.tsx`) מתמזגים למסך אחד — ראו design.md. כשעוברים לשאלה
  הבאה, האם נפתח דף חדש וריק אוטומטית בכל שאלה, או שממשיכים על אותה ערימת
  דפים? לא משנה AC, אבל קובע התנהגות נראית — כדאי הכרעה מפורשת בארכיטקטורה.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
