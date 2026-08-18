# קושי מסתגל — תרגילים מטמפלייט

תרגילים נבנים מטמפלייט עם מספרים שנבחרים ב-runtime לפי קושי, במקום שלוש רמות קבועות
— כדי שהקושי יגיב להצלחת התלמיד/ה בזמן אמת, כמו מורה אמיתית, במקום שלוש חבילות שנקבעו
פעם אחת בכתיבה.

## Progress
- [x] Product spec — product-manager — 2026-08-18
- [x] Design — designer — 2026-08-18
- [ ] Architecture — tech-lead — not started
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** tech-lead
**Branch:** `feature/adaptive-difficulty`
**PR:** not opened yet

## Open questions / blockers
- **Tech-lead:** איך בדיוק "קושי שהולך ונהיה קשה" מתורגם למספרים בפועל; מה קורה
  להיסטוריה הקיימת שמבוססת על `topic` + `level` קבועים (עיצוב הכריע: רשומת ההיסטוריה
  של הנושא הזה מציגה רק שם נושא, בלי סיומת רמה — הצורה המדויקת שנשמרת ב-`progress.ts`
  היא עדיין החלטת tech-lead).

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
