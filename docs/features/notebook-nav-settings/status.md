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
- [x] Implementation — developer — 2026-10-09 (`PAN_SPEED_LEVELS` +
  `panSpeedFor()` ב-`notebook.ts`, `panSpeedLevel`/`setPanSpeedLevel`
  ב-`preferences.ts`, הבורר השלישי ב-`TopicPicker.tsx`, props חדשים דרך
  `App.tsx` → `Practice.tsx` → `PracticeNotebook.tsx` שמחליפים את
  `PAN_STEP_PX`/`PAN_HOLD_INTERVAL_MS` הקשיחים; `PAN_HOLD_DELAY_MS` נשאר
  קבוע. `npm run build && npm run lint` עברו, גרסה עלתה ל-1.35.0)
- [x] Tests — qa — 2026-10-09 (תשע בדיקות חדשות ב-
  `tests/e2e/notebook-nav-settings.spec.ts`; `415/415` בריצה מלאה ונקייה
  — `406` הקיימות + `9` חדשות, `0` כשלים. ראו tests.md להערה תפעולית על
  ריצה מזוהמת שנפסלה ונרצה מחדש)

**Current phase:** done — ממתין לריוויו ולמיזוג
**Branch:** `feature/notebook-nav-settings`
**PR:** not opened yet

## Open questions / blockers
None.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
