# הגדרת מהירות כפתורי הניווט במחברת

בורר מהירות חדש בדיאלוג ⚙️ הקיים — קובע כמה רחוק/מהר כפתורי הכיוון
(PR #78) מזיזים את התצוגה, גם בהקשה וגם בהחזקה.

## Progress
- [x] Product spec — product-manager — 2026-10-09
- [x] Design — designer — 2026-10-09 (בלוק שלישי בדיאלוג ⚙️ הקיים, תחת בורר
  עוצמת זום-ההחזקה — אותה אנטומיה בדיוק: אייקון 🧭+כותרת+תת-כותרת מעל שורת
  שישה כפתורים, "כבוי" ראשון ואז חמש דרגות עולות. ראו design.md)
- [x] Architecture — tech-lead — 2026-10-09 (טבלת `PAN_SPEED_LEVELS` חדשה
  ב-`notebook.ts` עם `stepPx`+`holdIntervalMs` לכל דרגה, `panSpeedFor()`
  lookup; `App.tsx` מתרגם level→שני מספרים ומעביר כ-props דרך `Practice`
  ל-`PracticeNotebook`, בדיוק כמו ש-`holdZoomFactor` כבר עובד היום. ראו
  architecture.md)
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** developer
**Branch:** `feature/notebook-nav-settings`
**PR:** not opened yet

## Open questions / blockers
None.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
