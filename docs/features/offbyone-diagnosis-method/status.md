# אבחון "סטייה של אחד" — מתחבר לשיטה

תיקון לדפוס האבחון `offByOne`: שאלת ההמשך שלו מנותקת מהשאלה המקורית ("כמה זה
`89 − 1`?" בלי שום `89`/`1` בשאלה עצמה). מתוקן ע"י ביטול שאלת הביניים לגמרי —
המסך מדלג ישר לקופסת "איך פותרים?" הקיימת, שכבר בנויה מכלל כללי ואז יישום על
המספרים האמיתיים של השאלה. מתפצל לשני דפוסים (המשכיות מול חיבור/חיסור שלמים).

## Progress
- [x] Product spec — product-manager — 2026-08-18
- [x] Design — designer — 2026-08-18
- [ ] Architecture — tech-lead — not started
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** tech-lead
**Branch:** `fix/offbyone-diagnosis-method`
**PR:** not opened yet

## Open questions / blockers
None. שלוש ההכרעות החוסמות (עיגון בשאלה המקורית, פיצול לשני דפוסים, ביטול שאלת
הביניים) הוכרעו עם המשתמש לפני כתיבת product-spec.md/design.md.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
