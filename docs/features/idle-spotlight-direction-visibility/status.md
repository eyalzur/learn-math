# זרקור-מנוחה — סדר לפי מיקום-מסך, ובולטות גבוהה יותר

רוויזיה לזרקור-המנוחה הקיים: סדר-מעבר לפי מיקום-על-המסך (מלמעלה למטה, מימין
לשמאל) במקום סדר-DOM, ועוצמת-הדגשה בולטת יותר.

## Progress
- [x] Product spec — product-manager — 2026-11-21
- [x] Design — designer — 2026-11-21
- [x] Architecture — tech-lead — 2026-11-21
- [x] Implementation — developer — 2026-11-21
- [x] Tests — qa — 2026-11-21, 362/363 (known flake only, --workers=1)

**Current phase:** done — מוזג ל-`main`
**Branch:** `fix/idle-spotlight-direction-visibility`
**PR:** https://github.com/eyalzur/learn-math/pull/108 — מוזג 2026-11-22

אומת ויזואלית (claude-in-chrome): סדר-מעבר נכון (שורה-עליונה לפני תחתונה,
ימין-לפני-שמאל בתוך שורה — נבדק דרך `--spot-i` בפועל על מסך 2×2), ועוצמת-זוהר
13px/38px מאומתת ב-computed style החי. אין שגיאות קונסול.

## Open questions / blockers
None.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
