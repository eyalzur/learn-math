# מנוי הורים

מנוי חודשי לבית: 2 הורים + 3 ילדים, אפליקציית הורים (מעקב, התראות, לוח זמנים), מסד נתונים ותשלום.

## Progress
- [x] Product spec — product-manager — 2026-11-26
- [x] Design — designer — 2026-11-26
- [x] Architecture — tech-lead — 2026-11-26
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** החלטות התקבלו ב-2026-11-26 ונרשמו במסמכים; נשארו 4 שאלות פתוחות (מסמכים בלבד, בלי קוד)
**Branch:** `feature/parent-subscription`
**PR:** not opened yet

## Decisions (2026-11-26)
מחיר (שבוע חינם ← 10 ₪ חודש ראשון ← 30 ₪), בלי מכסה שבועית (הקוד מוסר), התחברות גוגל+קישור במייל, ספק תשלום נדחה, משתמשים מאפס רק בדאטאבייס (שלושת הילדים של היום נמחקים), חיבור ילד בקוד במקום בחירת תלמיד, מנוי שפג = הילד לא מתרגל, **השאלות עוברות לשרת** (תרגול דורש חיבור), נתוני ילדים מינימליים + מדיניות פרטיות + מחיקה מלאה. פירוט: product-spec.md. הארכיטקטורה נכתבה מחדש בהתאם (5 שלבים במקום 4).

## Open questions / blockers
- 4 שאלות ב-product-spec.md: האם הילד/ההורה רואים התקדמות כשהמנוי פג, מה נשאר בדפדפן (הסברים וציורים), מי מאמת תשובות, ונוסח הפרטיות (המשתמש מביא).
- **שלב 1 לא חסום על Firebase:** כותבים מול Emulator. ראו "הגדרת Firebase" ב-architecture.md.
- **לפני קוד:** צריך `/feature` נפרד לשרת השאלות (שלב 2), והחלטה טכנית איך חולקים את הטמפלייטים בין לקוח לשרת (`tech-lead`).

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Privacy data inventory](./privacy-data-inventory.md)
- [Tests](./tests.md)
