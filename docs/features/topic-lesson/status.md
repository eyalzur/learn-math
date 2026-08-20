# שיעור לעומת תרגול — מסך לימוד לכל נושא

כל נושא מתפצל למצב "שיעור" (לומדים, בלי שאלות) ומצב "תרגול" (המצב הקיים היום). בשלב
ראשון השיעור מציג תוכן קיים; מערכי שיעור ייעודיים יתווספו בהמשך.

## Progress
- [x] Product spec — product-manager — 2026-08-20
- [x] Design — designer — 2026-08-20
- [x] Architecture — tech-lead — 2026-08-20
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** developer
**Branch:** `feature/topic-lesson`
**PR:** not opened yet

## Open questions / blockers
None. הבלוק "איך פותרים?" הקיים ב-Practice.tsx (method + 11 הדיאגרמות + שלבים +
דימוי) יוצא לרכיב משותף `QuestionExplanation` + פונקציה טהורה `buildExplanation` —
כך ש-Practice ומסך השיעור החדש (Lesson) קוראים לאותו קוד בדיוק, בלי שכפול. שני
מסכים חדשים ב-Screen union: `mode` (בחירת שיעור/תרגול) ו-`lesson`. `insideTopic()`
(יציאה מתרגול) לא משתנה. פירוט מלא ב-architecture.md.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
