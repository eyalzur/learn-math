# תיקוני שימושיות במחברת התרגול

חמישה תיקונים למסך המחברת: אישור לפני מחיקת דף, זום פתיחה קבוע (70%), ביטול
המעבר האוטומטי לשאלה הבאה, פונט תרגיל קטן יותר במסך מלא, וסימון ברור לתשובה
נכונה שהתהליך שלה כלל שגיאה.

## Progress
- [x] Product spec — product-manager — 2026-09-04
- [x] Design — designer — 2026-09-04
- [x] Architecture — tech-lead — 2026-09-04
- [x] Implementation — developer — 2026-09-04
- [ ] Tests — qa — not started

**Current phase:** qa
**Branch:** `fix/notebook-usability-fixes`
**PR:** not opened yet

## Open questions / blockers
None. שני תיקונים לניסוח לא מדויק ב-design.md נעשו בשלב הארכיטקטורה בלי לחזור
ל-designer, כי הם לא שינוי בכוונת המוצר — ראו architecture.md, תיקונים 2 ו-4:
זום פתיחה נשאר "נשמר בין שאלות" כמו היום (רק ה-fit הראשוני קבוע), ופונט מסך
מלא יורד ל-18px, לא עולה ל-40px.

בנוסף: `npm run build && npm run lint` נקיים, גרסה עלתה ל-`1.27.1`. QA צריך
למחוק את `tests/e2e/countdown-next.spec.ts` (הפיצ'ר שהוא בודק הוסר) — ראו
architecture.md, Implementation Notes.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
