# פריסה אוטומטית של השרת

השרת (`server/`) ייפרס לגוגל קלאוד אוטומטית כשקוד שלו מגיע ל-`main`, כמו שהאתר
כבר נפרס אוטומטית ל-GitHub Pages — במקום פקודת `gcloud` ידנית בכל פעם.

## Progress
- [x] Product spec — product-manager — 2026-08-29 (סבב תיקון 2026-08-31: חשבון שירות מפין במפורש)
- [x] Design — designer — 2026-08-31 (אין שינוי עיצובי — תיקון תשתית טהור)
- [x] Architecture — tech-lead — 2026-08-31 (--service-account מפורש + לוגינג שגיאות)
- [x] Implementation — developer — 2026-08-31
- [x] Tests — qa — 2026-08-31 (307/307, ריצה בודדת ונקייה)

**Current phase:** done — מוזג ל-`main`
**Branch:** `fix/server-auto-deploy`
**PR:** [#61](https://github.com/eyalzur/learn-math/pull/61) — מוזג 2026-08-31 (סבב התיקון; הפיצ'ר המקורי כבר מוזג — https://github.com/eyalzur/learn-math/pull/56)

## ההגדרה בגוגל קלאוד כבר בוצעה
המשתמש ביצע את ההגדרה החד-פעמית (`server/README.md`, סעיף "פריסה אוטומטית —
הגדרה חד-פעמית") **לפני** המיזוג הזה: חשבון השירות `github-deployer`, חמשת
ה-roles, ה-workload identity pool וה-provider, והקישור לריפו `eyalzur/learn-math`.
הפלט אומת — אפס שגיאות. כלומר הפריסה האוטומטית **פעילה מיד** עם המיזוג הזה, לא
ממתינה לצעד נוסף. הבדיקה האמיתית הראשונה: Actions → Deploy server to Cloud Run
→ Run workflow.

## Open questions / blockers
None. **הערה (2026-08-31):** באג אמיתי שהמשתמש גילה בבדיקה ידנית — הפריסה
האוטומטית איפסה בשקט את חשבון השירות של `notebook-server` לברירת המחדל,
ומנעה קריאה אמיתית ל-Claude ב-`/read-page` (docs/features/notebook-teacher-understanding/)
עד שהמשתמש תיקן ידנית. ראו הרוויזיה ב-product-spec.md. **המצב החי כבר תוקן
ועובד** (המשתמש דיווח ש"שלח למורה" עובד מול Claude אמיתי) — ה-PR הזה מגן על
הדיפלוי הבא, לא על המצב הנוכחי.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
