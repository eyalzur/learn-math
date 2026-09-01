# סילבוס מלא לכיתה ב׳

מוסיפים לכיתה ב׳ של מיקה שני נושאים חדשים (כפל וחילוק — מבוא, וצורות וגופים) ומרחיבים
את חיבור/חיסור מטווח 100 לטווח 1000, בעקבות מחקר בתוכנית הלימודים הרשמית של משרד
החינוך.

## Progress
- [x] Product spec — product-manager — 2026-09-01
- [x] Design — designer — 2026-09-01
- [x] Architecture — tech-lead — 2026-09-01
- [x] Implementation — developer — 2026-09-01
- [ ] Tests — qa — not started

**Current phase:** qa
**Branch:** `feature/grade2-syllabus`
**PR:** not opened yet

## Open questions / blockers
None. שתי ההחלטות שהיו חוסמות (אילו נושאים להוסיף, הרחבת טווח ל-1000) הוכרעו במפורש
על ידי המשתמש (2026-09-01) לפני כתיבת ה-product-spec. הקוד כתוב ומאומת:
`npm run build && npm run lint && npm run test:e2e` כולם ירוקים, `312/312` (עלה מ-
`305/305`), ריצה בודדת ונקייה. פרטי המימוש המלאים ב-`architecture.md`, "Implementation
Notes" — כולל תיקון מחרוזות בשלוש בדיקות e2e קיימות שהתייחסו לכותרות/מספר הנושאים
הישנים של כיתה ב׳, ותיקון באג אמיתי בשלב הסבר אחד (מעבר מאה בחיבור) שנתפס באימות ידני
לפני קומיט.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
