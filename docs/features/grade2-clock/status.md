# שעון וזמן — כיתה ב׳

נושא אדפטיבי חדש לכיתה ב׳: קריאת שעון אנלוגי עד דיוק חצי שעה, ושאלות משך זמן פשוטות.

## Progress
- [x] Product spec — product-manager — 2026-09-04
- [x] Design — designer — 2026-09-04
- [x] Architecture — tech-lead — 2026-09-04
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** developer
**Branch:** `feature/grade2-clock`
**PR:** not opened yet

## Open questions / blockers
None. הנושא ו"אדפטיבי" הוכרעו במפורש על ידי המשתמש (2026-09-04). הארכיטקטורה פתרה
את שתי השאלות הטכניות המרכזיות: (1) איפה הציור מתרנדר - הוסף ליד תיבת השאלה
ב-`Practice.tsx` (גם במצב fullscreen) וב-`TopicLesson.tsx`, לא רק בתוך
`QuestionExplanation`; (2) איך השעה מיוצגת בלי שדה חדש על `Question` - מקודדת
ב-`id` ומפוענחת/מאומתת משם, כי `prompt` חייב להישאר נקי ממספרים (אחרת זו לא באמת
שאלת קריאת-שעון). ראו architecture.md, "Edge Cases" לגבי הדרישה ש-`clockFace()`
לעולם לא יחזיר `null` על שאלה בנושא הזה.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
