# הקראה בקול של ההסבר

כפתור רמקול בבלוק ההסבר שמקריא את השלבים והדימוי בעברית, בקול שנבחר ומכוונן
אוטומטית להישמע טבעי וחם, בקצב נינוח ועם הפסקה בין שלב לשלב.

## Progress
- [x] Product spec — product-manager — 2026-08-13 (revision 2: קצב איטי יותר והפסקות בגבולות)
- [x] Design — designer — 2026-08-13 (revision 2: אין UI חדש, אבל הוכרע שהכפתור נשאר ⏹ לאורך ההפסקות ושהמעבר לדימוי מקבל הפסקה ארוכה יותר)
- [x] Architecture — tech-lead — 2026-08-13 (revision 2: שרשור יחידות עם השהיה, ניקוי טיימר + מזהה רצף; תיקון לנימוק שגוי בארכיטקטורה הקודמת)
- [x] Implementation — developer — 2026-08-13 (revision 2: שרשור יחידות ב-speech.ts, rate 0.82, גרסה 1.1.0; build ו-lint נקיים)
- [ ] Tests — qa — not started

**Current phase:** qa
**Branch:** `feature/read-aloud`
**PR:** not opened yet

### היסטוריית סבבים
- סבב 1 — ההקראה עצמה — PR #6
- סבב 2 — שיפור טבעיות הקול (בחירת קול, rate/pitch) — PR #8
- סבב 3 — קצב איטי יותר והפסקות בגבולות — בעבודה

## Open questions / blockers
None. (הקראת השאלה עצמה, ולא רק ההסבר, סומנה מפורשות כמחוץ ל-scope והיא מועמדת
טבעית להמשך. בחירת קול/מהירות ידנית בידי המשתמש/ת נשארת מחוץ ל-scope גם בסבב הזה.)

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
