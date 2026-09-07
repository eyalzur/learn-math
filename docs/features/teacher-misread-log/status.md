# יומן מקרים שבהם המורה טעתה

השרת שומר כל מקרה שבו תלמיד/ה תיקן קריאה של המורה — הדף, הקריאה הקודמת,
התיקון, והקריאה שחזרה אחריו — כדי לבנות עם הזמן בנק בדיקות אמיתי.

## Progress
- [x] Product spec — product-manager — 2026-09-07
- [x] Design — designer — 2026-09-07
- [ ] Architecture — tech-lead — not started
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** tech-lead
**Branch:** `feature/teacher-misread-log`
**PR:** not opened yet

## Open questions / blockers
None. הכרעות מוצר ננעלו: נשמר רק סבב שכולל תיקון בפועל (לא כל קריאה); אין
תקרת שמירה/מחיקה אוטומטית בהיקף הזה; אין מסך באפליקציה — גישה ישירה דרך
Google Cloud Console. זה הופך במפורש סעיף Out of Scope קודם של
`notebook-teacher-feedback` (`PR #68`) — מתועד ומוסבר ב-product-spec.md.

**Design (2026-09-07):** אין UI בכוונה — מתועד במפורש כ-design.md קצר שמאשר
שהזרימה הקיימת לא משתנה ושום מסך לא נדרש/נוסף.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
