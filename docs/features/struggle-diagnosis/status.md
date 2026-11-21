# אבחון קשיים לאורך זמן

מסך "ההתקדמות שלי" מזהה נושא עם שלושה תרגולים רצופים מתחת ל-70%, ומציע
קישור ישיר לתרגול נוסף בו.

## Progress
- [x] Product spec — product-manager — 2026-11-18
- [x] Design — designer — 2026-11-18
- [x] Architecture — tech-lead — 2026-11-18
- [x] Implementation — developer — 2026-11-18
- [x] Tests — qa — 2026-11-18

**Current phase:** done — מוזג ל-`main`
**Branch:** `feature/struggle-diagnosis`
**PR:** https://github.com/eyalzur/learn-math/pull/92 — מוזג 2026-11-21

**מיזוג `main` פנימה (2026-11-21):** קונפליקטים אמיתיים ב-`History.tsx`
(main הוסיף `StatsSection`/`statsByTopic`/`statsByDifficulty` במקביל) —
אוחדו בלי אובדן, שני הבלוקים (כרטיסי-תקוע + סיכומי-סטטיסטיקה) מופיעים יחד.
`tests/e2e/struggle-diagnosis.spec.ts` נכתב מחדש: הנחת סטודנטים-קבועים
(מיקה/רותם/עומר) כבר לא תקפה (`manage-students` הריק את הרשימה-הראשונית) —
עכשיו יוצר תלמיד/ה אמיתי/ת דרך ה-UI וקורא בחזרה את ה-`id` האמיתי
(`crypto.randomUUID()`) מ-`learn-math:users` כדי לזרוע היסטוריה תואמת.
`7/7` בבדיקת הפיצ'ר עצמה. גרסה `1.50.1` → `1.51.0`. ריצת הסוויטה המלאה
(`--workers=1`): `350/351` — הכשל היחיד הוא הפלייק הידוע
`grade8-angles-congruence.spec.ts`, לא קשור.

## Open questions / blockers
None.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
