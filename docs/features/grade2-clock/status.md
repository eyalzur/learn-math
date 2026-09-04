# שעון וזמן — כיתה ב׳

נושא אדפטיבי חדש לכיתה ב׳: קריאת שעון אנלוגי עד דיוק חצי שעה, ושאלות משך זמן פשוטות.

## Progress
- [x] Product spec — product-manager — 2026-09-04
- [x] Design — designer — 2026-09-04
- [x] Architecture — tech-lead — 2026-09-04
- [x] Implementation — developer — 2026-09-04
- [x] Tests — qa — 2026-09-04

**Current phase:** done — מוזג ל-`main`
**Branch:** `feature/grade2-clock`
**PR:** [#66](https://github.com/eyalzur/learn-math/pull/66) — מוזג 2026-09-04

## Open questions / blockers
None. הנושא ו"אדפטיבי" הוכרעו במפורש על ידי המשתמש (2026-09-04). הארכיטקטורה פתרה
את שתי השאלות הטכניות המרכזיות: (1) איפה הציור מתרנדר - הוסף ליד תיבת השאלה
ב-`Practice.tsx` (גם במצב fullscreen) וב-`TopicLesson.tsx`, לא רק בתוך
`QuestionExplanation`; (2) איך השעה מיוצגת בלי שדה חדש על `Question` - מקודדת
ב-`id` ומפוענחת/מאומתת משם, כי `prompt` חייב להישאר נקי ממספרים (אחרת זו לא באמת
שאלת קריאת-שעון). ראו architecture.md, "Edge Cases" לגבי הדרישה ש-`clockFace()`
לעולם לא יחזיר `null` על שאלה בנושא הזה - נבדק בפועל (`content.spec.ts`, 200 דגימות
× 3 דרגות) ואף פעם לא מחזיר `null`.

מומש במלואו: 30 שאלות כתובות, גנרטור אדפטיבי, רכיב `ClockFace`, שילוב ב-3 מקומות
רינדור (Practice רגיל/fullscreen, TopicLesson), ו-8 בדיקות e2e ייעודיות. 335/335
בדיקות עוברות. ראו architecture.md "Implementation Notes" לבאג תוכן אמיתי (ספרה
`6` לא מסומנת) שנתפס ותוקן בדרך.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
