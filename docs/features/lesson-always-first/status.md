# השיעור הוא הכניסה הדיפולטיבית לנושא

בחירת נושא נכנסת קודם לשיעור הקיים (לא ישר לתרגול), עם דרך-דילוג מיידית וברורה
לתרגול מכל עמוד. כפתור ה-📖 הנפרד מוסר.

## Progress
- [x] Product spec — product-manager — 2026-11-21
- [x] Design — designer — 2026-11-21
- [x] Architecture — tech-lead — 2026-11-21
- [ ] Implementation — developer — component changes built and demoed,
      App.tsx wiring not yet done (see below)
- [ ] Tests — qa — not started

**Current phase:** ממתין לאישור-מוק לפני חיווט ב-`App.tsx`
**Branch:** `feature/lesson-always-first`
**PR:** not opened yet

**מוק לאישור:** https://claude.ai/artifact/K9Bdi3rpUqxNCyBjStLA1h — `TopicLesson.tsx`
ו-`TopicPicker.tsx` כבר שונו בפועל (לא placeholder), מודגמים כאן עם נתונים
אמיתיים (כיתה ו׳) מחוץ ל-`App.tsx`. אחרי אישור: שינוי-חיווט אחד ב-`App.tsx`
(`onSelect={enterLesson}` במקום `enterTopic` בשני מקומות) + build/lint/e2e
מלאים + טסטים חדשים — ראו architecture.md's "תהליך-אישור".

## Open questions / blockers
None.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
