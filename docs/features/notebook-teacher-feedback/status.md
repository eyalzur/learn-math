# משוב לתלמיד/ה על מה שהמורה קראה

דרך לתלמיד/ה לומר למורה בטקסט חופשי שהיא טעתה בקריאת הדף (או לא הצליחה לקרוא),
ולתת לה תיקון — היא קוראת שוב ומחזירה קריאה מעודכנת, שמוזנת לאותה בדיקה מקומית.

## Progress
- [x] Product spec — product-manager — 2026-09-05
- [x] Design — designer — 2026-09-05
- [ ] Architecture — tech-lead — not started
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** tech-lead
**Branch:** `feature/notebook-teacher-feedback`
**PR:** not opened yet

## Open questions / blockers
None. שתי הכרעות מוצריות שהתבקשו מהמשתמש (2026-09-04) כבר הוכרעו ומשוקפות בספק:
טקסט חופשי לשלושת הילדים (כולל מיקה, בלי קלט קולי בהיקף הזה), ומשוב זמין הן
כשהמורה אומרת "לא בטוחה" והן כשהיא בטוחה אך טועה בפועל.

**Design (2026-09-05):** קישור תיקון נוסף בשני המקומות (מצב C הקיים — לצד
הדרך הקיימת לכתוב מחדש; מצב D הקיים — שם הוא הדרך היחידה, כי הדף כבר נעול שם).
תיקון נכון/שגוי אחרי תיקון מעדכן את **כל** מה שתלוי בקריאה (ציון, הסבר, ספירה),
לא רק את הטקסט — סומן ל-tech-lead כנקודה שדורשת תשומת לב בזרימת המצב הקיימת
(`handleTeacherReading`/`correctCount`/`onAnswered`), לא רק תצוגה.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
