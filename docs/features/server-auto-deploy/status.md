# פריסה אוטומטית של השרת

השרת (`server/`) ייפרס לגוגל קלאוד אוטומטית כשקוד שלו מגיע ל-`main`, כמו שהאתר
כבר נפרס אוטומטית ל-GitHub Pages — במקום פקודת `gcloud` ידנית בכל פעם.

## Progress
- [x] Product spec — product-manager — 2026-08-29
- [x] Design — designer — 2026-08-29
- [x] Architecture — tech-lead — 2026-08-29
- [x] Implementation — developer — 2026-08-29
- [x] Tests — qa — 2026-08-29

**Current phase:** done — מוזג ל-`main` (299/299 בדיקות עברו)
**Branch:** `feature/server-auto-deploy`
**PR:** https://github.com/eyalzur/learn-math/pull/56 — מוזג 2026-08-29

## ההגדרה בגוגל קלאוד כבר בוצעה
המשתמש ביצע את ההגדרה החד-פעמית (`server/README.md`, סעיף "פריסה אוטומטית —
הגדרה חד-פעמית") **לפני** המיזוג הזה: חשבון השירות `github-deployer`, חמשת
ה-roles, ה-workload identity pool וה-provider, והקישור לריפו `eyalzur/learn-math`.
הפלט אומת — אפס שגיאות. כלומר הפריסה האוטומטית **פעילה מיד** עם המיזוג הזה, לא
ממתינה לצעד נוסף. הבדיקה האמיתית הראשונה: Actions → Deploy server to Cloud Run
→ Run workflow.

## Open questions / blockers
None.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
