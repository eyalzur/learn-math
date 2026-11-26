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
מחיר (שבוע חינם ← 10 ₪ חודש ראשון ← 30 ₪), בלי מכסה שבועית חינמית, התחברות גוגל+קישור במייל, ספק תשלום נדחה לשלב 4, נתוני ילדים = התקדמות+כינוי בלבד עם מדיניות פרטיות ומחיקה מלאה. פירוט: product-spec.md.

## Open questions / blockers
- 4 שאלות ב-product-spec.md ("Open Questions (נשארו)"): מה הילד רואה כשהמנוי פג (ומה עושים עם המכסה הקיימת), העלאת נתונים קיימים, חיבור ילד בקוד, בדיקה משפטית של נוסח הפרטיות.
- **שלב 1 לא חסום על Firebase:** כותבים מול Emulator. חשבון נדרש רק כדי לנסות חי — ראו "הגדרת Firebase" ב-architecture.md.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
