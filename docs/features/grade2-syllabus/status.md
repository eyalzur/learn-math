# סילבוס מלא לכיתה ב׳

מוסיפים לכיתה ב׳ של מיקה שני נושאים חדשים (כפל וחילוק — מבוא, וצורות וגופים) ומרחיבים
את חיבור/חיסור מטווח 100 לטווח 1000, בעקבות מחקר בתוכנית הלימודים הרשמית של משרד
החינוך.

## Progress
- [x] Product spec — product-manager — 2026-09-01 (תוקן שוב 2026-09-01)
- [x] Design — designer — 2026-09-01 (בתיקון)
- [ ] Architecture — tech-lead — בתיקון
- [ ] Implementation — developer — יעודכן בהתאם
- [ ] Tests — qa — יעודכן בהתאם

**Current phase:** designer
**Branch:** `feature/grade2-syllabus`
**PR:** [#64](https://github.com/eyalzur/learn-math/pull/64) — פתוח, לא מוזג

## Open questions / blockers
**תיקון בתהליך (2026-09-01):** המשתמש תיקן אחרי שה-PR כבר נפתח - "כפל וחילוק" ו"צורות
וגופים" נבנו בטעות עם שלוש רמות קושי קבועות, בעוד שכבר הוחלט מראש (לפני שהפיצ'ר הזה
נכתב) ששני הנושאים האלה אמורים להיות **אדפטיביים**, בדיוק כמו "חיבור עד 1000"/"חיסור
עד 1000" - קושי שמשתנה בזמן אמת, בלי מסך רמות. product-spec.md כבר עודכן; design.md,
architecture.md, הקוד, והבדיקות צריכים לעבור את אותו תיקון ולהידחף כקומיטים נוספים
לאותו PR - לא PR חדש.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
