# שאלה לפני כיבוי הקראה אוטומטית

כשתלמיד/ה עוצר/ת הקראה אוטומטית באמצע, האפליקציה שואלת פעם אחת (עם "לא לשאול
יותר" שתקף יומיים) אם לכבות הקראה אוטומטית מכאן ואילך.

## Progress
- [x] Product spec — product-manager — 2026-11-25
- [x] Design — designer — 2026-11-25
- [x] Architecture — tech-lead — 2026-11-25
- [x] Implementation — developer — 2026-11-25
- [x] Tests — qa — 2026-11-25

**Current phase:** done
**Branch:** `feature/ask-before-disabling-autoread`
**PR:** not opened yet

## Open questions / blockers
None. `408/410` בדיקות e2e עוברות, ריצה בודדת ונקייה (`--workers=1`) — ה-`2`
הנותרות `test.skip()` קיים-מראש לא-קשור (`adaptive-pace-setting.spec.ts`). ראו
tests.md.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
