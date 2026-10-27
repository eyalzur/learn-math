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
- [x] Architecture — tech-lead — 2026-10-27 (קבצים סטטיים בלבד — `public/manifest.json`,
  חמישה PNG ב-`public/icons/`, שורות `<link>`/`<meta>` נוספות ב-`index.html`.
  אין build-step חדש, אין נגיעה ב-`vite.config.ts`/`src/`. הכרעה טכנית חשובה:
  נתיבי `index.html` נכתבים יחסיים-לשורש (Vite מתרגם אוטומטית ל-`/learn-math/`
  בבנייה, בדיוק כמו ה-favicon הקיים), אבל נתיבי `manifest.json` עצמו (`start_url`/
  `scope`/`icons[].src`) חייבים לכלול `/learn-math/` ביד — Vite לא מעבד JSON.
  `apple-mobile-web-app-title` נפרד מ-`<title>` כדי שאייפון יציג "חשבון" ולא
  "לומדים חשבון" חתוך. `status-bar-style: "default"` נבחר כדי לא לדרוש עבודת
  safe-area שלא קיימת היום. אין `sharp` בפרויקט, יש `convert` (ImageMagick) —
  developer צריך לבדוק בפועל אם זה מניב איכות מספקת מ-`favicon.svg`, ואם לא
  לעבור לגרסה מפושטת שdesign.md כבר אישר מראש.)
- [x] Implementation — developer — 2026-10-27 (מומש כמתוכנן; `rsvg-convert` לא
  היה מותקן בפועל, נעשה שימוש ב-Chromium headless לרינדור, נאמנות גבוהה יותר.
  האיקונים **נבדקו ויזואלית בפועל** (לא רק נבנו): שכבות-הטשטוש של
  `favicon.svg` לא נמעכות בגדלים הקטנים — לא נדרשה הגרסה המפושטת שdesign.md
  אישר כגיבוי. תיקון לא-מתוכנן: כלל `*.png` גורף ב-`.gitignore` חסם בשוגג את
  האיקונים, נוסף חריג מפורש. אומת בפועל מול שרת שמדמה את תת-הנתיב של GitHub
  Pages: כל הקבצים (`manifest.json`, 5 PNG, `index.html`) מגיבים `200`,
  דפדפן headless קרא את ה-manifest בהצלחה. `build`/`lint` נקיים. גרסה
  `1.42.0 → 1.43.0`. ראו architecture.md, "Implementation Notes".)
- [ ] Tests — qa — not started

**Current phase:** qa
**Branch:** `feature/pwa-install`
**PR:** not opened yet

## Open questions / blockers
None.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
