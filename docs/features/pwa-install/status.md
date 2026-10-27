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
- [x] Design — designer — 2026-10-27 (צבע-זהות `#aa3bff` — ה-`--accent` הקיים
  ב-`index.css`, לא צבע חדש ולא צבעי-האיור הפנימיים של `favicon.svg`. `short_name`
  "חשבון" בנוסף ל-`name` "לומדים חשבון", כדי לא להיחתך במסכים צפופים. גדלי-
  איקון מדויקים: 192/512 רגיל, 192/512 maskable עם safe-zone, 180 ל-apple-touch-
  icon. סומן במפורש ל-developer: לבדוק ויזואלית אם `favicon.svg`'s שכבות-הטשטוש
  נשמרות בגדלים הקטנים/maskable, ואם לא — לפשט לצורה המרכזית החדה בלבד, לא
  להמציא איור חדש. grep אישר: אין תלות בכרום-דפדפן (`history.back`, פתיחת-חלון)
  בקוד הקיים — מצב standalone לא שובר שום דבר.)
- [ ] Architecture — tech-lead — not started
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** tech-lead
**Branch:** `feature/pwa-install`
**PR:** not opened yet

## Open questions / blockers
None.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
