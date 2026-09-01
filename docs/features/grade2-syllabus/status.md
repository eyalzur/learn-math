# סילבוס מלא לכיתה ב׳

מוסיפים לכיתה ב׳ של מיקה שני נושאים חדשים (כפל וחילוק — מבוא, וצורות וגופים) ומרחיבים
את חיבור/חיסור מטווח 100 לטווח 1000, בעקבות מחקר בתוכנית הלימודים הרשמית של משרד
החינוך.

## Progress
- [x] Product spec — product-manager — 2026-09-01
- [x] Design — designer — 2026-09-01
- [x] Architecture — tech-lead — 2026-09-01
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** developer
**Branch:** `feature/grade2-syllabus`
**PR:** not opened yet

## Open questions / blockers
None. שתי ההחלטות שהיו חוסמות (אילו נושאים להוסיף, הרחבת טווח ל-1000) הוכרעו במפורש
על ידי המשתמש (2026-09-01) לפני כתיבת ה-product-spec. העיצוב קבע גם את שינוי הכותרות
("עד 1000") ואת שמות שני הנושאים החדשים ("כפל וחילוק", "צורות וגופים"). הארכיטקטורה
מצאה ש-`add100`/`sub100` כבר אדפטיביים בפועל (הרחבה דרך הגנרטור, לא רשימת שאלות), ושיש
בדיקת תוכן קיימת (`content.spec.ts`) שדורשת התאמה מדויקת בין `Question.topic` לכותרת
הנושא, ובדיוק 10 שאלות לרמה - שני הדברים חייבים תשומת לב מפורשת ב-developer.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
