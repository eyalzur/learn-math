# רצועת האחוזים מתחלקת לפי האחוז שבשאלה, וההסבר אומר למה

הרצועה מתחלקת למספר החלקים שהאחוז בשאלה שקול לו (`10%`→`10`, `25%`→`4`, `50%`→`2`
וכו׳), וההסבר אומר במפורש את שקילות השבר ומנמק אותה — לא רק "מחלקים ב-X".

## Progress
- [x] Product spec — product-manager — 2026-08-19
- [x] Design — designer — 2026-08-19
- [x] Architecture — tech-lead — 2026-08-19
- [x] Implementation — developer — 2026-08-19
- [x] Tests — qa — 2026-08-19

**Current phase:** done — ממתין ל-PR ולריוויו
**Branch:** `fix/percent-tenths-teaching`
**PR:** not opened yet

## Open questions / blockers
None. ההיקף אושר במפורש על ידי המשתמש: כללי — לכל אחוז, לא רק `10%`. הערה לא חוסמת
ל-designer/tech-lead: אחוזים עם שבר מצומצם ממכנה גדול (למשל `15%`=`3/20`) עלולים
לדרוש הרבה חלקים ברצועה — איך להתמודד עם זה נשאר הכרעת עיצוב/ארכיטקטורה.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
