# קושי מסתגל — תרגילים מטמפלייט

תרגילים נבנים מטמפלייט עם מספרים שנבחרים ב-runtime לפי קושי, במקום שלוש רמות קבועות
— כדי שהקושי יגיב להצלחת התלמיד/ה בזמן אמת, כמו מורה אמיתית, במקום שלוש חבילות שנקבעו
פעם אחת בכתיבה.

## Progress
- [x] Product spec — product-manager — 2026-08-18
- [ ] Design — designer — not started
- [ ] Architecture — tech-lead — not started
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** designer
**Branch:** `feature/adaptive-difficulty`
**PR:** not opened yet

## Open questions / blockers
- **Tech-lead:** איך בדיוק "קושי שהולך ונהיה קשה" מתורגם למספרים בפועל; מה קורה
  להיסטוריה הקיימת שמבוססת על `topic` + `level` קבועים.
- **Designer:** איך נראה מסך התרגול בלי שלוש רמות גלויות לבחירה, כשהיקף הפיילוט הוא
  נושא אחד (`חיבור עד 100`) בלבד — האם שאר הנושאים ממשיכים להראות שלוש רמות כרגיל?

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
