# שיעור לעומת תרגול — מסך לימוד לכל נושא

כל כרטיס נושא מקבל כפתור-אייקון נוסף לצידו — "שיעור" — שפותח מסך לימוד חדש; הכרטיס
עצמו ממשיך להיכנס לתרגול בדיוק כמו היום. בשלב ראשון השיעור מציג תוכן קיים; מערכי
שיעור ייעודיים יתווספו בהמשך.

## Progress
- [x] Product spec — product-manager — 2026-08-20
- [x] Design — designer — 2026-08-20
- [x] Architecture — tech-lead — 2026-08-20
- [x] Implementation — developer — 2026-08-20
- [ ] Tests — qa — not started

**Current phase:** qa
**Branch:** `feature/topic-lesson`
**PR:** not opened yet

## Open questions / blockers
None. הבלוק "איך פותרים?" הקיים ב-Practice.tsx (method + 11 הדיאגרמות + שלבים +
דימוי) יצא לרכיב משותף `QuestionExplanation` + פונקציה טהורה `buildExplanation` —
Practice ומסך השיעור החדש (`TopicLesson`) קוראים לאותו קוד בדיוק, בלי שכפול. **תוכנן
מסך ביניים חובה ("שיעור"/"תרגול") ונמצא בזמן הפיתוח ששובר כ-20 קבצי בדיקה קיימים —
הוחלף בכפתור-אייקון משני על כרטיס הנושא, אפס נגיעה בזרימת התרגול הקיימת.** פירוט
מלא, כולל התיקון, ב-architecture.md § Risks/Tradeoffs ו-§ Implementation Notes.
`236/236` בדיקות e2e עוברות בריצה אחת ונקייה, `build`/`lint` נקיים, גרסה `1.19.0`.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
