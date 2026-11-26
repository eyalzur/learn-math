# מנוי הורים

מנוי חודשי לבית: 2 הורים + 3 ילדים, אפליקציית הורים (מעקב, התראות, לוח זמנים), מסד נתונים ותשלום.

## Progress
- [x] Product spec — product-manager — 2026-11-26
- [x] Design — designer — 2026-11-26
- [x] Architecture — tech-lead — 2026-11-26
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** כל החלטות המוצר התקבלו (2026-11-26); מוכן לפירוק טכני ב-`/tech-lead` (מסמכים בלבד, בלי קוד)
**Branch:** `feature/parent-subscription`
**PR:** not opened yet

## Decisions (2026-11-26)
מחיר (שבוע חינם ← 10 ₪ חודש ראשון ← 30 ₪), בלי מכסה שבועית (הקוד מוסר), התחברות גוגל+קישור במייל, ספק תשלום נדחה, משתמשים מאפס רק בדאטאבייס (שלושת הילדים של היום נמחקים), חיבור ילד בקוד במקום בחירת תלמיד, מנוי שפג = הילד לא מתרגל, **השאלות עוברות לשרת** (תרגול דורש חיבור), נתוני ילדים מינימליים + מדיניות פרטיות + מחיקה מלאה. פירוט: product-spec.md. הארכיטקטורה נכתבה מחדש בהתאם (5 שלבים במקום 4).

## Open questions / blockers
- אין שאלות מוצר פתוחות (כולן נענו ב-2026-11-26). שתי שאלות טכניות ל-`/tech-lead`: מה נשאר בדפדפן, ומי מאמת תשובות.
- נוסח פרטיות ודרישות משפטיות: המשתמש מתקדם איתו כשמתחילים שלב 1 בפועל.
- **שלב 1 לא חסום על Firebase:** כותבים מול Emulator; חשבון נדרש רק כדי לנסות חי.
- לפני קוד: `/tech-lead` מפרק שלבים 1–2, ו-`/feature` נפרד לשרת השאלות (שלב 2).

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Privacy data inventory](./privacy-data-inventory.md)
- [Tests](./tests.md)
