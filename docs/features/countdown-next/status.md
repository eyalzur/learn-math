# ספירה לאחור למעבר לשאלה הבאה

תשובה נכונה מתחילה ספירה של חמש שניות ואז פותחת את השאלה הבאה מעצמה.

## Progress
- [x] Product spec — product-manager — 2026-08-15
- [x] Design — designer — 2026-08-15
- [ ] Architecture — tech-lead — not started
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** tech-lead
**Branch:** `feature/countdown-next` — **יושב על `feature/style-lessons`**, לא על `main`
**PR:** not opened yet

## Open questions / blockers
None.

**חמש הכרעות:**
1. **רק אחרי הצלחה.** מסך הטעות נושא הסבר, ציור ושיחה — ספירה שם דוחפת ילד/ה מהמסך
   שקיים כדי ללמד אותם.
2. **לא על השאלה האחרונה.** סיום תרגול הוא רגע שמגיעים אליו בבחירה.
3. **עצירה בהקשה אחת על הספירה עצמה, ובלי שתחזור.** מי שעצר אמר "עוד רגע".
4. **ההקראה קודמת** — חמש שניות מתחילות כשיש חמש שניות של שקט.
5. **אותה התנהגות לשלושתם**, בלי מתג. הימור שניתן להפריך: אם זה ידחק במיקה, מתג
   לכל תלמיד/ה הוא התיקון.

**תלות:** הבראנץ' מסתעף מ-`feature/style-lessons` כי שניהם עורכים את `Practice.tsx`,
ושם שונה שם ה-prop מ-`level` ל-`lesson`. מיזוג של זה לפני זה ייצור התנגשות.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
