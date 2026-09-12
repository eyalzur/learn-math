# זום זמני בהחזקת מגע — כתיבה רציפה במחברת

מגע שנשאר במקום לרגע קצר בתחילת הכתיבה מרחיב זמנית את התצוגה, וחוזר בדיוק
למה שהיה כשמרימים את האצבע — כדי לצמצם את המעברים בין כלי עט/הזזה/גלילה.

## Progress
- [x] Product spec — product-manager — 2026-09-12
- [x] Design — designer — 2026-09-12
- [x] Architecture — tech-lead — 2026-09-12
- [x] Implementation — developer — 2026-09-12
- [x] Tests — qa — 2026-09-12

**Current phase:** done, ready for PR
**Branch:** `feature/notebook-hold-to-zoom`
**PR:** [#70](https://github.com/eyalzur/learn-math/pull/70)

## Open questions / blockers
None שחוסם. שני דברים לא-חוסמים לתשומת לב, ראו `tests.md`:
- **QA:** ההתנהגות מול זום-שתי-אצבעות (pinch) תוך כדי hold-zoom לא אוטומטית
  (דורש שני מגעים בו-זמנית — כמו כל הפיצ'ר הקיים של pinch, שגם לו אין
  בדיקת e2e) — צריך אימות ידני חד-פעמי לפני מיזוג, ראו "מה לא נבדק" ב-tests.md.
- **QA:** בריצת הסוויטה המלאה נכשלת בדיקה אחת — `grade8-angles-congruence.spec.ts`
  "the triangle-angle-sum step..." — אומתה כ-flake קיים-מראש, לא קשור לפיצ'ר
  הזה (נכשלת גם על `origin/main` נקי, ללא השינוי הזה).

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
