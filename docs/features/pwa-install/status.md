# התקנת האפליקציה כ-PWA באייפון ובאנדרואיד

אפשר להתקין את האפליקציה על מסך הבית באייפון ואנדרואיד, עם איקון ושם משלה,
ופתיחה בלי סרגל-הכתובת של הדפדפן.

## Progress
- [x] Product spec — product-manager — 2026-10-27 (שאלת-היקף היחידה שהייתה באמת
  חוסמת (offline מלא, או רק איקון+התקנה) נשאלה ישירות מהמשתמש ונענתה: רק
  איקון+התקנה, בלי service worker/offline. `public/favicon.svg` הקיים מיועד
  לשימוש כבסיס לאיקוני ה-PWA, לא איקון חדש מאפס. פערי-פלטפורמה ידועים של iOS
  (אין הצעת-התקנה אוטומטית, רק "הוספה למסך הבית" מתפריט השיתוף) מתועדים כעובדה
  בקריטריוני הקבלה, לא כפספוס.)
- [ ] Design — designer — not started
- [ ] Architecture — tech-lead — not started
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** designer
**Branch:** `feature/pwa-install`
**PR:** not opened yet

## Open questions / blockers
None.

## Docs
- [Product spec](./product-spec.md)
