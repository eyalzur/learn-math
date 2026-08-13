# הקראה בקול של ההסבר

כפתור רמקול בבלוק ההסבר שמקריא את השלבים והדימוי בעברית, בקול שנבחר ומכוונן
אוטומטית להישמע טבעי וחם ולא מכני.

## Progress
- [x] Product spec — product-manager — 2026-08-13 (revision: שיפור טבעיות הקול)
- [x] Design — designer — 2026-08-13 (revision: אין שינוי מסך, רק אישור שהשיפור בקול לא דורש UI)
- [x] Architecture — tech-lead — 2026-08-13 (revision: לוגיקת בחירת קול + rate/pitch מפורשים ב-speech.ts, ללא שינוי בממשק הפומבי)
- [x] Implementation — developer — 2026-08-13 (revision: hebrewVoice() משודרגת + rate/pitch מפורשים ב-speech.ts; build ו-lint נקיים)
- [ ] Tests — qa — not started

**Current phase:** qa
**Branch:** `fix/read-aloud`
**PR:** not opened yet

## Open questions / blockers
None. (הקראת השאלה עצמה, ולא רק ההסבר, סומנה מפורשות כמחוץ ל-scope והיא מועמדת
טבעית להמשך. בחירת קול/מהירות ידנית בידי המשתמש/ת נשארת מחוץ ל-scope גם בסבב הזה.)

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
